from app.extensions import db, bcrypt
from app.models.mixins import TimestampMixin
import enum


class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    COORDINATOR = "coordinator"
    SUPERVISOR = "supervisor"
    STUDENT = "student"


class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(RoleEnum), nullable=False, default=RoleEnum.STUDENT, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Optional links to domain profiles (a user may BE a student or supervisor)
    student_profile = db.relationship(
        "Student", back_populates="user", uselist=False, foreign_keys="Student.user_id"
    )
    supervisor_profile = db.relationship(
        "Supervisor", back_populates="user", uselist=False, foreign_keys="Supervisor.user_id"
    )

    def set_password(self, raw_password: str) -> None:
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role.value,
            "is_active": self.is_active,
            "supervisor_id": self.supervisor_profile.id if self.supervisor_profile else None,
            "student_id": self.student_profile.id if self.student_profile else None,
        }
