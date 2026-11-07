from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from app.extensions import db
from app.models.system import Notification, AuditLog
from app.utils.decorators import any_authenticated, roles_required

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("")
@any_authenticated
def list_notifications():
    user_id = int(get_jwt_identity())
    notes = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notes])


@notifications_bp.post("/<int:note_id>/read")
@any_authenticated
def mark_read(note_id):
    note = Notification.query.get_or_404(note_id)
    if note.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403
    note.is_read = True
    db.session.commit()
    return jsonify(note.to_dict())


@notifications_bp.get("/audit-logs")
@roles_required("admin")
def audit_logs():
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(200).all()
    return jsonify([log.to_dict() for log in logs])
