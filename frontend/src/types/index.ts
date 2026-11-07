export type Role = "admin" | "coordinator" | "supervisor" | "student";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  supervisor_id: number | null;
  student_id: number | null;
}

export interface StudentSummary {
  id: number;
  student_code: string;
  full_name: string;
  email: string;
  program: string | null;
  program_level: "phd" | "masters" | null;
  department: string | null;
  batch_year: number;
  current_semester: number;
  supervisor: string | null;
  enrollment_status: "active" | "on_leave" | "suspended" | "completed" | "withdrawn";
  overall_progress: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  paper_count: number;
  pending_tasks: number;
}

export interface StudentDetail extends StudentSummary {
  admission_date: string | null;
  expected_completion_date: string | null;
  total_semesters: number | null;
  semesters: SemesterRecord[];
  research_profile: ResearchProfile | null;
  publications: Publication[];
  submissions: Submission[];
  evaluations: ProgressEvaluation[];
}

export interface SemesterRecord {
  id: number;
  semester_number: number;
  cgpa: number | null;
  credits_completed: number | null;
  status: string;
}

export interface ResearchProfile {
  id: number;
  research_topic: string | null;
  research_area: string | null;
  proposal_status: string | null;
  comprehensive_exam_status: string | null;
  thesis_status: string | null;
  milestones?: ResearchMilestone[];
}

export interface ResearchMilestone {
  id: number;
  title: string;
  due_date: string | null;
  completed_date: string | null;
  status: string;
}

export interface Publication {
  id: number;
  student_id: number;
  title: string;
  pub_type: string;
  venue: string | null;
  status: string;
  submission_date: string | null;
  acceptance_date: string | null;
  publication_date: string | null;
  doi: string | null;
  url: string | null;
  authors?: string[];
}

export interface Submission {
  id: number;
  student_id: number;
  name: string;
  category: string;
  deadline: string | null;
  submitted_date: string | null;
  status: "pending" | "submitted" | "under_review" | "approved" | "rejected" | "overdue";
  document_link: string | null;
  reviewer: string | null;
  is_overdue: boolean;
  remarks: string[];
}

export interface ProgressEvaluation {
  id: number;
  academic_score: number;
  research_score: number;
  milestone_score: number;
  publication_score: number;
  submission_score: number;
  overall_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_reasons: string[];
  evaluated_at: string;
}

export interface DashboardSummary {
  total_students: number;
  phd_students: number;
  masters_students: number;
  active_students: number;
  at_risk_students: number;
  average_progress: number;
  total_papers: number;
  pending_submissions: number;
}

export interface ChartPoint {
  name: string;
  value: number;
}

export interface DashboardCharts {
  students_by_program: ChartPoint[];
  students_by_semester: ChartPoint[];
  publication_status: ChartPoint[];
  progress_distribution: ChartPoint[];
  risk_distribution: ChartPoint[];
  department_research_output: ChartPoint[];
}

export interface FilterOptions {
  departments: { id: number; name: string; code: string }[];
  programs: { id: number; name: string; level: string; total_semesters: number }[];
  supervisors: { id: number; full_name: string; department_id: number }[];
  batch_years: number[];
  semesters: number[];
  statuses: string[];
}

export interface StudentFilters {
  department_id?: number;
  program_id?: number;
  supervisor_id?: number;
  batch_year?: number;
  semester?: number;
  status?: string;
  min_progress?: number;
  max_progress?: number;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: number;
  user: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export interface ManagedUser {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface ProgressWeights {
  id: number;
  name: string;
  academic_weight: number;
  research_weight: number;
  milestone_weight: number;
  publication_weight: number;
  submission_weight: number;
  is_active: boolean;
}

export interface PublicationInput {
  student_id: number;
  title: string;
  pub_type: string;
  venue?: string | null;
  status: string;
  submission_date?: string | null;
  acceptance_date?: string | null;
  publication_date?: string | null;
  doi?: string | null;
  url?: string | null;
  authors?: string[];
}

export interface SubmissionInput {
  student_id: number;
  name: string;
  category: string;
  deadline: string;
  submitted_date?: string | null;
  status: string;
  document_link?: string | null;
  reviewer_id?: number | null;
}

// ==========================================
// DBMS Concepts & Billing Types
// ==========================================

export interface FeeCatalogItem {
  id: number;
  code: string;
  name: string;
  category: string;
  standard_amount: number;
  description: string | null;
}

export interface StudentFeeAccount {
  id: number;
  student_id: number;
  student_code: string | null;
  student_name: string | null;
  department: string | null;
  program: string | null;
  account_number: string;
  currency: string;
  total_billed: number;
  total_paid: number;
  current_balance: number;
  account_status: "ACTIVE" | "PAST_DUE" | "CLEARANCE_GRANTED" | "FINANCIAL_HOLD";
  last_billing_date: string | null;
  invoices_count: number;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  fee_catalog_id: number | null;
  item_description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  account_id: number;
  student_id: number;
  student_code: string | null;
  student_name: string | null;
  semester_number: number | null;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_or_waiver: number;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  notes: string | null;
  created_at: string | null;
  items?: InvoiceItem[];
}

export interface BillingTransaction {
  id: number;
  transaction_ref: string;
  account_id: number;
  invoice_id: number | null;
  invoice_number: string | null;
  student_id: number;
  student_code: string | null;
  student_name: string | null;
  transaction_type: string;
  payment_method: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "ROLLED_BACK" | "PENDING";
  failure_reason: string | null;
  acid_phase: string;
  executed_by: string;
  created_at: string;
}

export interface BillingSummary {
  total_billed: number;
  total_paid: number;
  outstanding_balance: number;
  total_accounts: number;
  unpaid_invoices: number;
  paid_invoices: number;
}

export interface ACIDPaymentResult {
  success: boolean;
  status: "COMMITTED" | "ROLLED_BACK";
  transaction_ref: string;
  amount: number;
  invoice_number?: string;
  invoice_status?: string;
  account_new_balance?: number;
  step_trace: Array<{ step: number; name: string; detail: string }>;
  message: string;
  error?: string;
}

export interface DBMSOverview {
  database_engine: string;
  database_version: string;
  concepts: {
    normalization: {
      level: string;
      total_tables: number;
      key_entities: string[];
    };
    triggers: {
      active_triggers_count: number;
      monitored_tables: string[];
      trigger_function: string;
      trigger_logs_generated: number;
      total_audit_logs: number;
    };
    views: {
      registered_views: string[];
      purpose: string;
      roles_covered: string[];
    };
    transactions: {
      engine: string;
      total_transactions_executed: number;
      acid_properties: {
        Atomicity: string;
        Consistency: string;
        Isolation: string;
        Durability: string;
      };
    };
  };
  all_tables: string[];
  all_views: string[];
}

export interface DBMSViewData {
  view_name: string;
  columns: string[];
  row_count: number;
  data: Record<string, any>[];
  sql_definition: string;
}

export interface DBMSTriggerData {
  is_postgres: boolean;
  triggers: Array<{
    trigger_name: string;
    event: string;
    table: string;
    timing: string;
    statement: string;
    status: string;
  }>;
  recent_audit_logs: Array<{
    id: number;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    details: string | null;
    created_at: string | null;
  }>;
}
