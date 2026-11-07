"""
Seed script: populates the database with realistic demo data —
3 departments, 2 programs (PhD/Master's), several supervisors,
50 students (30 PhD + 20 Master's) spread across semesters 1-8,
academic records, research profiles + milestones, publications,
submissions, progress weights, and one login user per role.

Usage (from backend/ with venv active and DATABASE_URL configured):
    python seed.py
"""
import random
from datetime import date, timedelta
from faker import Faker

from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.department import Department
from app.models.program import Program, ProgramLevel
from app.models.supervisor import Supervisor, StudentSupervisor
from app.models.student import Student, EnrollmentStatus
from app.models.semester import Semester
from app.models.course import Course, StudentCourse
from app.models.research import ResearchProfile, ResearchMilestone, ThesisStatus, ExamStatus
from app.models.publication import Publication, PublicationAuthor, PublicationStatus, PublicationType
from app.models.submission import Submission, SubmissionStatus
from app.models.progress import ProgressWeight
from app.models.system import Notification
from app.services.progress_service import evaluate_student_progress
from app.services.dbms_service import install_dbms_components
from app.services.billing_service import initialize_billing_catalog_and_accounts

fake = Faker()
random.seed(42)
Faker.seed(42)

DEPARTMENTS = [
    ("Computer Science", "CS"),
    ("Electrical Engineering", "EE"),
    ("Biotechnology", "BT"),
]

MILESTONE_TEMPLATES_PHD = [
    ("Research Proposal Defense", "proposal", True),
    ("Comprehensive Exam", "comprehensive_exam", True),
    ("Literature Review Completion", "chapter", True),
    ("Data Collection / Experiments", "chapter", True),
    ("First Draft of Thesis", "thesis_submission", True),
    ("Thesis Submission", "thesis_submission", True),
    ("Thesis Defense", "defense", True),
]

MILESTONE_TEMPLATES_MASTERS = [
    ("Research Proposal Approval", "proposal", True),
    ("Literature Review Completion", "chapter", True),
    ("Thesis Draft Submission", "thesis_submission", True),
    ("Thesis Defense", "defense", True),
]

SUBMISSION_CATEGORIES = [
    "Progress Report", "Annual Review", "Ethics Approval", "Thesis Chapter Draft",
    "Conference Paper Draft", "Ethics Renewal", "Ethics Amendment",
]

PUBLICATION_VENUES = [
    "IEEE Transactions on Systems", "ACM Computing Surveys", "Nature Communications",
    "Journal of Applied Sciences", "International Conference on Machine Learning",
    "Springer Journal of Biotechnology", "IEEE Access", "Elsevier Applied Energy",
]


def rand_date(start_year, end_year):
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 1)))


def build_lookup_data():
    departments = [Department(name=n, code=c) for n, c in DEPARTMENTS]
    db.session.add_all(departments)
    db.session.flush()

    programs = [
        Program(name="PhD in Engineering & Science", level=ProgramLevel.PHD, total_semesters=8),
        Program(name="Master of Science by Research", level=ProgramLevel.MASTERS, total_semesters=4),
    ]
    db.session.add_all(programs)
    db.session.flush()

    supervisors = []
    for dept in departments:
        for _ in range(3):
            sup = Supervisor(
                full_name=f"Dr. {fake.first_name()} {fake.last_name()}",
                email=fake.unique.email(),
                department_id=dept.id,
                designation=random.choice(["Associate Professor", "Professor", "Assistant Professor"]),
            )
            supervisors.append(sup)
    db.session.add_all(supervisors)
    db.session.flush()

    courses = []
    for dept in departments:
        for i in range(1, 6):
            courses.append(Course(
                code=f"{dept.code}{500 + i}",
                title=f"{dept.name} Advanced Topics {i}",
                credits=random.choice([3.0, 4.0]),
                department_id=dept.id,
            ))
    db.session.add_all(courses)
    db.session.flush()

    weights = ProgressWeight(
        name="Default weights", academic_weight=25, research_weight=30,
        milestone_weight=20, publication_weight=15, submission_weight=10, is_active=True,
    )
    db.session.add(weights)
    db.session.commit()

    return departments, programs, supervisors, courses


def create_student(idx, program, departments, supervisors, courses):
    dept = random.choice(departments)
    dept_supervisors = [s for s in supervisors if s.department_id == dept.id]
    supervisor = random.choice(dept_supervisors)

    is_phd = program.level == ProgramLevel.PHD
    batch_year = random.choice([2021, 2022, 2023, 2024])
    admission_date = date(batch_year, random.choice([1, 7]), 1)
    max_sem = program.total_semesters
    # skew semester distribution toward realistic in-progress cohort
    current_semester = min(random.randint(1, max_sem + 1), max_sem)

    expected_years = max_sem / 2
    expected_completion = date(admission_date.year + int(expected_years) + 1, 6, 30)

    status_choice = random.choices(
        [EnrollmentStatus.ACTIVE, EnrollmentStatus.ON_LEAVE, EnrollmentStatus.COMPLETED],
        weights=[85, 8, 7],
    )[0]

    student = Student(
        student_code=f"{'PHD' if is_phd else 'MSC'}{2021 + idx:04d}",
        full_name=fake.name(),
        email=fake.unique.email(),
        program_id=program.id,
        department_id=dept.id,
        batch_year=batch_year,
        current_semester=current_semester,
        admission_date=admission_date,
        expected_completion_date=expected_completion,
        enrollment_status=status_choice,
    )
    db.session.add(student)
    db.session.flush()

    db.session.add(StudentSupervisor(student_id=student.id, supervisor_id=supervisor.id, is_primary=True))

    # Academic records: one Semester row per completed/ongoing semester
    dept_courses = [c for c in courses if c.department_id == dept.id]
    cgpa_trend = round(random.uniform(2.8, 4.0), 2)
    for sem_num in range(1, current_semester + 1):
        credits_registered = random.choice([9.0, 12.0, 15.0])
        completion_ratio = 1.0 if sem_num < current_semester else random.uniform(0.6, 1.0)
        credits_completed = round(credits_registered * completion_ratio, 1)
        cgpa_trend = round(min(max(cgpa_trend + random.uniform(-0.15, 0.15), 2.0), 4.0), 2)
        sem = Semester(
            student_id=student.id, semester_number=sem_num,
            academic_year=f"{admission_date.year + (sem_num - 1) // 2}-{admission_date.year + (sem_num - 1) // 2 + 1}",
            credits_registered=credits_registered, credits_completed=credits_completed,
            sgpa=round(random.uniform(2.8, 4.0), 2), cgpa=cgpa_trend,
            is_completed=(sem_num < current_semester),
        )
        db.session.add(sem)
        db.session.flush()

        for course in random.sample(dept_courses, k=min(2, len(dept_courses))):
            db.session.add(StudentCourse(
                student_id=student.id, course_id=course.id, semester_id=sem.id,
                grade=random.choice(["A", "A-", "B+", "B", "B-"]),
                grade_points=round(random.uniform(3.0, 4.0), 2),
                status="completed" if sem.is_completed else "in_progress",
            ))

    # Research profile + milestones
    templates = MILESTONE_TEMPLATES_PHD if is_phd else MILESTONE_TEMPLATES_MASTERS
    progress_ratio = current_semester / max_sem
    thesis_status = (
        ThesisStatus.COMPLETED if status_choice == EnrollmentStatus.COMPLETED else
        ThesisStatus.DEFENDED if progress_ratio > 0.9 else
        ThesisStatus.SUBMITTED if progress_ratio > 0.75 else
        ThesisStatus.IN_PROGRESS if progress_ratio > 0.35 else
        ThesisStatus.PROPOSAL if progress_ratio > 0.15 else ThesisStatus.NOT_STARTED
    )
    exam_status = ExamStatus.PASSED if progress_ratio > 0.4 else (
        ExamStatus.SCHEDULED if progress_ratio > 0.2 else ExamStatus.NOT_SCHEDULED
    )
    rp = ResearchProfile(
        student_id=student.id,
        research_topic=f"{fake.catch_phrase()} in {dept.name}",
        research_area=random.choice([
            "Machine Learning", "Renewable Energy", "Molecular Biology", "Data Systems",
            "Signal Processing", "Genomics", "Distributed Systems", "Materials Science",
        ]),
        proposal_status="approved" if progress_ratio > 0.15 else "not_submitted",
        comprehensive_exam_status=exam_status,
        thesis_status=thesis_status,
    )
    db.session.add(rp)
    db.session.flush()

    num_milestones_reached = max(1, int(len(templates) * min(progress_ratio + 0.15, 1.0)))
    for i, (title, mtype, required) in enumerate(templates):
        is_done = i < num_milestones_reached
        # Intentionally leave a couple of students with a delayed milestone for the at-risk engine
        make_delayed = (not is_done) and random.random() < 0.18
        due = admission_date + timedelta(days=180 * (i + 1))
        db.session.add(ResearchMilestone(
            research_profile_id=rp.id, title=title, milestone_type=mtype, is_required=required,
            due_date=due,
            completed_date=due + timedelta(days=random.randint(-20, 30)) if is_done else None,
            status="completed" if is_done else ("delayed" if make_delayed and due < date.today() else "pending"),
        ))

    # Publications: PhD students publish more
    num_pubs = random.choices([0, 1, 2, 3, 4], weights=[10, 25, 30, 20, 15] if is_phd else [30, 35, 20, 10, 5])[0]
    for _ in range(num_pubs):
        status = random.choices(
            list(PublicationStatus), weights=[10, 15, 15, 10, 15, 25, 10]
        )[0]
        sub_date = rand_date(admission_date.year, min(date.today().year, admission_date.year + 4))
        pub = Publication(
            student_id=student.id,
            title=fake.sentence(nb_words=8).rstrip("."),
            pub_type=random.choice(list(PublicationType)),
            venue=random.choice(PUBLICATION_VENUES),
            status=status,
            submission_date=sub_date,
            acceptance_date=sub_date + timedelta(days=90) if status in (
                PublicationStatus.ACCEPTED, PublicationStatus.PUBLISHED) else None,
            publication_date=sub_date + timedelta(days=150) if status == PublicationStatus.PUBLISHED else None,
            doi=f"10.1000/{fake.uuid4()[:8]}" if status == PublicationStatus.PUBLISHED else None,
            url=fake.url() if status == PublicationStatus.PUBLISHED else None,
        )
        db.session.add(pub)
        db.session.flush()
        db.session.add(PublicationAuthor(publication_id=pub.id, author_name=student.full_name, author_order=1))
        db.session.add(PublicationAuthor(publication_id=pub.id, author_name=supervisor.full_name, author_order=2))

    # Submissions: mix of on-time, pending, and overdue
    num_subs = random.randint(2, 6)
    for _ in range(num_subs):
        deadline = rand_date(admission_date.year, admission_date.year + 4)
        will_be_overdue = deadline < date.today() and random.random() < 0.25
        status = SubmissionStatus.OVERDUE if will_be_overdue else random.choices(
            [SubmissionStatus.APPROVED, SubmissionStatus.SUBMITTED, SubmissionStatus.PENDING, SubmissionStatus.UNDER_REVIEW],
            weights=[45, 20, 20, 15],
        )[0]
        db.session.add(Submission(
            student_id=student.id,
            name=f"{random.choice(SUBMISSION_CATEGORIES)} - Sem {random.randint(1, current_semester)}",
            category=random.choice(SUBMISSION_CATEGORIES),
            deadline=deadline,
            submitted_date=deadline - timedelta(days=random.randint(0, 10)) if status in (
                SubmissionStatus.APPROVED, SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW) else None,
            status=status,
            reviewer_id=supervisor.id,
            document_link=fake.url() if status != SubmissionStatus.PENDING else None,
        ))

    db.session.flush()
    return student


def seed_users_and_notifications(supervisors, students=None):
    users = [
        User(email="admin@university.edu", full_name="System Administrator", role=RoleEnum.ADMIN),
        User(email="coordinator@university.edu", full_name="Dept. Coordinator", role=RoleEnum.COORDINATOR),
        User(email="supervisor@university.edu", full_name=supervisors[0].full_name, role=RoleEnum.SUPERVISOR),
        User(email="student@university.edu", full_name="Demo Student", role=RoleEnum.STUDENT),
    ]
    passwords = ["Admin@123", "Coord@123", "Super@123", "Student@123"]
    for u, pw in zip(users, passwords):
        u.set_password(pw)
    db.session.add_all(users)
    db.session.flush()

    # Link the demo supervisor login to the first seeded supervisor record
    supervisors[0].user_id = users[2].id
    db.session.add(supervisors[0])

    # Link demo student login to the first seeded student record
    if students and len(students) > 0:
        students[0].user_id = users[3].id
        users[3].full_name = students[0].full_name
        db.session.add(students[0])
        db.session.add(users[3])

    db.session.add(Notification(
        user_id=users[0].id, title="Welcome to the Dashboard",
        message="Seed data has been loaded. Explore the dashboard, student directory and reports.",
        category="system",
    ))
    db.session.commit()
    return users


def main():
    app = create_app()
    with app.app_context():
        print("Ensuring all tables exist...")
        db.create_all()

        print("Truncating existing tables for fresh seed...")
        table_names = [
            "billing_transactions", "invoice_items", "invoices", "student_fee_accounts",
            "progress_evaluations", "submission_reviews", "submissions", "publication_authors",
            "publications", "research_milestones", "research_profiles", "student_courses",
            "student_supervisors", "notifications", "audit_logs", "students", "courses",
            "supervisors", "programs", "departments", "users", "fee_catalog"
        ]
        for t in table_names:
            try:
                db.session.execute(db.text(f"TRUNCATE TABLE {t} CASCADE;"))
            except Exception:
                pass
        db.session.commit()

        print("Creating departments, programs, supervisors, courses...")
        departments, programs, supervisors, courses = build_lookup_data()

        phd_program = next(p for p in programs if p.level == ProgramLevel.PHD)
        masters_program = next(p for p in programs if p.level == ProgramLevel.MASTERS)

        print("Creating 30 PhD students...")
        students = []
        for i in range(30):
            students.append(create_student(i, phd_program, departments, supervisors, courses))

        print("Creating 20 Master's students...")
        for i in range(30, 50):
            students.append(create_student(i, masters_program, departments, supervisors, courses))
        db.session.commit()

        print("Creating login users...")
        seed_users_and_notifications(supervisors, students)

        print("Computing initial progress evaluations and risk levels...")
        for s in students:
            evaluate_student_progress(s, persist=True)

        print("Installing PostgreSQL database triggers and role-based views...")
        install_res = install_dbms_components()
        print(f"DBMS Components Installed: {install_res}")

        print("Initializing normalized fee catalog, student accounts, and ACID billing records...")
        billing_res = initialize_billing_catalog_and_accounts()
        print(f"Billing Seed Result: {billing_res}")

        print("\nSeed complete: 50 students created (30 PhD, 20 Master's).")
        print("DBMS Concepts active: Normalization (3NF/BCNF), Audit Triggers, Role Views, Billing Transactions.")
        print("Login credentials:")
        print("  Admin:       admin@university.edu / Admin@123")
        print("  Coordinator: coordinator@university.edu / Coord@123")
        print("  Supervisor:  supervisor@university.edu / Super@123")
        print("  Student:     student@university.edu / Student@123")


if __name__ == "__main__":
    main()
