from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from app.extensions import db
from app.models.publication import Publication, PublicationAuthor
from app.schemas.schemas import PublicationSchema
from app.utils.decorators import roles_required
from app.utils.pagination import paginate
from app.services.audit_service import log_action
from app.services.progress_service import evaluate_student_progress
from app.models.student import Student

publications_bp = Blueprint("publications", __name__)
pub_schema = PublicationSchema()


@publications_bp.get("")
@roles_required("admin", "coordinator", "supervisor", "student")
def list_publications():
    student_id = request.args.get("student_id", type=int)
    query = Publication.query
    if student_id:
        query = query.filter_by(student_id=student_id)
    query = query.order_by(Publication.created_at.desc())
    return jsonify(paginate(query, lambda p: p.to_dict()))


@publications_bp.post("")
@roles_required("admin", "coordinator", "supervisor", "student")
def create_publication():
    try:
        data = pub_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    student = Student.query.get_or_404(data["student_id"])
    authors = data.pop("authors", [])
    pub = Publication(**data)
    db.session.add(pub)
    db.session.flush()
    for i, name in enumerate(authors or [student.full_name], start=1):
        db.session.add(PublicationAuthor(publication_id=pub.id, author_name=name, author_order=i))
    db.session.commit()

    evaluate_student_progress(student, persist=True)
    log_action("publication.create", entity_type="publication", entity_id=pub.id)
    return jsonify(pub.to_dict()), 201


@publications_bp.put("/<int:pub_id>")
@roles_required("admin", "coordinator", "supervisor", "student")
def update_publication(pub_id):
    pub = Publication.query.get_or_404(pub_id)
    try:
        data = pub_schema.load(request.get_json() or {}, partial=True)
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    authors = data.pop("authors", None)
    for key, value in data.items():
        setattr(pub, key, value)
    if authors is not None:
        PublicationAuthor.query.filter_by(publication_id=pub.id).delete()
        for i, name in enumerate(authors, start=1):
            db.session.add(PublicationAuthor(publication_id=pub.id, author_name=name, author_order=i))
    db.session.commit()

    evaluate_student_progress(pub.student, persist=True)
    log_action("publication.update", entity_type="publication", entity_id=pub.id)
    return jsonify(pub.to_dict())


@publications_bp.delete("/<int:pub_id>")
@roles_required("admin", "coordinator")
def delete_publication(pub_id):
    pub = Publication.query.get_or_404(pub_id)
    student = pub.student
    db.session.delete(pub)
    db.session.commit()
    evaluate_student_progress(student, persist=True)
    log_action("publication.delete", entity_type="publication", entity_id=pub_id)
    return jsonify({"message": "Deleted"})
