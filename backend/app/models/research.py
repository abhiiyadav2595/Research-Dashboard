from app.extensions import db
from app.models.mixins import TimestampMixin
import enum


class ThesisStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    PROPOSAL = "proposal"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    UNDER_EVALUATION = "under_evaluation"
    DEFENDED = "defended"
    COMPLETED = "completed"


class ExamStatus(str, enum.Enum):
    NOT_SCHEDULED = "not_scheduled"
    SCHEDULED = "scheduled"
    PASSED = "passed"
    FAILED = "failed"


class ResearchProfile(db.Model, TimestampMixin):
    __tablename__ = "research_profiles"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), unique=True, nullable=False)
    research_topic = db.Column(db.String(500))
    research_area = db.Column(db.String(255))
    proposal_status = db.Column(db.String(30), default="not_submitted")
    comprehensive_exam_status = db.Column(db.Enum(ExamStatus), default=ExamStatus.NOT_SCHEDULED)
    thesis_status = db.Column(db.Enum(ThesisStatus), default=ThesisStatus.NOT_STARTED)

    student = db.relationship("Student", back_populates="research_profile")
    milestones = db.relationship(
        "ResearchMilestone", back_populates="research_profile", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "research_topic": self.research_topic,
            "research_area": self.research_area,
            "proposal_status": self.proposal_status,
            "comprehensive_exam_status": self.comprehensive_exam_status.value,
            "thesis_status": self.thesis_status.value,
            "milestones": [m.to_dict() for m in self.milestones],
        }


class ResearchMilestone(db.Model, TimestampMixin):
    __tablename__ = "research_milestones"

    id = db.Column(db.Integer, primary_key=True)
    research_profile_id = db.Column(
        db.Integer, db.ForeignKey("research_profiles.id"), nullable=False, index=True
    )
    title = db.Column(db.String(255), nullable=False)
    milestone_type = db.Column(db.String(50))  # proposal, comprehensive_exam, chapter, thesis_submission, defense...
    is_required = db.Column(db.Boolean, default=True)
    due_date = db.Column(db.Date, nullable=True)
    completed_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default="pending")  # pending, in_progress, completed, delayed

    research_profile = db.relationship("ResearchProfile", back_populates="milestones")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "milestone_type": self.milestone_type,
            "is_required": self.is_required,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "completed_date": self.completed_date.isoformat() if self.completed_date else None,
            "status": self.status,
        }
