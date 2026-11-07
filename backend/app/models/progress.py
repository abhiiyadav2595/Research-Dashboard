from app.extensions import db
from app.models.mixins import TimestampMixin


class ProgressWeight(db.Model, TimestampMixin):
    """Configurable weights for the progress evaluation formula.
    Only one active weight-set is used at a time (is_active=True).
    """
    __tablename__ = "progress_weights"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, default="Default weights")
    academic_weight = db.Column(db.Float, nullable=False, default=25.0)
    research_weight = db.Column(db.Float, nullable=False, default=30.0)
    milestone_weight = db.Column(db.Float, nullable=False, default=20.0)
    publication_weight = db.Column(db.Float, nullable=False, default=15.0)
    submission_weight = db.Column(db.Float, nullable=False, default=10.0)
    is_active = db.Column(db.Boolean, default=True, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "academic_weight": self.academic_weight,
            "research_weight": self.research_weight,
            "milestone_weight": self.milestone_weight,
            "publication_weight": self.publication_weight,
            "submission_weight": self.submission_weight,
            "is_active": self.is_active,
        }

    def total(self):
        return (
            self.academic_weight + self.research_weight + self.milestone_weight
            + self.publication_weight + self.submission_weight
        )


class ProgressEvaluation(db.Model, TimestampMixin):
    """Snapshot of a student's computed progress at a point in time."""
    __tablename__ = "progress_evaluations"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    weight_set_id = db.Column(db.Integer, db.ForeignKey("progress_weights.id"), nullable=True)

    academic_score = db.Column(db.Float, default=0.0)
    research_score = db.Column(db.Float, default=0.0)
    milestone_score = db.Column(db.Float, default=0.0)
    publication_score = db.Column(db.Float, default=0.0)
    submission_score = db.Column(db.Float, default=0.0)
    overall_score = db.Column(db.Float, default=0.0, index=True)

    risk_level = db.Column(db.String(10), default="LOW")
    risk_reasons = db.Column(db.Text, nullable=True)  # newline-joined human-readable reasons

    student = db.relationship("Student", back_populates="evaluations")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "academic_score": round(self.academic_score, 1),
            "research_score": round(self.research_score, 1),
            "milestone_score": round(self.milestone_score, 1),
            "publication_score": round(self.publication_score, 1),
            "submission_score": round(self.submission_score, 1),
            "overall_score": round(self.overall_score, 1),
            "risk_level": self.risk_level,
            "risk_reasons": self.risk_reasons.split("\n") if self.risk_reasons else [],
            "evaluated_at": self.created_at.isoformat() if self.created_at else None,
        }
