from app.extensions import db
from app.models.mixins import TimestampMixin


class Course(db.Model, TimestampMixin):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    credits = db.Column(db.Float, nullable=False, default=3.0)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"), nullable=True)

    def to_dict(self):
        return {"id": self.id, "code": self.code, "title": self.title, "credits": self.credits}


class StudentCourse(db.Model, TimestampMixin):
    __tablename__ = "student_courses"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id"), nullable=False, index=True)
    grade = db.Column(db.String(5), nullable=True)
    grade_points = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(20), default="in_progress")  # in_progress, completed, failed

    student = db.relationship("Student", back_populates="course_records")
    course = db.relationship("Course")
    semester = db.relationship("Semester", back_populates="courses")

    def to_dict(self):
        return {
            "id": self.id,
            "course": self.course.to_dict() if self.course else None,
            "grade": self.grade,
            "grade_points": self.grade_points,
            "status": self.status,
        }
