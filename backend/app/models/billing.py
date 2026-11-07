import enum
from datetime import date
from app.extensions import db
from app.models.mixins import TimestampMixin


class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CLEARANCE_GRANTED = "CLEARANCE_GRANTED"
    FINANCIAL_HOLD = "FINANCIAL_HOLD"


class InvoiceStatus(str, enum.Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class TransactionType(str, enum.Enum):
    PAYMENT = "PAYMENT"
    FELLOWSHIP_CREDIT = "FELLOWSHIP_CREDIT"
    STIPEND_DISBURSEMENT = "STIPEND_DISBURSEMENT"
    FEE_WAIVER = "FEE_WAIVER"
    REFUND = "REFUND"


class PaymentMethod(str, enum.Enum):
    BANK_TRANSFER = "BANK_TRANSFER"
    CREDIT_CARD = "CREDIT_CARD"
    SCHOLARSHIP_GRANT = "SCHOLARSHIP_GRANT"
    ONLINE_PAYMENT = "ONLINE_PAYMENT"
    CHEQUE = "CHEQUE"


class FeeCatalog(db.Model, TimestampMixin):
    """
    Demonstrates 3NF: Normalized master fee types catalog.
    Prevents duplicate text, variable fee naming, and eliminates transitive dependencies.
    """
    __tablename__ = "fee_catalog"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False, default="tuition")
    standard_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0.00)
    description = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "category": self.category,
            "standard_amount": float(self.standard_amount or 0.0),
            "description": self.description,
        }


class StudentFeeAccount(db.Model, TimestampMixin):
    """
    Normalized 1:1 account entity per student.
    Maintains financial ledger balance and enrollment clearance status.
    """
    __tablename__ = "student_fee_accounts"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), unique=True, nullable=False, index=True)
    account_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    currency = db.Column(db.String(3), default="USD", nullable=False)

    total_billed = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    total_paid = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    current_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    account_status = db.Column(db.String(20), default=AccountStatus.ACTIVE.value, nullable=False, index=True)
    last_billing_date = db.Column(db.Date, nullable=True)

    student = db.relationship("Student", backref=db.backref("fee_account", uselist=False))
    invoices = db.relationship("Invoice", back_populates="account", cascade="all, delete-orphan", order_by="desc(Invoice.id)")
    transactions = db.relationship("BillingTransaction", back_populates="account", cascade="all, delete-orphan", order_by="desc(BillingTransaction.id)")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_code": self.student.student_code if self.student else None,
            "student_name": self.student.full_name if self.student else None,
            "department": self.student.department.name if self.student and self.student.department else None,
            "program": self.student.program.name if self.student and self.student.program else None,
            "account_number": self.account_number,
            "currency": self.currency,
            "total_billed": float(self.total_billed or 0.0),
            "total_paid": float(self.total_paid or 0.0),
            "current_balance": float(self.current_balance or 0.0),
            "account_status": self.account_status,
            "last_billing_date": self.last_billing_date.isoformat() if self.last_billing_date else None,
            "invoices_count": len(self.invoices),
        }


class Invoice(db.Model, TimestampMixin):
    """
    Normalized Invoice Header (1NF/2NF/3NF).
    Line items are decomposed into InvoiceItem to guarantee 1NF.
    """
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey("student_fee_accounts.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id"), nullable=True, index=True)

    issue_date = db.Column(db.Date, default=date.today, nullable=False)
    due_date = db.Column(db.Date, nullable=False)

    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    tax_or_waiver = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    status = db.Column(db.String(20), default=InvoiceStatus.PENDING.value, nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)

    account = db.relationship("StudentFeeAccount", back_populates="invoices")
    student = db.relationship("Student", backref="invoices")
    semester = db.relationship("Semester")
    items = db.relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    transactions = db.relationship("BillingTransaction", back_populates="invoice")

    @property
    def remaining_balance(self):
        return max(0.0, float(self.total_amount) - float(self.amount_paid))

    def to_dict(self, include_items=True):
        res = {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "account_id": self.account_id,
            "student_id": self.student_id,
            "student_code": self.student.student_code if self.student else None,
            "student_name": self.student.full_name if self.student else None,
            "semester_number": self.semester.number if self.semester else None,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "subtotal": float(self.subtotal or 0.0),
            "tax_or_waiver": float(self.tax_or_waiver or 0.0),
            "total_amount": float(self.total_amount or 0.0),
            "amount_paid": float(self.amount_paid or 0.0),
            "remaining_balance": self.remaining_balance,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_items:
            res["items"] = [item.to_dict() for item in self.items]
        return res


class InvoiceItem(db.Model):
    """
    Normalized line items (1NF: atomic, non-repeating).
    """
    __tablename__ = "invoice_items"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_catalog_id = db.Column(db.Integer, db.ForeignKey("fee_catalog.id"), nullable=True)

    item_description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)

    invoice = db.relationship("Invoice", back_populates="items")
    fee_type = db.relationship("FeeCatalog")

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "fee_catalog_id": self.fee_catalog_id,
            "item_description": self.item_description,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price or 0.0),
            "line_total": float(self.line_total or 0.0),
        }


class BillingTransaction(db.Model):
    """
    Demonstrates ACID transactions:
    Atomicity (all updates succeed or rollback),
    Consistency (balance >= 0, foreign keys),
    Isolation (row-level locking),
    Durability (persisted to WAL).
    """
    __tablename__ = "billing_transactions"

    id = db.Column(db.Integer, primary_key=True)
    transaction_ref = db.Column(db.String(60), unique=True, nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey("student_fee_accounts.id"), nullable=False, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=True, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False, index=True)

    transaction_type = db.Column(db.String(30), default=TransactionType.PAYMENT.value, nullable=False, index=True)
    payment_method = db.Column(db.String(40), default=PaymentMethod.BANK_TRANSFER.value, nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(20), default="SUCCESS", nullable=False, index=True)
    failure_reason = db.Column(db.Text, nullable=True)
    idempotency_key = db.Column(db.String(100), unique=True, nullable=True)
    executed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    acid_phase = db.Column(db.String(50), default="COMMITTED", nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now(), nullable=False, index=True)

    account = db.relationship("StudentFeeAccount", back_populates="transactions")
    invoice = db.relationship("Invoice", back_populates="transactions")
    student = db.relationship("Student")
    executed_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_ref": self.transaction_ref,
            "account_id": self.account_id,
            "invoice_id": self.invoice_id,
            "invoice_number": self.invoice.invoice_number if self.invoice else None,
            "student_id": self.student_id,
            "student_code": self.student.student_code if self.student else None,
            "student_name": self.student.full_name if self.student else None,
            "transaction_type": self.transaction_type,
            "payment_method": self.payment_method,
            "amount": float(self.amount or 0.0),
            "status": self.status,
            "failure_reason": self.failure_reason,
            "acid_phase": self.acid_phase,
            "executed_by": self.executed_by.full_name if self.executed_by else "System/Automated",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

