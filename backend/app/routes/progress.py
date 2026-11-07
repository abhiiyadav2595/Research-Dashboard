from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from app.extensions import db
from app.models.progress import ProgressWeight
from app.schemas.schemas import ProgressWeightSchema
from app.utils.decorators import roles_required
from app.services.progress_service import recompute_all_students, get_active_weights
from app.services.audit_service import log_action

progress_bp = Blueprint("progress", __name__)
weight_schema = ProgressWeightSchema()


@progress_bp.get("/weights")
@roles_required("admin", "coordinator", "supervisor")
def get_weights():
    return jsonify(get_active_weights().to_dict())


@progress_bp.put("/weights")
@roles_required("admin")
def update_weights():
    try:
        data = weight_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    total = sum([
        data["academic_weight"], data["research_weight"], data["milestone_weight"],
        data["publication_weight"], data["submission_weight"],
    ])
    if abs(total - 100.0) > 0.01:
        return jsonify({"error": f"Weights must sum to 100 (got {total})"}), 422

    active = get_active_weights()
    active.is_active = False
    db.session.add(active)

    new_weights = ProgressWeight(**data, is_active=True)
    db.session.add(new_weights)
    db.session.commit()

    recompute_all_students()
    log_action("progress_weights.update", entity_type="progress_weights", entity_id=new_weights.id)
    return jsonify(new_weights.to_dict())


@progress_bp.post("/recompute-all")
@roles_required("admin", "coordinator")
def recompute_all():
    count = recompute_all_students()
    log_action("progress.recompute_all", details=f"{count} students")
    return jsonify({"message": f"Recomputed progress for {count} students"})
