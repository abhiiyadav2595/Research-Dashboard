from flask import Blueprint, jsonify
from app.models.department import Department
from app.models.program import Program
from app.models.supervisor import Supervisor
from app.models.student import Student
from app.utils.decorators import any_authenticated

meta_bp = Blueprint("meta", __name__)


@meta_bp.get("/filters")
@any_authenticated
def filter_options():
    departments = Department.query.order_by(Department.name).all()
    programs = Program.query.order_by(Program.name).all()
    supervisors = Supervisor.query.order_by(Supervisor.full_name).all()
    batch_years = [
        row[0] for row in
        Student.query.with_entities(Student.batch_year).distinct().order_by(Student.batch_year.desc()).all()
    ]

    return jsonify({
        "departments": [d.to_dict() for d in departments],
        "programs": [p.to_dict() for p in programs],
        "supervisors": [s.to_dict() for s in supervisors],
        "batch_years": batch_years,
        "semesters": list(range(1, 9)),
        "statuses": ["active", "on_leave", "suspended", "completed", "withdrawn"],
    })
