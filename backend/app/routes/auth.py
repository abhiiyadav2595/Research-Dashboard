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

DEMO_USERS_MAP = {
    "admin@university.edu": ("Admin@123", "admin", "System Administrator"),
    "coordinator@university.edu": ("Coord@123", "coordinator", "Dept. Coordinator"),
    "supervisor@university.edu": ("Super@123", "supervisor", "Dr. Demo Supervisor"),
    "student@university.edu": ("Student@123", "student", "Demo Student"),
}


@auth_bp.post("/login")
def login():
    try:
        data = login_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"error": "Validation failed", "details": err.messages}), 422

    email = (data.get("email") or "").strip().lower()
    raw_password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()

    # Self-healing: if demo account doesn't exist in cloud DB, initialize on the fly
    if not user and email in DEMO_USERS_MAP:
        try:
            from app.models.user import RoleEnum
            expected_pw, role_str, full_name = DEMO_USERS_MAP[email]
            role_enum = getattr(RoleEnum, role_str.upper(), RoleEnum.STUDENT)
            user = User(email=email, full_name=full_name, role=role_enum, is_active=True)
            user.set_password(expected_pw)
            db.session.add(user)
            db.session.commit()

            # If students are missing, seed the database with students and DBMS components
            from app.models.student import Student
            if Student.query.count() == 0:
                try:
                    import seed
                    seed.main()
                    user = User.query.filter_by(email=email).first()
                except Exception:
                    pass
        except Exception:
            db.session.rollback()
            user = User.query.filter_by(email=email).first()

    # Self-healing: if demo account exists but password verification fails with the demo password, resync
    if user and email in DEMO_USERS_MAP:
        expected_pw = DEMO_USERS_MAP[email][0]
        if raw_password == expected_pw and not user.check_password(raw_password):
            user.set_password(expected_pw)
            db.session.commit()

    if not user or not user.check_password(raw_password) or not user.is_active:
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


@auth_bp.get("/demo-status")
def demo_status():
    users = User.query.all()
    from app.models.student import Student
    return jsonify({
        "total_users": len(users),
        "total_students": Student.query.count(),
        "users": [{"id": u.id, "email": u.email, "role": u.role.value, "is_active": u.is_active} for u in users],
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
