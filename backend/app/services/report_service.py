"""
Report generation: CSV, Excel (openpyxl via pandas) and PDF (ReportLab).
Returns in-memory bytes buffers so routes can send_file without touching disk.
"""
import io
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm


def _students_dataframe(students):
    rows = [s.to_summary_dict() for s in students]
    return pd.DataFrame(rows)


def students_to_csv(students):
    df = _students_dataframe(students)
    buf = io.BytesIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return buf


def students_to_excel(students, sheet_name="Students"):
    df = _students_dataframe(students)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name=sheet_name)
        worksheet = writer.sheets[sheet_name]
        for i, col in enumerate(df.columns, start=1):
            max_len = max([len(str(col))] + [len(str(v)) for v in df[col].astype(str)])
            worksheet.column_dimensions[worksheet.cell(row=1, column=i).column_letter].width = min(max_len + 2, 40)
    buf.seek(0)
    return buf


def students_to_pdf(students, title="Student Progress Report"):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=1.5 * cm, rightMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [Paragraph(title, styles["Title"]), Spacer(1, 12)]

    headers = ["Code", "Name", "Program", "Department", "Sem", "Supervisor", "Progress", "Risk", "Status"]
    data = [headers]
    for s in students:
        d = s.to_summary_dict()
        data.append([
            d["student_code"], d["full_name"], d["program"], d["department"],
            d["current_semester"], d["supervisor"] or "-", f"{d['overall_progress']}%",
            d["risk_level"], d["enrollment_status"],
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)
    doc.build(elements)
    buf.seek(0)
    return buf


def at_risk_report_pdf(students):
    """Detailed PDF listing at-risk students with reasons."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5 * cm, rightMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [Paragraph("At-Risk Student Report", styles["Title"]), Spacer(1, 12)]

    for s in students:
        summary = s.to_summary_dict()
        if summary["risk_level"] == "LOW":
            continue
        latest_eval = s.evaluations[-1] if s.evaluations else None
        elements.append(Paragraph(
            f"<b>{summary['full_name']}</b> ({summary['student_code']}) — "
            f"Risk: {summary['risk_level']} — Progress: {summary['overall_progress']}%",
            styles["Heading3"],
        ))
        if latest_eval and latest_eval.risk_reasons:
            for reason in latest_eval.risk_reasons.split("\n"):
                elements.append(Paragraph(f"• {reason}", styles["Normal"]))
        elements.append(Spacer(1, 10))

    doc.build(elements)
    buf.seek(0)
    return buf
