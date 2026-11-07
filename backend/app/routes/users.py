from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User, RoleEnum
from app.utils.decorators import roles_required
from app.utils.pagination import paginate
from app.services.audit_service import log_action

users_bp = Blueprint("users", __name__)


@users_bp.get("")
@roles_required("admin")
def list_users():
    query = User.query.order_by(User.full_name.asc())
    return jsonify(paginate(query, lambda u: u.to_dict()))


@users_bp.post("")
@roles_required("admin")
def create_user():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    full_name = (body.get("full_name") or "").strip()
    role = body.get("role")
    password = body.get("password")

    if not email or not full_name or not password:
        return jsonify({"error": "email, full_name and password are required"}), 422
    if role not in [r.value for r in RoleEnum]:
        return jsonify({"error": "invalid role"}), 422
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "A user with this email already exists"}), 409

    user = User(email=email, full_name=full_name, role=RoleEnum(role))
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    log_action("user.create", entity_type="user", entity_id=user.id)
    return jsonify(user.to_dict()), 201


@users_bp.put("/<int:user_id>/status")
@roles_required("admin")
def toggle_status(user_id):
    user = User.query.get_or_404(user_id)
    body = request.get_json() or {}
    user.is_active = bool(body.get("is_active", user.is_active))
    db.session.commit()
    log_action("user.status_update", entity_type="user", entity_id=user.id, details=str(user.is_active))
    return jsonify(user.to_dict())
