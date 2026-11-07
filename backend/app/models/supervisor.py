from app.extensions import db
from app.models.mixins import TimestampMixin


class Supervisor(db.Model, TimestampMixin):
    __tablename__ = "supervisors"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False, index=True)
    designation = db.Column(db.String(150))

    user = db.relationship("User", back_populates="supervisor_profile", foreign_keys=[user_id])
    department = db.relationship("Department", back_populates="supervisors")
    student_links = db.relationship("StudentSupervisor", back_populates="supervisor")

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "department_id": self.department_id,
            "designation": self.designation,
        }


class StudentSupervisor(db.Model, TimestampMixin):
    """Join table: a student may have a main supervisor and co-supervisors."""
    __tablename__ = "student_supervisors"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey("supervisors.id"), nullable=False, index=True)
    is_primary = db.Column(db.Boolean, default=True, nullable=False)

    student = db.relationship("Student", back_populates="supervisor_links")
    supervisor = db.relationship("Supervisor", back_populates="student_links")

    __table_args__ = (
        db.UniqueConstraint("student_id", "supervisor_id", name="uq_student_supervisor"),
    )
