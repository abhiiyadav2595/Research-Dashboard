from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.extensions import db
from app.models.billing import StudentFeeAccount, Invoice, BillingTransaction, FeeCatalog
from app.models.student import Student
from app.services.billing_service import (
    initialize_billing_catalog_and_accounts,
    create_invoice_transactional,
    execute_acid_payment,
)

billing_bp = Blueprint("billing", __name__)


@billing_bp.get("/summary")
def get_billing_summary():
    """
    Returns high-level aggregate financial KPIs across the institution.
    """
    total_billed = db.session.execute(text("SELECT COALESCE(SUM(total_billed), 0.0) FROM student_fee_accounts")).scalar() or 0.0
    total_paid = db.session.execute(text("SELECT COALESCE(SUM(total_paid), 0.0) FROM student_fee_accounts")).scalar() or 0.0
    current_balance = db.session.execute(text("SELECT COALESCE(SUM(current_balance), 0.0) FROM student_fee_accounts")).scalar() or 0.0
    total_accounts = StudentFeeAccount.query.count()
    unpaid_invoices = Invoice.query.filter(Invoice.status.in_(["PENDING", "OVERDUE", "PARTIALLY_PAID"])).count()
    paid_invoices = Invoice.query.filter_by(status="PAID").count()

    return jsonify({
        "total_billed": float(total_billed),
        "total_paid": float(total_paid),
        "outstanding_balance": float(current_balance),
        "total_accounts": total_accounts,
        "unpaid_invoices": unpaid_invoices,
        "paid_invoices": paid_invoices,
    })


@billing_bp.get("/catalog")
def get_fee_catalog():
    """
    Returns fee items from normalized catalog (3NF).
    """
    catalog = FeeCatalog.query.order_by(FeeCatalog.category, FeeCatalog.name).all()
    return jsonify([c.to_dict() for c in catalog])


@billing_bp.get("/accounts")
def list_accounts():
    """
    Lists student fee accounts with optional search and pagination.
    """
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = StudentFeeAccount.query.join(Student)
    if search:
        query = query.filter(
            (Student.full_name.ilike(f"%{search}%")) |
            (Student.student_code.ilike(f"%{search}%")) |
            (StudentFeeAccount.account_number.ilike(f"%{search}%"))
        )
    if status:
        query = query.filter(StudentFeeAccount.account_status == status)

    pagination = query.order_by(StudentFeeAccount.current_balance.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "items": [acc.to_dict() for acc in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    })


@billing_bp.get("/accounts/<int:student_id>")
def get_account_detail(student_id):
    """
    Fetches full billing details for a specific student, including invoices and transactions.
    """
    account = StudentFeeAccount.query.filter_by(student_id=student_id).first()
    if not account:
        return jsonify({"error": "Fee account not found"}), 404

    invoices = Invoice.query.filter_by(account_id=account.id).order_by(Invoice.id.desc()).all()
    transactions = BillingTransaction.query.filter_by(account_id=account.id).order_by(BillingTransaction.id.desc()).all()

    return jsonify({
        "account": account.to_dict(),
        "invoices": [inv.to_dict() for inv in invoices],
        "transactions": [tx.to_dict() for tx in transactions],
    })


@billing_bp.get("/invoices")
def list_invoices():
    """
    Lists all invoices across students with optional status filter.
    """
    status = request.args.get("status", "").strip()
    student_id = request.args.get("student_id", type=int)
    limit = request.args.get("limit", 50, type=int)

    query = Invoice.query
    if status:
        query = query.filter(Invoice.status == status)
    if student_id:
        query = query.filter(Invoice.student_id == student_id)

    invoices = query.order_by(Invoice.id.desc()).limit(limit).all()
    return jsonify([inv.to_dict() for inv in invoices])


@billing_bp.post("/invoices")
def create_invoice():
    """
    Creates a new invoice atomically.
    """
    data = request.get_json() or {}
    student_id = data.get("student_id")
    items = data.get("items", [])
    semester_id = data.get("semester_id")
    notes = data.get("notes")
    due_days = data.get("due_days", 30)

    if not student_id or not items:
        return jsonify({"error": "student_id and items list are required"}), 400

    try:
        inv = create_invoice_transactional(student_id, items, semester_id, notes, due_days)
        return jsonify(inv.to_dict()), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@billing_bp.post("/pay")
def process_payment():
    """
    Executes an ACID payment transaction with atomicity guarantees.
    Supports simulate_failure=true to showcase ACID rollback.
    """
    data = request.get_json() or {}
    student_id = data.get("student_id")
    invoice_id = data.get("invoice_id")
    amount = data.get("amount")
    payment_method = data.get("payment_method", "BANK_TRANSFER")
    simulate_failure = data.get("simulate_failure", False)

    if not student_id or not invoice_id or amount is None:
        return jsonify({"error": "student_id, invoice_id, and amount are required"}), 400

    result = execute_acid_payment(
        student_id=student_id,
        invoice_id=invoice_id,
        amount=amount,
        payment_method=payment_method,
        simulate_failure=simulate_failure,
    )

    status_code = 200 if result["success"] else 422
    return jsonify(result), status_code


@billing_bp.get("/transactions")
def list_transactions():
    """
    Returns recent billing transactions with ACID metadata and timestamps.
    """
    limit = request.args.get("limit", 50, type=int)
    transactions = BillingTransaction.query.order_by(BillingTransaction.id.desc()).limit(limit).all()
    return jsonify([t.to_dict() for t in transactions])


@billing_bp.post("/init-seed")
def seed_billing():
    """
    Initializes billing accounts and seed invoices if not already present.
    """
    res = initialize_billing_catalog_and_accounts()
    return jsonify({"status": "initialized", "details": res})

