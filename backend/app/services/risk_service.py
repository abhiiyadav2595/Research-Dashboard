"""
Transparent, rule-based at-risk engine.

Deliberately avoids any inference about a student's personal or
psychological characteristics. Every flag is derived from objective,
explainable facts (progress numbers, dates, counts) and every flag
carries a human-readable reason string shown to the user.
"""
from datetime import date


EXPECTED_PROGRESS_PER_SEMESTER = 12.5  # 100% over 8 semesters, roughly linear


def evaluate_risk(student, scores):
    reasons = []
    risk_points = 0

    # Rule 1: overall progress below what's expected for the current semester
    expected_progress = min(student.current_semester * EXPECTED_PROGRESS_PER_SEMESTER, 100)
    if scores["overall"] < expected_progress - 15:
        risk_points += 2
        reasons.append(
            f"Overall progress ({scores['overall']:.1f}%) is well below the "
            f"expected level for semester {student.current_semester} (~{expected_progress:.0f}%)."
        )
    elif scores["overall"] < expected_progress - 5:
        risk_points += 1
        reasons.append(
            f"Overall progress ({scores['overall']:.1f}%) is somewhat below the "
            f"expected level for semester {student.current_semester} (~{expected_progress:.0f}%)."
        )

    # Rule 2: multiple overdue submissions
    overdue_count = sum(1 for s in student.submissions if s.is_overdue())
    if overdue_count >= 3:
        risk_points += 2
        reasons.append(f"{overdue_count} submissions are currently overdue.")
    elif overdue_count >= 1:
        risk_points += 1
        reasons.append(f"{overdue_count} submission(s) currently overdue.")

    # Rule 3: delayed research milestones
    rp = student.research_profile
    delayed_milestones = 0
    missing_required = 0
    if rp:
        today = date.today()
        for m in rp.milestones:
            if m.status != "completed" and m.due_date and m.due_date < today:
                delayed_milestones += 1
            if m.is_required and m.status == "pending" and not m.due_date:
                missing_required += 1
    if delayed_milestones >= 2:
        risk_points += 2
        reasons.append(f"{delayed_milestones} research milestones are past their due date.")
    elif delayed_milestones == 1:
        risk_points += 1
        reasons.append("1 research milestone is past its due date.")

    if missing_required >= 1:
        risk_points += 1
        reasons.append(f"{missing_required} required research milestone(s) have not been scheduled.")

    # Rule 4: excessive time in the program
    total_semesters = student.program.total_semesters if student.program else 8
    years_enrolled = (date.today() - student.admission_date).days / 365.25
    max_years = total_semesters / 2.0
    if years_enrolled > max_years + 1:
        risk_points += 2
        reasons.append(
            f"Enrolled for {years_enrolled:.1f} years, exceeding the expected "
            f"program duration of {max_years:.1f} years by more than a year."
        )
    elif years_enrolled > max_years:
        risk_points += 1
        reasons.append(
            f"Enrolled for {years_enrolled:.1f} years, slightly beyond the "
            f"expected program duration of {max_years:.1f} years."
        )

    # Map accumulated risk points to a level
    if risk_points >= 5:
        level = "HIGH"
    elif risk_points >= 2:
        level = "MEDIUM"
    else:
        level = "LOW"

    if not reasons:
        reasons.append("No risk indicators triggered; student is on track.")

    return level, reasons
