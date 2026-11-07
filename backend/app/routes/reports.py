from flask import Blueprint, send_file
from app.models.student import Student
from app.utils.decorators import roles_required
from app.utils.filters import apply_student_filters
from app.services.report_service import students_to_csv, students_to_excel, students_to_pdf, at_risk_report_pdf
from app.services.audit_service import log_action

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/students.csv")
@roles_required("admin", "coordinator")
def students_csv():
    students = apply_student_filters(Student.query).all()
    buf = students_to_csv(students)
    log_action("report.export_csv", details=f"{len(students)} students")
    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name="students_report.csv")


@reports_bp.get("/students.xlsx")
@roles_required("admin", "coordinator")
def students_excel():
    students = apply_student_filters(Student.query).all()
    buf = students_to_excel(students)
    log_action("report.export_excel", details=f"{len(students)} students")
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True, download_name="students_report.xlsx",
    )


@reports_bp.get("/students.pdf")
@roles_required("admin", "coordinator")
def students_pdf():
    students = apply_student_filters(Student.query).all()
    buf = students_to_pdf(students)
    log_action("report.export_pdf", details=f"{len(students)} students")
    return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name="students_report.pdf")


@reports_bp.get("/at-risk.pdf")
@roles_required("admin", "coordinator")
def at_risk_pdf():
    students = apply_student_filters(Student.query).all()
    buf = at_risk_report_pdf(students)
    log_action("report.export_at_risk_pdf", details=f"{len(students)} students")
    return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name="at_risk_report.pdf")
