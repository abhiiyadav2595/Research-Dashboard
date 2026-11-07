from app.extensions import db
from app.models.mixins import TimestampMixin
import enum


class ProgramLevel(str, enum.Enum):
    PHD = "phd"
    MASTERS = "masters"


class Program(db.Model, TimestampMixin):
    __tablename__ = "programs"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    level = db.Column(db.Enum(ProgramLevel), nullable=False, index=True)
    total_semesters = db.Column(db.Integer, nullable=False, default=8)

    students = db.relationship("Student", back_populates="program")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level.value,
            "total_semesters": self.total_semesters,
        }
