import uuid
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy import text
from app.extensions import db
from app.models.billing import (
    StudentFeeAccount, Invoice, InvoiceItem, BillingTransaction,
    FeeCatalog, AccountStatus, InvoiceStatus, TransactionType, PaymentMethod
)
from app.models.student import Student
from app.models.semester import Semester


class TransactionRollbackException(Exception):
    """Exception raised intentionally to demonstrate ACID rollback."""
    pass


def initialize_billing_catalog_and_accounts():
    """
    Seeds default fee catalog items and initializes 1:1 fee accounts for students.
    """
    # 1. Seed Fee Catalog
    default_catalog = [
        ("TUITION_PHD", "PhD Doctoral Tuition & Supervision", "tuition", 3500.00, "Per-semester PhD doctoral tuition and faculty research advisory fee"),
        ("TUITION_MS", "M.Sc. by Research Tuition", "tuition", 2400.00, "Per-semester Master's degree research tuition fee"),
        ("LAB_BENCH_FEE", "Specialized Laboratory & Bench Fee", "laboratory", 750.00, "Consumables, high-performance computing, and lab apparatus access"),
        ("THESIS_EXAM_FEE", "Doctoral Defense & External Viva Fee", "examination", 600.00, "External examiner honorarium and viva voce assessment costs"),
        ("TECH_LIBRARY_FEE", "Digital Library & Computing Access", "general", 250.00, "IEEE, ScienceDirect, ACM portal subscriptions and lab workstation access"),
        ("FELLOWSHIP_STIPEND_CR", "Graduate Research Assistant Stipend", "stipend", 1200.00, "University fellowship credit disbursement directly to scholar ledger"),
    ]

    for code, name, category, amount, desc in default_catalog:
        existing = FeeCatalog.query.filter_by(code=code).first()
        if not existing:
            item = FeeCatalog(
                code=code,
                name=name,
                category=category,
                standard_amount=amount,
                description=desc,
            )
            db.session.add(item)

    db.session.commit()

    # 2. Initialize accounts and sample invoices for students
    students = Student.query.all()
    accounts_created = 0
    invoices_created = 0

    catalog_dict = {f.code: f for f in FeeCatalog.query.all()}

    for s in students:
        account = StudentFeeAccount.query.filter_by(student_id=s.id).first()
        if not account:
            account_num = f"ACC-{s.department.code if s.department else 'GEN'}-{s.student_code}"
            account = StudentFeeAccount(
                student_id=s.id,
                account_number=account_num,
                currency="USD",
                total_billed=Decimal("0.00"),
                total_paid=Decimal("0.00"),
                current_balance=Decimal("0.00"),
                account_status=AccountStatus.ACTIVE.value,
                last_billing_date=date.today(),
            )
            db.session.add(account)
            db.session.flush()
            accounts_created += 1

            # Create initial semester tuition invoice for the student
            is_phd = s.program and "PhD" in s.program.name
            tuition_code = "TUITION_PHD" if is_phd else "TUITION_MS"
            tuition_item = catalog_dict.get(tuition_code)

            tuition_amt = tuition_item.standard_amount if tuition_item else Decimal("3000.00")
            lab_amt = catalog_dict.get("LAB_BENCH_FEE").standard_amount if "LAB_BENCH_FEE" in catalog_dict else Decimal("750.00")
            tech_amt = catalog_dict.get("TECH_LIBRARY_FEE").standard_amount if "TECH_LIBRARY_FEE" in catalog_dict else Decimal("250.00")

            total_inv_amount = Decimal(tuition_amt) + Decimal(lab_amt) + Decimal(tech_amt)
            inv_number = f"INV-{s.student_code}-S{s.current_semester}"

            # Semi-random payments to give realistic variety
            # 60% of students have paid, 25% partially paid, 15% pending
            paid_seed = Decimal("0.00")
            inv_status = InvoiceStatus.PENDING.value
            if s.id % 3 == 0:
                paid_seed = total_inv_amount
                inv_status = InvoiceStatus.PAID.value
            elif s.id % 3 == 1:
                paid_seed = Decimal(tuition_amt)
                inv_status = InvoiceStatus.PARTIALLY_PAID.value

            invoice = Invoice(
                invoice_number=inv_number,
                account_id=account.id,
                student_id=s.id,
                issue_date=date.today() - timedelta(days=60),
                due_date=date.today() + timedelta(days=30),
                subtotal=total_inv_amount,
                tax_or_waiver=Decimal("0.00"),
                total_amount=total_inv_amount,
                amount_paid=paid_seed,
                status=inv_status,
                notes=f"Semester {s.current_semester} Academic Tuition and Research Fees",
            )
            db.session.add(invoice)
            db.session.flush()

            # Add normalized line items (1NF)
            line1 = InvoiceItem(
                invoice_id=invoice.id,
                fee_catalog_id=tuition_item.id if tuition_item else None,
                item_description=f"Semester {s.current_semester} Research Tuition",
                quantity=1,
                unit_price=tuition_amt,
                line_total=tuition_amt,
            )
            line2 = InvoiceItem(
                invoice_id=invoice.id,
                fee_catalog_id=catalog_dict.get("LAB_BENCH_FEE").id if "LAB_BENCH_FEE" in catalog_dict else None,
                item_description="Specialized Lab Computing & Consumables Fee",
                quantity=1,
                unit_price=lab_amt,
                line_total=lab_amt,
            )
            line3 = InvoiceItem(
                invoice_id=invoice.id,
                fee_catalog_id=catalog_dict.get("TECH_LIBRARY_FEE").id if "TECH_LIBRARY_FEE" in catalog_dict else None,
                item_description="Digital Library & Research Database Access",
                quantity=1,
                unit_price=tech_amt,
                line_total=tech_amt,
            )
            db.session.add_all([line1, line2, line3])

            account.total_billed = total_inv_amount
            account.total_paid = paid_seed
            account.current_balance = total_inv_amount - paid_seed
            if account.current_balance <= 0:
                account.account_status = AccountStatus.CLEARANCE_GRANTED.value
            else:
                account.account_status = AccountStatus.ACTIVE.value

            # If paid_seed > 0, insert an initial successful transaction
            if paid_seed > 0:
                tx = BillingTransaction(
                    transaction_ref=f"TXN-INIT-{uuid.uuid4().hex[:8].upper()}",
                    account_id=account.id,
                    invoice_id=invoice.id,
                    student_id=s.id,
                    transaction_type=TransactionType.PAYMENT.value,
                    payment_method=PaymentMethod.BANK_TRANSFER.value,
                    amount=paid_seed,
                    status="SUCCESS",
                    acid_phase="COMMITTED",
                    created_at=datetime.utcnow() if hasattr(datetime, "utcnow") else datetime.now(),
                )
                db.session.add(tx)

            invoices_created += 1

    db.session.commit()
    return {"accounts_created": accounts_created, "invoices_created": invoices_created}


def create_invoice_transactional(student_id, items, semester_id=None, notes=None, due_days=30):
    """
    ACID Transaction: Creates an invoice with line items and atomically updates the fee account.
    """
    student = db.session.get(Student, student_id)
    if not student:
        raise ValueError(f"Student with ID {student_id} not found.")

    account = StudentFeeAccount.query.filter_by(student_id=student.id).with_for_update().first()
    if not account:
        raise ValueError("Student fee account not found.")

    subtotal = Decimal("0.00")
    for itm in items:
        qty = Decimal(str(itm.get("quantity", 1)))
        price = Decimal(str(itm.get("unit_price", 0.0)))
        subtotal += (qty * price)

    if subtotal <= 0:
        raise ValueError("Invoice total must be greater than zero.")

    inv_count = Invoice.query.filter_by(student_id=student.id).count()
    inv_number = f"INV-{student.student_code}-{inv_count + 1:03d}"

    invoice = Invoice(
        invoice_number=inv_number,
        account_id=account.id,
        student_id=student.id,
        semester_id=semester_id,
        issue_date=date.today(),
        due_date=date.today() + timedelta(days=due_days),
        subtotal=subtotal,
        tax_or_waiver=Decimal("0.00"),
        total_amount=subtotal,
        amount_paid=Decimal("0.00"),
        status=InvoiceStatus.PENDING.value,
        notes=notes or "Institutional tuition and research assessment",
    )
    db.session.add(invoice)
    db.session.flush()

    for itm in items:
        qty = int(itm.get("quantity", 1))
        price = Decimal(str(itm.get("unit_price", 0.0)))
        line = InvoiceItem(
            invoice_id=invoice.id,
            fee_catalog_id=itm.get("fee_catalog_id"),
            item_description=itm.get("item_description", "Fee Item"),
            quantity=qty,
            unit_price=price,
            line_total=Decimal(qty) * price,
        )
        db.session.add(line)

    account.total_billed += subtotal
    account.current_balance += subtotal
    account.account_status = AccountStatus.ACTIVE.value
    account.last_billing_date = date.today()

    db.session.commit()
    return invoice


def execute_acid_payment(
    student_id,
    invoice_id,
    amount,
    payment_method="BANK_TRANSFER",
    user_id=None,
    simulate_failure=False,
    failure_stage="AFTER_DEBIT"
):
    """
    Executes an ACID-compliant Billing Transaction demonstrating:
    - Atomicity: All 5 steps persist or none do.
    - Consistency: Ledger invariants (total_paid + current_balance == total_billed).
    - Isolation: SELECT ... FOR UPDATE prevents double-spending / race conditions.
    - Durability: WAL commitment upon session.commit().
    """
    amount = Decimal(str(amount))
    if amount <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than zero.")

    txn_ref = f"TXN-{uuid.uuid4().hex[:10].upper()}"
    step_trace = []

    try:
        # STEP 1: BEGIN TRANSACTION & ROW-LEVEL LOCKING (ISOLATION)
        step_trace.append({"step": 1, "name": "ACID BEGIN & ISOLATION LOCK", "detail": "Row-level lock acquired via SELECT ... FOR UPDATE"})
        account = StudentFeeAccount.query.filter_by(student_id=student_id).with_for_update().first()
        if not account:
            raise ValueError(f"Student fee account for student_id {student_id} not found.")

        invoice = Invoice.query.filter_by(id=invoice_id, student_id=student_id).with_for_update().first()
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found for student.")

        if invoice.status == InvoiceStatus.PAID.value:
            raise ValueError("This invoice is already fully paid.")

        remaining = invoice.remaining_balance
        if amount > Decimal(str(remaining)) + Decimal("0.01"):
            raise ValueError(f"Payment amount (${amount}) exceeds remaining invoice balance (${remaining}).")

        # STEP 2: STAGE TRANSACTION RECORD (VALIDATED)
        step_trace.append({"step": 2, "name": "RECORD TRANSACTION LOG", "detail": f"Generated reference {txn_ref} with amount ${amount}"})
        txn = BillingTransaction(
            transaction_ref=txn_ref,
            account_id=account.id,
            invoice_id=invoice.id,
            student_id=student_id,
            transaction_type=TransactionType.PAYMENT.value,
            payment_method=payment_method,
            amount=amount,
            status="SUCCESS",
            executed_by_user_id=user_id,
            acid_phase="EXECUTING",
        )
        db.session.add(txn)
        db.session.flush()

        # STEP 3: UPDATE INVOICE BALANCE & STATUS
        step_trace.append({"step": 3, "name": "APPLY INVOICE SETTLEMENT", "detail": f"Crediting invoice {invoice.invoice_number} by ${amount}"})
        invoice.amount_paid += amount
        if invoice.amount_paid >= invoice.total_amount:
            invoice.status = InvoiceStatus.PAID.value
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID.value

        # STEP 4: UPDATE STUDENT LEDGER ACCOUNT (CONSISTENCY)
        step_trace.append({"step": 4, "name": "UPDATE LEDGER BALANCE", "detail": f"Deducting balance on account {account.account_number}"})
        account.total_paid += amount
        account.current_balance -= amount
        if account.current_balance <= Decimal("0.00"):
            account.account_status = AccountStatus.CLEARANCE_GRANTED.value

        # SIMULATE ACID FAILURE / ROLLBACK (IF REQUESTED)
        if simulate_failure:
            step_trace.append({"step": 4.5, "name": "TRIGGER SIMULATED FAILURE", "detail": "Interrupted by simulated banking gateway timeout / system crash"})
            raise TransactionRollbackException("ACID DEMO EXCEPTION: Simulated bank gateway rejection occurred. Executing atomic ROLLBACK.")

        # STEP 5: COMMIT (DURABILITY)
        txn.acid_phase = "COMMITTED"
        db.session.commit()
        step_trace.append({"step": 5, "name": "ACID COMMIT", "detail": "Changes written to disk and WAL. Atomicity achieved."})

        return {
            "success": True,
            "status": "COMMITTED",
            "transaction_ref": txn_ref,
            "amount": float(amount),
            "invoice_number": invoice.invoice_number,
            "invoice_status": invoice.status,
            "account_new_balance": float(account.current_balance),
            "step_trace": step_trace,
            "message": "Payment processed successfully under ACID transaction protection.",
        }

    except Exception as e:
        # ATOMIC ROLLBACK
        db.session.rollback()
        step_trace.append({
            "step": 6,
            "name": "ACID ROLLBACK",
            "detail": f"Transaction rolled back. No partial debits persisted. Cause: {str(e)}"
        })

        # Record a separate failed audit transaction record to preserve visibility of the failure
        try:
            failed_txn = BillingTransaction(
                transaction_ref=f"{txn_ref}-FAILED",
                account_id=account.id if 'account' in locals() and account else 1,
                invoice_id=invoice_id,
                student_id=student_id,
                transaction_type=TransactionType.PAYMENT.value,
                payment_method=payment_method,
                amount=amount,
                status="ROLLED_BACK",
                failure_reason=str(e),
                acid_phase="ROLLED_BACK",
            )
            db.session.add(failed_txn)
            db.session.commit()
        except Exception:
            db.session.rollback()

        return {
            "success": False,
            "status": "ROLLED_BACK",
            "transaction_ref": txn_ref,
            "amount": float(amount),
            "error": str(e),
            "step_trace": step_trace,
            "message": "Transaction safely rolled back due to error. Database state preserved.",
        }
