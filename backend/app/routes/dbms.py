from flask import Blueprint, request, jsonify
from sqlalchemy import text, inspect
from app.extensions import db
from app.services.dbms_service import (
    install_dbms_components,
    get_view_data,
    get_active_triggers,
    test_trigger_firing,
    VIEW_DEFINITIONS,
)
from app.services.billing_service import execute_acid_payment
from app.models.student import Student
from app.models.billing import Invoice, StudentFeeAccount, BillingTransaction

dbms_bp = Blueprint("dbms", __name__)


@dbms_bp.get("/overview")
def get_dbms_overview():
    """
    Returns an aggregated overview of the 4 key DBMS concepts implemented in the project.
    """
    inspector = inspect(db.engine)
    all_tables = inspector.get_table_names()
    all_views = inspector.get_view_names()

    audit_count = db.session.execute(text("SELECT count(*) FROM audit_logs")).scalar() or 0
    trigger_logs_count = db.session.execute(
        text("SELECT count(*) FROM audit_logs WHERE action LIKE 'DB_TRIGGER:%'")
    ).scalar() or 0
    tx_count = db.session.execute(text("SELECT count(*) FROM billing_transactions")).scalar() or 0

    return jsonify({
        "database_engine": db.engine.dialect.name,
        "database_version": "PostgreSQL (Neon Cloud Hosted / Local)",
        "concepts": {
            "normalization": {
                "level": "3NF / BCNF Achieved",
                "total_tables": len(all_tables),
                "key_entities": [
                    "students", "departments", "programs", "supervisors",
                    "student_supervisors (M:N normalized)", "courses", "student_courses (M:N normalized)",
                    "research_profiles", "research_milestones", "publications", "publication_authors (1NF multi-author normalized)",
                    "fee_catalog (3NF fee catalog)", "student_fee_accounts (1:1 financial ledger)",
                    "invoices", "invoice_items (1NF line item decomposition)", "billing_transactions (ACID ledger)"
                ],
            },
            "triggers": {
                "active_triggers_count": 5,
                "monitored_tables": ["students", "submissions", "research_milestones", "invoices", "billing_transactions"],
                "trigger_function": "fn_audit_log_trigger()",
                "trigger_logs_generated": trigger_logs_count,
                "total_audit_logs": audit_count,
            },
            "views": {
                "registered_views": list(VIEW_DEFINITIONS.keys()),
                "purpose": "Role-Based Access Control (RBAC) & Column-Level Confidentiality Projection",
                "roles_covered": ["student", "supervisor", "admin", "billing_office"],
            },
            "transactions": {
                "engine": "PostgreSQL ACID Engine with Row-Level Isolation (SELECT ... FOR UPDATE)",
                "total_transactions_executed": tx_count,
                "acid_properties": {
                    "Atomicity": "All updates (ledger, invoice status, audit transaction) commit as 1 unit or rollback cleanly.",
                    "Consistency": "Balance constraints and foreign keys guarantee valid state at all checkpoints.",
                    "Isolation": "Row-level locks (with_for_update) prevent race conditions and concurrent double-payments.",
                    "Durability": "Transactions written to PostgreSQL WAL on commit.",
                },
            },
        },
        "all_tables": sorted(all_tables),
        "all_views": sorted(all_views),
    })


@dbms_bp.post("/setup")
def setup_dbms():
    """
    Installs the PostgreSQL trigger function, table triggers, and role-based views.
    """
    res = install_dbms_components()
    return jsonify({"status": "success", "installed": res})


@dbms_bp.get("/views/<view_name>")
def fetch_view(view_name):
    """
    Executes a SELECT on the requested database view and returns the resulting records.
    """
    limit = request.args.get("limit", 50, type=int)
    try:
        data = get_view_data(view_name, limit=limit)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@dbms_bp.get("/triggers")
def list_triggers():
    """
    Lists all active database triggers and recent trigger-generated audit logs.
    """
    data = get_active_triggers()
    return jsonify(data)


@dbms_bp.post("/test-trigger")
def run_trigger_test():
    """
    Triggers an action in the database and returns the row created by the DB trigger in audit_logs.
    """
    data = request.get_json() or {}
    student_id = data.get("student_id")
    test_action = data.get("test_action", "UPDATE_STUDENT_STATUS")

    try:
        res = test_trigger_firing(student_id=student_id, test_action=test_action)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@dbms_bp.post("/test-transaction")
def run_transaction_test():
    """
    Tests an ACID billing transaction with optional simulated failure to demonstrate rollback.
    """
    data = request.get_json() or {}
    student_id = data.get("student_id")
    simulate_failure = data.get("simulate_failure", False)
    amount = data.get("amount", 250.00)

    # Pick an invoice that has pending balance
    inv = None
    if student_id:
        inv = Invoice.query.filter(Invoice.student_id == student_id, Invoice.status != "PAID").first()
    if not inv:
        inv = Invoice.query.filter(Invoice.status != "PAID").first()

    if not inv:
        return jsonify({"error": "No unpaid invoice found to test transaction against."}), 404

    result = execute_acid_payment(
        student_id=inv.student_id,
        invoice_id=inv.id,
        amount=min(amount, float(inv.remaining_balance)),
        payment_method="BANK_TRANSFER",
        simulate_failure=simulate_failure,
    )

    return jsonify(result)


@dbms_bp.get("/schema-analysis")
def get_schema_analysis():
    """
    Returns an academic breakdown of how the relational database meets 1NF, 2NF, 3NF, and BCNF.
    """
    return jsonify({
        "normalization_stages": [
            {
                "normal_form": "First Normal Form (1NF)",
                "requirement": "All attributes contain atomic (indivisible) values and there are no repeating groups.",
                "project_implementation": [
                    "invoice_items: Instead of storing multiple fee items as JSON strings or comma-separated columns inside invoices, each item is a separate atomic row.",
                    "publication_authors: Decomposed author arrays into atomic rows (publication_id, student_id, author_order, is_corresponding).",
                    "student_courses: Course grades, semesters, and credits are stored as individual scalar records rather than concatenated semester lists.",
                ],
            },
            {
                "normal_form": "Second Normal Form (2NF)",
                "requirement": "Must be in 1NF, and every non-key attribute must be fully functionally dependent on the primary key (no partial dependencies on composite keys).",
                "project_implementation": [
                    "student_supervisors: Composite PK (student_id, supervisor_id). Non-key attribute is_primary and assigned_at depend on both keys together.",
                    "student_courses: Composite PK (student_id, course_id, semester_id). Course metadata (title, credits) are factored out to the courses table so they don't depend partially on the enrollment record.",
                    "invoice_items: Depends entirely on (id) or (invoice_id, fee_catalog_id), with item descriptions and rates decoupled from student identities.",
                ],
            },
            {
                "normal_form": "Third Normal Form (3NF)",
                "requirement": "Must be in 2NF, and no non-key attribute is transitively dependent on the primary key (X -> Y -> Z eliminated).",
                "project_implementation": [
                    "fee_catalog: Previously, storing fee_category or standard_amount on an invoice would create a transitive dependency (invoice_id -> fee_name -> standard_amount). Now invoice_items references fee_catalog.id directly.",
                    "students -> departments -> (faculty, building): Students reference department_id, not department building or dean name directly.",
                    "supervisors -> departments: Supervisor departmental metadata is isolated in departments table to eliminate transitive updates.",
                ],
            },
            {
                "normal_form": "Boyce-Codd Normal Form (BCNF)",
                "requirement": "Every determinant in the schema is a candidate key.",
                "project_implementation": [
                    "student_fee_accounts: student_id is unique and a candidate key. account_number is unique and a candidate key.",
                    "invoices: invoice_number is a unique determinant. id is a unique candidate key.",
                    "billing_transactions: transaction_ref is a unique determinant.",
                ],
            },
        ],
    })

