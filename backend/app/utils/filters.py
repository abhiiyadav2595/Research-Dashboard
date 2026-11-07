"""Shared query-filter logic so the dashboard, student directory and
reports all react to the same set of global filters consistently."""
from flask import request
from app.models.student import Student
from app.models.supervisor import StudentSupervisor


def apply_student_filters(query):
    program_id = request.args.get("program_id", type=int)
    department_id = request.args.get("department_id", type=int)
    semester = request.args.get("semester", type=int)
    batch_year = request.args.get("batch_year", type=int)
    supervisor_id = request.args.get("supervisor_id", type=int)
    status = request.args.get("status")
    min_progress = request.args.get("min_progress", type=float)
    max_progress = request.args.get("max_progress", type=float)
    search = request.args.get("search")

    if program_id:
        query = query.filter(Student.program_id == program_id)
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if semester:
        query = query.filter(Student.current_semester == semester)
    if batch_year:
        query = query.filter(Student.batch_year == batch_year)
    if status:
        query = query.filter(Student.enrollment_status == status)
    if min_progress is not None:
        query = query.filter(Student.cached_overall_progress >= min_progress)
    if max_progress is not None:
        query = query.filter(Student.cached_overall_progress <= max_progress)
    if supervisor_id:
        # Use a subquery (not a JOIN) so this can never collide with another
        # join on student_supervisors added elsewhere in the call chain
        # (e.g. the supervisor-role scoping in students.py list_students).
        subquery = StudentSupervisor.query.with_entities(StudentSupervisor.student_id).filter(
            StudentSupervisor.supervisor_id == supervisor_id
        )
        query = query.filter(Student.id.in_(subquery))
    if search:
        like = f"%{search}%"
        query = query.filter(
            db_or(Student.full_name.ilike(like), Student.student_code.ilike(like), Student.email.ilike(like))
        )
    return query.filter(Student.is_archived == False)  # noqa: E712


def db_or(*clauses):
    from sqlalchemy import or_
    return or_(*clauses)
