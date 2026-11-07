"""
Progress evaluation service.

Computes a weighted overall progress score for a student from five
component scores (each 0-100), using whichever ProgressWeight row is
currently marked active in the database. Admins can change the weights
via the /api/progress/weights endpoint without any code change.
"""
from datetime import date
from app.extensions import db
from app.models.progress import ProgressWeight, ProgressEvaluation
from app.models.publication import PublicationStatus
from app.models.submission import SubmissionStatus
from app.services.risk_service import evaluate_risk


def get_active_weights():
    weights = ProgressWeight.query.filter_by(is_active=True).first()
    if not weights:
        weights = ProgressWeight(name="Default weights")
        db.session.add(weights)
        db.session.commit()
    return weights


def _academic_score(student):
    """Based on completed-vs-registered credits and CGPA trend."""
    semesters = student.course_records  # via StudentCourse; but easier via Semester
    from app.models.semester import Semester
    sem_records = Semester.query.filter_by(student_id=student.id).all()
    if not sem_records:
        return 0.0
    completed = sum(s.credits_completed or 0 for s in sem_records)
    registered = sum(s.credits_registered or 0 for s in sem_records) or 1
    completion_ratio = min(completed / registered, 1.0)

    cgpa_values = [s.cgpa for s in sem_records if s.cgpa is not None]
    cgpa_component = (cgpa_values[-1] / 4.0) if cgpa_values else completion_ratio
    cgpa_component = min(max(cgpa_component, 0), 1)

    score = (0.6 * completion_ratio + 0.4 * cgpa_component) * 100
    return round(score, 2)


def _research_score(student):
    rp = student.research_profile
    if not rp:
        return 0.0
    thesis_progress_map = {
        "not_started": 0.0, "proposal": 0.25, "in_progress": 0.5,
        "submitted": 0.75, "under_evaluation": 0.85, "defended": 0.95, "completed": 1.0,
    }
    thesis_component = thesis_progress_map.get(rp.thesis_status.value, 0.0)
    exam_component = 1.0 if rp.comprehensive_exam_status.value == "passed" else (
        0.5 if rp.comprehensive_exam_status.value == "scheduled" else 0.0
    )
    score = (0.7 * thesis_component + 0.3 * exam_component) * 100
    return round(score, 2)


def _milestone_score(student):
    rp = student.research_profile
    if not rp or not rp.milestones:
        return 0.0
    total = len(rp.milestones)
    completed = sum(1 for m in rp.milestones if m.status == "completed")
    return round((completed / total) * 100, 2) if total else 0.0


def _publication_score(student):
    pubs = student.publications
    if not pubs:
        return 0.0
    weights = {
        PublicationStatus.DRAFT: 0.1,
        PublicationStatus.SUBMITTED: 0.3,
        PublicationStatus.UNDER_REVIEW: 0.45,
        PublicationStatus.REVISION_REQUIRED: 0.5,
        PublicationStatus.ACCEPTED: 0.8,
        PublicationStatus.PUBLISHED: 1.0,
        PublicationStatus.REJECTED: 0.0,
    }
    # Expect ~1 published-equivalent paper per 2 years enrolled, capped at 100.
    years_enrolled = max((date.today() - student.admission_date).days / 365.25, 0.5)
    expected_papers = max(years_enrolled / 2.0, 1.0)
    earned = sum(weights.get(p.status, 0.0) for p in pubs)
    score = min((earned / expected_papers) * 100, 100)
    return round(score, 2)


def _submission_score(student):
    subs = student.submissions
    if not subs:
        return 100.0  # no requirements yet => fully compliant
    compliant = sum(1 for s in subs if s.status in (SubmissionStatus.SUBMITTED, SubmissionStatus.APPROVED))
    return round((compliant / len(subs)) * 100, 2)


def evaluate_student_progress(student, persist=True):
    weights = get_active_weights()
    academic = _academic_score(student)
    research = _research_score(student)
    milestone = _milestone_score(student)
    publication = _publication_score(student)
    submission = _submission_score(student)

    total_weight = weights.total() or 100.0
    overall = (
        academic * weights.academic_weight
        + research * weights.research_weight
        + milestone * weights.milestone_weight
        + publication * weights.publication_weight
        + submission * weights.submission_weight
    ) / total_weight

    risk_level, reasons = evaluate_risk(student, {
        "academic": academic, "research": research, "milestone": milestone,
        "publication": publication, "submission": submission, "overall": overall,
    })

    if persist:
        evaluation = ProgressEvaluation(
            student_id=student.id,
            weight_set_id=weights.id,
            academic_score=academic,
            research_score=research,
            milestone_score=milestone,
            publication_score=publication,
            submission_score=submission,
            overall_score=overall,
            risk_level=risk_level,
            risk_reasons="\n".join(reasons),
        )
        db.session.add(evaluation)

        student.cached_overall_progress = overall
        student.cached_risk_level = risk_level
        db.session.commit()
        return evaluation

    return {
        "academic_score": academic, "research_score": research, "milestone_score": milestone,
        "publication_score": publication, "submission_score": submission, "overall_score": overall,
        "risk_level": risk_level, "risk_reasons": reasons,
    }


def recompute_all_students():
    from app.models.student import Student
    students = Student.query.filter_by(is_archived=False).all()
    for s in students:
        evaluate_student_progress(s, persist=True)
    return len(students)
