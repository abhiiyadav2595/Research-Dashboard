from app.extensions import db
from app.models.mixins import TimestampMixin


class Semester(db.Model, TimestampMixin):
    """A semester record for a student: credits, CGPA, completion status."""
    __tablename__ = "semesters"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    semester_number = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.String(20), nullable=False)
    credits_registered = db.Column(db.Float, default=0.0)
    credits_completed = db.Column(db.Float, default=0.0)
    sgpa = db.Column(db.Float, nullable=True)
    cgpa = db.Column(db.Float, nullable=True)
    is_completed = db.Column(db.Boolean, default=False)

    student = db.relationship("Student")
    courses = db.relationship("StudentCourse", back_populates="semester", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("student_id", "semester_number", name="uq_student_semester"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "semester_number": self.semester_number,
            "academic_year": self.academic_year,
            "credits_registered": self.credits_registered,
            "credits_completed": self.credits_completed,
            "sgpa": self.sgpa,
            "cgpa": self.cgpa,
            "is_completed": self.is_completed,
        }
