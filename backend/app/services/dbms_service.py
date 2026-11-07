import json
from datetime import datetime
from sqlalchemy import text
from app.extensions import db


# SQL DDL for PostgreSQL Triggers on key business entities
PG_TRIGGER_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION fn_audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR(100);
    v_entity_type VARCHAR(100);
    v_entity_id INTEGER;
    v_details TEXT;
    v_user_name VARCHAR(100) := 'DB_TRIGGER_SYSTEM';
BEGIN
    v_entity_type := TG_TABLE_NAME;
    v_action := 'DB_TRIGGER: ' || TG_OP || ' ON ' || TG_TABLE_NAME;
    
    IF (TG_OP = 'DELETE') THEN
        v_entity_id := OLD.id;
        v_details := json_build_object(
            'trigger_engine', 'PostgreSQL_PLpgSQL',
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'executed_at', NOW()::text,
            'old_values', row_to_json(OLD)
        )::text;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_entity_id := NEW.id;
        v_details := json_build_object(
            'trigger_engine', 'PostgreSQL_PLpgSQL',
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'executed_at', NOW()::text,
            'old_values', row_to_json(OLD),
            'new_values', row_to_json(NEW)
        )::text;
    ELSIF (TG_OP = 'INSERT') THEN
        v_entity_id := NEW.id;
        v_details := json_build_object(
            'trigger_engine', 'PostgreSQL_PLpgSQL',
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'executed_at', NOW()::text,
            'new_values', row_to_json(NEW)
        )::text;
    END IF;

    INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
    VALUES (v_action, v_entity_type, v_entity_id, v_details, NOW());

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
"""

TRIGGER_DEFINITIONS = [
    ("trg_audit_students", "students", "AFTER INSERT OR UPDATE OR DELETE"),
    ("trg_audit_submissions", "submissions", "AFTER INSERT OR UPDATE OR DELETE"),
    ("trg_audit_milestones", "research_milestones", "AFTER INSERT OR UPDATE OR DELETE"),
    ("trg_audit_invoices", "invoices", "AFTER INSERT OR UPDATE OR DELETE"),
    ("trg_audit_billing_transactions", "billing_transactions", "AFTER INSERT OR UPDATE OR DELETE"),
]

# SQL DDL for Role-Based Access Views
VIEW_DEFINITIONS = {
    "view_student_role_access": """
    CREATE OR REPLACE VIEW view_student_role_access AS
    SELECT 
        s.id AS student_id,
        s.student_code,
        s.full_name,
        s.email,
        p.name AS program_name,
        p.level::text AS program_level,
        d.name AS department_name,
        s.current_semester,
        s.batch_year,
        s.enrollment_status::text AS enrollment_status,
        ROUND(COALESCE(s.cached_overall_progress, 0.0)::numeric, 1) AS overall_progress,
        COUNT(DISTINCT pub.id) AS total_publications,
        COUNT(DISTINCT m.id) AS total_milestones,
        COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) AS completed_milestones,
        COALESCE(fa.current_balance, 0.00) AS tuition_balance_due,
        COALESCE(fa.account_status, 'ACTIVE') AS billing_status
    FROM students s
    JOIN programs p ON s.program_id = p.id
    JOIN departments d ON s.department_id = d.id
    LEFT JOIN publications pub ON pub.student_id = s.id
    LEFT JOIN research_profiles rp ON rp.student_id = s.id
    LEFT JOIN research_milestones m ON m.research_profile_id = rp.id
    LEFT JOIN student_fee_accounts fa ON fa.student_id = s.id
    WHERE s.is_archived = FALSE
    GROUP BY s.id, s.student_code, s.full_name, s.email, p.name, p.level, d.name, s.current_semester, s.batch_year, s.enrollment_status, s.cached_overall_progress, fa.current_balance, fa.account_status;
    """,

    "view_supervisor_role_access": """
    CREATE OR REPLACE VIEW view_supervisor_role_access AS
    SELECT 
        ss.supervisor_id,
        sup.full_name AS supervisor_name,
        sup.email AS supervisor_email,
        s.id AS student_id,
        s.student_code,
        s.full_name AS student_name,
        d.name AS department_name,
        p.name AS program_name,
        s.current_semester,
        s.cached_risk_level AS risk_level,
        ROUND(COALESCE(s.cached_overall_progress, 0.0)::numeric, 1) AS overall_progress,
        rp.research_topic AS research_topic,
        rp.thesis_status::text AS thesis_status,
        COUNT(DISTINCT CASE WHEN sub.status::text ILIKE '%pending%' OR sub.status::text ILIKE '%review%' THEN sub.id END) AS pending_reviews_count,
        COUNT(DISTINCT pub.id) AS publication_count,
        MIN(CASE WHEN m.status != 'completed' AND m.due_date >= CURRENT_DATE THEN m.due_date END) AS next_milestone_deadline
    FROM student_supervisors ss
    JOIN supervisors sup ON ss.supervisor_id = sup.id
    JOIN students s ON ss.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    JOIN programs p ON s.program_id = p.id
    LEFT JOIN research_profiles rp ON rp.student_id = s.id
    LEFT JOIN submissions sub ON sub.student_id = s.id
    LEFT JOIN publications pub ON pub.student_id = s.id
    LEFT JOIN research_milestones m ON m.research_profile_id = rp.id
    WHERE s.is_archived = FALSE
    GROUP BY ss.supervisor_id, sup.full_name, sup.email, s.id, s.student_code, s.full_name, d.name, p.name, s.current_semester, s.cached_risk_level, s.cached_overall_progress, rp.research_topic, rp.thesis_status;
    """,

    "view_admin_role_access": """
    CREATE OR REPLACE VIEW view_admin_role_access AS
    SELECT 
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(DISTINCT s.id) AS total_enrolled_students,
        COUNT(DISTINCT CASE WHEN p.level = 'PHD' THEN s.id END) AS total_phd_candidates,
        COUNT(DISTINCT CASE WHEN p.level = 'MASTERS' THEN s.id END) AS total_masters_students,
        COUNT(DISTINCT CASE WHEN s.cached_risk_level = 'HIGH' THEN s.id END) AS high_risk_count,
        COUNT(DISTINCT CASE WHEN s.cached_risk_level = 'MEDIUM' THEN s.id END) AS medium_risk_count,
        ROUND(AVG(COALESCE(s.cached_overall_progress, 0.0))::numeric, 1) AS avg_department_progress,
        COUNT(DISTINCT pub.id) AS total_dept_publications,
        COALESCE(SUM(fa.total_billed), 0.00) AS dept_total_billed,
        COALESCE(SUM(fa.total_paid), 0.00) AS dept_total_paid,
        COALESCE(SUM(fa.current_balance), 0.00) AS dept_total_outstanding
    FROM departments d
    LEFT JOIN students s ON s.department_id = d.id AND s.is_archived = FALSE
    LEFT JOIN programs p ON s.program_id = p.id
    LEFT JOIN publications pub ON pub.student_id = s.id
    LEFT JOIN student_fee_accounts fa ON fa.student_id = s.id
    GROUP BY d.id, d.name, d.code;
    """,

    "view_billing_role_access": """
    CREATE OR REPLACE VIEW view_billing_role_access AS
    SELECT 
        fa.id AS account_id,
        fa.account_number,
        s.id AS student_id,
        s.student_code,
        s.full_name AS student_name,
        s.email AS student_email,
        d.name AS department_name,
        p.name AS program_name,
        fa.currency,
        fa.total_billed,
        fa.total_paid,
        fa.current_balance,
        fa.account_status,
        COUNT(DISTINCT inv.id) AS total_invoices_issued,
        COUNT(DISTINCT CASE WHEN inv.status IN ('PENDING', 'OVERDUE') THEN inv.id END) AS unpaid_invoices_count,
        MAX(tx.created_at) AS last_payment_date
    FROM student_fee_accounts fa
    JOIN students s ON fa.student_id = s.id
    JOIN departments d ON s.department_id = d.id
    JOIN programs p ON s.program_id = p.id
    LEFT JOIN invoices inv ON inv.account_id = fa.id
    LEFT JOIN billing_transactions tx ON tx.account_id = fa.id AND tx.status = 'SUCCESS'
    WHERE s.is_archived = FALSE
    GROUP BY fa.id, fa.account_number, s.id, s.student_code, s.full_name, s.email, d.name, p.name, fa.currency, fa.total_billed, fa.total_paid, fa.current_balance, fa.account_status;
    """
}


def install_dbms_components():
    """
    Installs triggers and views in PostgreSQL.
    """
    is_postgres = "postgres" in db.engine.dialect.name.lower()
    results = {"triggers_installed": [], "views_installed": [], "dialect": db.engine.dialect.name}

    if is_postgres:
        # 1. Install Trigger Function
        db.session.execute(text(PG_TRIGGER_FUNCTION_SQL))
        db.session.commit()

        # 2. Install each Trigger
        for trg_name, table_name, timing_event in TRIGGER_DEFINITIONS:
            drop_sql = f"DROP TRIGGER IF EXISTS {trg_name} ON {table_name};"
            create_sql = f"""
            CREATE TRIGGER {trg_name}
            {timing_event} ON {table_name}
            FOR EACH ROW
            EXECUTE FUNCTION fn_audit_log_trigger();
            """
            try:
                db.session.execute(text(drop_sql))
                db.session.execute(text(create_sql))
                db.session.commit()
                results["triggers_installed"].append(trg_name)
            except Exception as e:
                db.session.rollback()
                print(f"Warning installing trigger {trg_name}: {e}")

        # 3. Install Views
        for view_name, view_sql in VIEW_DEFINITIONS.items():
            try:
                db.session.execute(text(view_sql))
                db.session.commit()
                results["views_installed"].append(view_name)
            except Exception as e:
                db.session.rollback()
                print(f"Warning installing view {view_name}: {e}")

    return results


def get_view_data(view_name, limit=50):
    """
    Fetches live rows from the given database view.
    """
    if view_name not in VIEW_DEFINITIONS:
        raise ValueError(f"Unknown view: {view_name}")

    query = text(f"SELECT * FROM {view_name} LIMIT :limit")
    res = db.session.execute(query, {"limit": limit})
    columns = list(res.keys())
    rows = []
    for r in res:
        row_dict = {}
        for col in columns:
            val = getattr(r, col)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            elif isinstance(val, (int, float, str, bool)) or val is None:
                pass
            else:
                val = str(val)
            row_dict[col] = val
        rows.append(row_dict)

    return {
        "view_name": view_name,
        "columns": columns,
        "row_count": len(rows),
        "data": rows,
        "sql_definition": VIEW_DEFINITIONS[view_name].strip(),
    }


def get_active_triggers():
    """
    Returns list of active database triggers and recent audit log events produced by triggers.
    """
    is_postgres = "postgres" in db.engine.dialect.name.lower()
    triggers = []

    if is_postgres:
        sql = text("""
        SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_statement,
            action_timing
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'trg_audit_%'
        ORDER BY event_object_table;
        """)
        try:
            res = db.session.execute(sql)
            for r in res:
                triggers.append({
                    "trigger_name": r.trigger_name,
                    "event": r.event_manipulation,
                    "table": r.event_object_table,
                    "timing": r.action_timing,
                    "statement": r.action_statement,
                    "status": "ACTIVE_IN_POSTGRES",
                })
        except Exception as e:
            print("Error inspecting triggers:", e)

    # Fetch recent audit logs produced by DB triggers
    audit_sql = text("""
    SELECT id, action, entity_type, entity_id, details, created_at
    FROM audit_logs
    ORDER BY id DESC
    LIMIT 25;
    """)
    recent_logs = []
    try:
        res = db.session.execute(audit_sql)
        for r in res:
            recent_logs.append({
                "id": r.id,
                "action": r.action,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "details": r.details,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
    except Exception as e:
        print("Error fetching audit logs:", e)

    return {
        "is_postgres": is_postgres,
        "triggers": triggers,
        "recent_audit_logs": recent_logs,
    }


def test_trigger_firing(student_id=None, test_action="UPDATE_STUDENT_STATUS"):
    """
    Executes a real database DML action to demonstrate that PostgreSQL triggers
    fire automatically and append records to audit_logs without application code inserting to audit_logs.
    """
    from app.models.student import Student, EnrollmentStatus
    from app.models.research import ResearchMilestone, MilestoneStatus
    from datetime import date, timedelta

    if not student_id:
        st = Student.query.first()
        student_id = st.id if st else 1
    else:
        st = db.session.get(Student, student_id)

    if not st:
        raise ValueError(f"Student with id {student_id} not found.")

    old_log_count = db.session.execute(text("SELECT count(*) FROM audit_logs")).scalar() or 0
    test_result = {}

    if test_action == "UPDATE_STUDENT_STATUS":
        original_status = st.enrollment_status
        new_status = EnrollmentStatus.ON_LEAVE if original_status == EnrollmentStatus.ACTIVE else EnrollmentStatus.ACTIVE
        st.enrollment_status = new_status
        db.session.commit()

        test_result = {
            "action": "UPDATE_STUDENT_STATUS",
            "table": "students",
            "record_id": st.id,
            "field_changed": "enrollment_status",
            "old_value": original_status.value if hasattr(original_status, "value") else str(original_status),
            "new_value": new_status.value if hasattr(new_status, "value") else str(new_status),
        }

    elif test_action == "ADD_MILESTONE":
        rp = st.research_profile
        if not rp:
            from app.models.research import ResearchProfile
            rp = ResearchProfile(student_id=st.id, research_topic="Distributed DBMS Research")
            db.session.add(rp)
            db.session.flush()

        milestone = ResearchMilestone(
            research_profile_id=rp.id,
            title=f"Trigger Test Milestone - {datetime.now().strftime('%H:%M:%S')}",
            milestone_type="comprehensive_exam",
            due_date=date.today() + timedelta(days=90),
            status="in_progress",
            is_required=True,
        )
        db.session.add(milestone)
        db.session.commit()

        test_result = {
            "action": "INSERT_RESEARCH_MILESTONE",
            "table": "research_milestones",
            "record_id": milestone.id,
            "title": milestone.title,
        }

    # Fetch the newest log row created by the DB Trigger
    latest_log = db.session.execute(
        text("SELECT id, action, entity_type, entity_id, details, created_at FROM audit_logs ORDER BY id DESC LIMIT 1")
    ).fetchone()

    new_log_count = db.session.execute(text("SELECT count(*) FROM audit_logs")).scalar() or 0

    return {
        "test_executed": test_result,
        "old_audit_count": old_log_count,
        "new_audit_count": new_log_count,
        "trigger_fired_successfully": new_log_count > old_log_count,
        "generated_audit_entry": {
            "id": latest_log.id if latest_log else None,
            "action": latest_log.action if latest_log else None,
            "entity_type": latest_log.entity_type if latest_log else None,
            "entity_id": latest_log.entity_id if latest_log else None,
            "details": latest_log.details if latest_log else None,
            "created_at": latest_log.created_at.isoformat() if latest_log and latest_log.created_at else None,
        } if latest_log else None,
    }
