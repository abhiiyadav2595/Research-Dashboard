from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt,
)
from marshmallow import ValidationError
from app.extensions import db
from app.models.user import User
from app.schemas.schemas import LoginSchema
from app.services.audit_service import log_action

auth_bp = Blueprint("auth", __name__)
login_schema = LoginSchema()


@auth_bp.post("/login")
def login():
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    user = User.query.filter_by(email=data["email"].lower()).first()
    if not user or not user.check_password(data["password"]) or not user.is_active:
        return jsonify({"error": "Invalid email or password"}), 401

    # Role is embedded in the token as a claim, set only server-side.
    additional_claims = {"role": user.role.value, "full_name": user.full_name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    log_action("auth.login", entity_type="user", entity_id=user.id)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    })


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    additional_claims = {"role": claims.get("role"), "full_name": claims.get("full_name")}
    new_token = create_access_token(identity=identity, additional_claims=additional_claims)
    return jsonify({"access_token": new_token})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())
