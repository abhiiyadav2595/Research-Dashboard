from app.extensions import db
from app.models.mixins import TimestampMixin


class Department(db.Model, TimestampMixin):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)

    students = db.relationship("Student", back_populates="department")
    supervisors = db.relationship("Supervisor", back_populates="department")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "code": self.code}
