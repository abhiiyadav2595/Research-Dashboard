from app.extensions import db
from app.models.mixins import TimestampMixin, SoftDeleteMixin
import enum


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    SUSPENDED = "suspended"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


class Student(db.Model, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    student_code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=True)

    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)

    program_id = db.Column(db.Integer, db.ForeignKey("programs.id"), nullable=False, index=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=False, index=True)

    batch_year = db.Column(db.Integer, nullable=False, index=True)
    current_semester = db.Column(db.Integer, nullable=False, default=1, index=True)

    admission_date = db.Column(db.Date, nullable=False)
    expected_completion_date = db.Column(db.Date, nullable=False)

    enrollment_status = db.Column(
        db.Enum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.ACTIVE, index=True
    )

    # Denormalized cache columns refreshed by progress_service — kept small
    # and clearly documented as derived, not source-of-truth.
    cached_overall_progress = db.Column(db.Float, default=0.0)
    cached_risk_level = db.Column(db.String(10), default="LOW", index=True)

    user = db.relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    program = db.relationship("Program", back_populates="students")
    department = db.relationship("Department", back_populates="students")
    supervisor_links = db.relationship(
        "StudentSupervisor", back_populates="student", cascade="all, delete-orphan"
    )
    course_records = db.relationship(
        "StudentCourse", back_populates="student", cascade="all, delete-orphan"
    )
    research_profile = db.relationship(
        "ResearchProfile", back_populates="student", uselist=False, cascade="all, delete-orphan"
    )
    publications = db.relationship(
        "Publication", back_populates="student", cascade="all, delete-orphan"
    )
    submissions = db.relationship(
        "Submission", back_populates="student", cascade="all, delete-orphan"
    )
    evaluations = db.relationship(
        "ProgressEvaluation", back_populates="student", cascade="all, delete-orphan"
    )

    def primary_supervisor(self):
        for link in self.supervisor_links:
            if link.is_primary:
                return link.supervisor
        return None

    def to_summary_dict(self):
        supervisor = self.primary_supervisor()
        return {
            "id": self.id,
            "student_code": self.student_code,
            "full_name": self.full_name,
            "email": self.email,
            "program": self.program.name if self.program else None,
            "program_level": self.program.level.value if self.program else None,
            "department": self.department.name if self.department else None,
            "batch_year": self.batch_year,
            "current_semester": self.current_semester,
            "supervisor": supervisor.full_name if supervisor else None,
            "enrollment_status": self.enrollment_status.value,
            "overall_progress": round(self.cached_overall_progress or 0.0, 1),
            "risk_level": self.cached_risk_level,
            "paper_count": len(self.publications),
            "pending_tasks": sum(1 for s in self.submissions if s.status not in ("submitted", "approved")),
        }

    def to_detail_dict(self):
        base = self.to_summary_dict()
        base.update({
            "admission_date": self.admission_date.isoformat() if self.admission_date else None,
            "expected_completion_date": self.expected_completion_date.isoformat() if self.expected_completion_date else None,
            "total_semesters": self.program.total_semesters if self.program else None,
        })
        return base
