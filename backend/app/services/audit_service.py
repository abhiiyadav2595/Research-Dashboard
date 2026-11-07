from flask_jwt_extended import get_jwt_identity
from app.extensions import db
from app.models.system import AuditLog


def log_action(action, entity_type=None, entity_id=None, details=None):
    """Record an audit log entry. Safe to call even outside a request
    context with no JWT (user_id will be None)."""
    try:
        user_id = get_jwt_identity()
    except RuntimeError:
        user_id = None
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )
    db.session.add(entry)
    db.session.commit()
    return entry
