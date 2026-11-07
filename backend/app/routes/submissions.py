from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from app.extensions import db
from app.models.submission import Submission, SubmissionReview
from app.models.student import Student
from app.schemas.schemas import SubmissionSchema
from app.utils.decorators import roles_required
from app.utils.pagination import paginate
from app.services.audit_service import log_action
from app.services.progress_service import evaluate_student_progress

submissions_bp = Blueprint("submissions", __name__)
sub_schema = SubmissionSchema()


@submissions_bp.get("")
@roles_required("admin", "coordinator", "supervisor", "student")
def list_submissions():
    student_id = request.args.get("student_id", type=int)
    only_overdue = request.args.get("overdue", type=str)
    query = Submission.query
    if student_id:
        query = query.filter_by(student_id=student_id)
    query = query.order_by(Submission.deadline.asc())
    if only_overdue == "true":
        items = [s for s in query.all() if s.is_overdue()]
        return jsonify({"items": [s.to_dict() for s in items], "total": len(items)})
    return jsonify(paginate(query, lambda s: s.to_dict()))


@submissions_bp.post("")
@roles_required("admin", "coordinator", "supervisor", "student")
def create_submission():
    try:
        data = sub_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    student = Student.query.get_or_404(data["student_id"])
    sub = Submission(**data)
    db.session.add(sub)
    db.session.commit()

    evaluate_student_progress(student, persist=True)
    log_action("submission.create", entity_type="submission", entity_id=sub.id)
    return jsonify(sub.to_dict()), 201


@submissions_bp.put("/<int:sub_id>")
@roles_required("admin", "coordinator", "supervisor")
def update_submission(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    try:
        data = sub_schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    for key, value in data.items():
        setattr(sub, key, value)
    db.session.commit()

    evaluate_student_progress(sub.student, persist=True)
    log_action("submission.update", entity_type="submission", entity_id=sub.id)
    return jsonify(sub.to_dict())


@submissions_bp.post("/<int:sub_id>/remarks")
@roles_required("admin", "coordinator", "supervisor")
def add_remark(sub_id):
    sub = Submission.query.get_or_404(sub_id)
    body = request.get_json() or {}
    remark_text = (body.get("remark") or "").strip()
    if not remark_text:
        return jsonify({"error": "remark is required"}), 422

    review = SubmissionReview(
        submission_id=sub.id,
        reviewer_id=sub.reviewer_id,
        remark=remark_text,
        decision=body.get("decision"),
    )
    db.session.add(review)
    db.session.commit()
    log_action("submission.remark", entity_type="submission", entity_id=sub.id)
    return jsonify(sub.to_dict()), 201
