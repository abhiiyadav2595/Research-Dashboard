from flask import Blueprint, jsonify
from sqlalchemy import func
from app.extensions import db
from app.models.student import Student, EnrollmentStatus
from app.models.program import Program, ProgramLevel
from app.models.publication import Publication, PublicationStatus
from app.models.submission import Submission, SubmissionStatus
from app.utils.decorators import roles_required
from app.utils.filters import apply_student_filters

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/summary")
@roles_required("admin", "coordinator", "supervisor")
def summary():
    query = apply_student_filters(Student.query)
    students = query.all()
    ids = [s.id for s in students]

    total = len(students)
    phd_count = sum(1 for s in students if s.program and s.program.level == ProgramLevel.PHD)
    masters_count = sum(1 for s in students if s.program and s.program.level == ProgramLevel.MASTERS)
    active_count = sum(1 for s in students if s.enrollment_status == EnrollmentStatus.ACTIVE)
    at_risk_count = sum(1 for s in students if s.cached_risk_level in ("MEDIUM", "HIGH"))
    avg_progress = round(sum(s.cached_overall_progress or 0 for s in students) / total, 1) if total else 0.0

    total_papers = (
        db.session.query(func.count(Publication.id))
        .filter(Publication.student_id.in_(ids)).scalar() if ids else 0
    )
    pending_submissions = (
        db.session.query(func.count(Submission.id))
        .filter(Submission.student_id.in_(ids), Submission.status.in_(
            [SubmissionStatus.PENDING, SubmissionStatus.UNDER_REVIEW]
        )).scalar() if ids else 0
    )

    return jsonify({
        "total_students": total,
        "phd_students": phd_count,
        "masters_students": masters_count,
        "active_students": active_count,
        "at_risk_students": at_risk_count,
        "average_progress": avg_progress,
        "total_papers": total_papers,
        "pending_submissions": pending_submissions,
    })


@dashboard_bp.get("/charts")
@roles_required("admin", "coordinator", "supervisor")
def charts():
    query = apply_student_filters(Student.query)
    students = query.all()
    ids = [s.id for s in students]

    by_program = {}
    by_semester = {}
    progress_buckets = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}

    for s in students:
        pname = s.program.name if s.program else "Unknown"
        by_program[pname] = by_program.get(pname, 0) + 1

        sem_key = f"Sem {s.current_semester}"
        by_semester[sem_key] = by_semester.get(sem_key, 0) + 1

        p = s.cached_overall_progress or 0
        if p <= 25:
            progress_buckets["0-25"] += 1
        elif p <= 50:
            progress_buckets["26-50"] += 1
        elif p <= 75:
            progress_buckets["51-75"] += 1
        else:
            progress_buckets["76-100"] += 1

        risk_counts[s.cached_risk_level or "LOW"] = risk_counts.get(s.cached_risk_level or "LOW", 0) + 1

    pub_status_counts = {}
    if ids:
        rows = (
            db.session.query(Publication.status, func.count(Publication.id))
            .filter(Publication.student_id.in_(ids))
            .group_by(Publication.status)
            .all()
        )
        pub_status_counts = {status.value: count for status, count in rows}

    # Department/supervisor research output = published + accepted papers per department
    dept_output = {}
    for s in students:
        dept = s.department.name if s.department else "Unknown"
        published = sum(1 for p in s.publications if p.status in (PublicationStatus.PUBLISHED, PublicationStatus.ACCEPTED))
        dept_output[dept] = dept_output.get(dept, 0) + published

    return jsonify({
        "students_by_program": [{"name": k, "value": v} for k, v in by_program.items()],
        "students_by_semester": sorted(
            [{"name": k, "value": v} for k, v in by_semester.items()],
            key=lambda x: int(x["name"].split(" ")[1]),
        ),
        "publication_status": [{"name": k, "value": v} for k, v in pub_status_counts.items()],
        "progress_distribution": [{"name": k, "value": v} for k, v in progress_buckets.items()],
        "risk_distribution": [{"name": k, "value": v} for k, v in risk_counts.items()],
        "department_research_output": [{"name": k, "value": v} for k, v in dept_output.items()],
    })
