from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt
from app.models.student import Student
from app.utils.decorators import roles_required
from app.utils.filters import apply_student_filters
from app.utils.pagination import paginate
from app.services.progress_service import evaluate_student_progress

students_bp = Blueprint("students", __name__)


@students_bp.get("")
@roles_required("admin", "coordinator", "supervisor")
def list_students():
    query = apply_student_filters(Student.query).order_by(Student.full_name.asc())

    claims = get_jwt()
    if claims.get("role") == "supervisor":
        # A supervisor only ever sees their assigned students, enforced server-side.
        from app.models.supervisor import Supervisor, StudentSupervisor
        from flask_jwt_extended import get_jwt_identity
        supervisor = Supervisor.query.filter_by(user_id=int(get_jwt_identity())).first()
        if supervisor:
            query = query.filter(
                Student.id.in_(
                    StudentSupervisor.query.with_entities(StudentSupervisor.student_id)
                    .filter(StudentSupervisor.supervisor_id == supervisor.id)
                )
            )
        else:
            return jsonify({"items": [], "page": 1, "page_size": 20, "total": 0, "total_pages": 0})

    result = paginate(query, lambda s: s.to_summary_dict())
    return jsonify(result)


@students_bp.get("/<int:student_id>")
@roles_required("admin", "coordinator", "supervisor", "student")
def get_student(student_id):
    claims = get_jwt()
    student = Student.query.get_or_404(student_id)

    if claims.get("role") == "student":
        from flask_jwt_extended import get_jwt_identity
        if student.user_id != int(get_jwt_identity()):
            return jsonify({"error": "Forbidden"}), 403

    from app.models.semester import Semester
    semesters = Semester.query.filter_by(student_id=student.id).order_by(Semester.semester_number).all()

    data = student.to_detail_dict()
    data["semesters"] = [s.to_dict() for s in semesters]
    data["research_profile"] = student.research_profile.to_dict() if student.research_profile else None
    data["publications"] = [p.to_dict() for p in student.publications]
    data["submissions"] = [s.to_dict() for s in student.submissions]
    data["evaluations"] = [e.to_dict() for e in student.evaluations[-10:]]
    return jsonify(data)


@students_bp.post("/<int:student_id>/recompute-progress")
@roles_required("admin", "coordinator")
def recompute_progress(student_id):
    student = Student.query.get_or_404(student_id)
    evaluation = evaluate_student_progress(student, persist=True)
    return jsonify(evaluation.to_dict())
