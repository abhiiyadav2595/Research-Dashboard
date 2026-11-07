from app.extensions import db
from app.models.mixins import TimestampMixin
import enum


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    OVERDUE = "overdue"


class Submission(db.Model, TimestampMixin):
    __tablename__ = "submissions"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False)  # progress_report, thesis_chapter, proposal, etc.
    deadline = db.Column(db.Date, nullable=False, index=True)
    submitted_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.PENDING, index=True)
    document_link = db.Column(db.String(500), nullable=True)

    reviewer_id = db.Column(db.Integer, db.ForeignKey("supervisors.id"), nullable=True)

    student = db.relationship("Student", back_populates="submissions")
    reviewer = db.relationship("Supervisor")
    reviews = db.relationship("SubmissionReview", back_populates="submission", cascade="all, delete-orphan")

    def is_overdue(self):
        from datetime import date
        return self.status in (SubmissionStatus.PENDING, SubmissionStatus.UNDER_REVIEW) and self.deadline < date.today()

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "name": self.name,
            "category": self.category,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "submitted_date": self.submitted_date.isoformat() if self.submitted_date else None,
            "status": self.status.value,
            "document_link": self.document_link,
            "reviewer": self.reviewer.full_name if self.reviewer else None,
            "is_overdue": self.is_overdue(),
            "remarks": [r.remark for r in self.reviews],
        }


class SubmissionReview(db.Model, TimestampMixin):
    __tablename__ = "submission_reviews"

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("submissions.id"), nullable=False, index=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey("supervisors.id"), nullable=True)
    remark = db.Column(db.Text, nullable=False)
    decision = db.Column(db.String(30), nullable=True)  # approved, rejected, needs_revision

    submission = db.relationship("Submission", back_populates="reviews")
    reviewer = db.relationship("Supervisor")
