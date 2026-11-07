import { api } from "./client";
import type {
  AppNotification,
  AuditLogEntry,
  AuthUser,
  DashboardCharts,
  DashboardSummary,
  FilterOptions,
  ManagedUser,
  PaginatedResponse,
  Publication,
  PublicationInput,
  ProgressWeights,
  StudentDetail,
  StudentFilters,
  StudentSummary,
  Submission,
  SubmissionInput,
  BillingSummary,
  FeeCatalogItem,
  StudentFeeAccount,
  Invoice,
  BillingTransaction,
  ACIDPaymentResult,
  DBMSOverview,
  DBMSViewData,
  DBMSTriggerData,
} from "@/types";

export async function login(email: string, password: string) {
  const { data } = await api.post<{
    access_token: string;
    refresh_token: string;
    user: AuthUser;
  }>("/auth/login", { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<AuthUser>("/auth/me");
  return data;
}

export async function fetchDashboardSummary(filters: StudentFilters) {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary", { params: filters });
  return data;
}

export async function fetchDashboardCharts(filters: StudentFilters) {
  const { data } = await api.get<DashboardCharts>("/dashboard/charts", { params: filters });
  return data;
}

export async function fetchStudents(filters: StudentFilters) {
  const { data } = await api.get<PaginatedResponse<StudentSummary>>("/students", { params: filters });
  return data;
}

export async function fetchStudentDetail(id: number) {
  const { data } = await api.get<StudentDetail>(`/students/${id}`);
  return data;
}

export async function fetchFilterOptions() {
  const { data } = await api.get<FilterOptions>("/meta/filters");
  return data;
}

const REPORT_FILENAMES: Record<string, string> = {
  "students.csv": "students_report.csv",
  "students.xlsx": "students_report.xlsx",
  "students.pdf": "students_report.pdf",
  "at-risk.pdf": "at_risk_report.pdf",
};

// Report endpoints require the JWT, so a plain <a href> won't carry auth —
// fetch as a blob through the authenticated axios instance and trigger the
// browser's save dialog manually.
export async function downloadReport(
  kind: "students.csv" | "students.xlsx" | "students.pdf" | "at-risk.pdf",
  filters: StudentFilters
) {
  const response = await api.get(`/reports/${kind}`, {
    params: filters,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = REPORT_FILENAMES[kind] || kind;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---- Publications ----
export async function fetchPublications(studentId?: number, page = 1) {
  const { data } = await api.get<PaginatedResponse<Publication>>("/publications", {
    params: { student_id: studentId, page, page_size: 20 },
  });
  return data;
}

export async function createPublication(input: PublicationInput) {
  const { data } = await api.post<Publication>("/publications", input);
  return data;
}

export async function updatePublication(id: number, input: Partial<PublicationInput>) {
  const { data } = await api.put<Publication>(`/publications/${id}`, input);
  return data;
}

export async function deletePublication(id: number) {
  await api.delete(`/publications/${id}`);
}

// ---- Submissions ----
export async function fetchSubmissions(studentId?: number, page = 1) {
  const { data } = await api.get<PaginatedResponse<Submission>>("/submissions", {
    params: { student_id: studentId, page, page_size: 20 },
  });
  return data;
}

export async function fetchOverdueSubmissions() {
  const { data } = await api.get<{ items: Submission[]; total: number }>("/submissions", {
    params: { overdue: "true" },
  });
  return data;
}

export async function createSubmission(input: SubmissionInput) {
  const { data } = await api.post<Submission>("/submissions", input);
  return data;
}

export async function updateSubmission(id: number, input: Partial<SubmissionInput>) {
  const { data } = await api.put<Submission>(`/submissions/${id}`, input);
  return data;
}

export async function addSubmissionRemark(id: number, remark: string, decision?: string) {
  const { data } = await api.post<Submission>(`/submissions/${id}/remarks`, { remark, decision });
  return data;
}

// ---- Notifications ----
export async function fetchNotifications() {
  const { data } = await api.get<AppNotification[]>("/notifications");
  return data;
}

export async function markNotificationRead(id: number) {
  const { data } = await api.post<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function fetchAuditLogs() {
  const { data } = await api.get<AuditLogEntry[]>("/notifications/audit-logs");
  return data;
}

// ---- Users (admin settings) ----
export async function fetchUsers(page = 1) {
  const { data } = await api.get<PaginatedResponse<ManagedUser>>("/users", { params: { page, page_size: 50 } });
  return data;
}

export async function createManagedUser(input: { email: string; full_name: string; role: string; password: string }) {
  const { data } = await api.post<ManagedUser>("/users", input);
  return data;
}

export async function toggleUserStatus(id: number, is_active: boolean) {
  const { data } = await api.put<ManagedUser>(`/users/${id}/status`, { is_active });
  return data;
}

// ---- Progress weights ----
export async function fetchProgressWeights() {
  const { data } = await api.get<ProgressWeights>("/progress/weights");
  return data;
}

export async function updateProgressWeights(input: Omit<ProgressWeights, "id" | "is_active">) {
  const { data } = await api.put<ProgressWeights>("/progress/weights", input);
  return data;
}

export async function recomputeAllProgress() {
  const { data } = await api.post<{ message: string }>("/progress/recompute-all");
  return data;
}

// ==========================================
// Billing & ACID Transactions
// ==========================================

export async function fetchBillingSummary() {
  const { data } = await api.get<BillingSummary>("/billing/summary");
  return data;
}

export async function fetchFeeCatalog() {
  const { data } = await api.get<FeeCatalogItem[]>("/billing/catalog");
  return data;
}

export async function fetchBillingAccounts(params?: { search?: string; status?: string; page?: number; per_page?: number }) {
  const { data } = await api.get<PaginatedResponse<StudentFeeAccount>>("/billing/accounts", { params });
  return data;
}

export async function fetchBillingAccountDetail(studentId: number) {
  const { data } = await api.get<{
    account: StudentFeeAccount;
    invoices: Invoice[];
    transactions: BillingTransaction[];
  }>(`/billing/accounts/${studentId}`);
  return data;
}

export async function fetchInvoices(params?: { status?: string; student_id?: number }) {
  const { data } = await api.get<Invoice[]>("/billing/invoices", { params });
  return data;
}

export async function createInvoice(input: {
  student_id: number;
  items: Array<{ item_description: string; quantity: number; unit_price: number; fee_catalog_id?: number }>;
  semester_id?: number;
  notes?: string;
  due_days?: number;
}) {
  const { data } = await api.post<Invoice>("/billing/invoices", input);
  return data;
}

export async function processPayment(input: {
  student_id: number;
  invoice_id: number;
  amount: number;
  payment_method?: string;
  simulate_failure?: boolean;
}) {
  const { data } = await api.post<ACIDPaymentResult>("/billing/pay", input);
  return data;
}

export async function fetchBillingTransactions(limit = 50) {
  const { data } = await api.get<BillingTransaction[]>("/billing/transactions", { params: { limit } });
  return data;
}

// ==========================================
// DBMS Concepts: Triggers, Views, Normalization
// ==========================================

export async function fetchDBMSOverview() {
  const { data } = await api.get<DBMSOverview>("/dbms/overview");
  return data;
}

export async function fetchDBMSView(viewName: string, limit = 50) {
  const { data } = await api.get<DBMSViewData>(`/dbms/views/${viewName}`, { params: { limit } });
  return data;
}

export async function fetchDBMSTriggers() {
  const { data } = await api.get<DBMSTriggerData>("/dbms/triggers");
  return data;
}

export async function testDBMSTrigger(input: { student_id?: number; test_action?: string }) {
  const { data } = await api.post<any>("/dbms/test-trigger", input);
  return data;
}

export async function testDBMSTransaction(input: { student_id?: number; simulate_failure?: boolean; amount?: number }) {
  const { data } = await api.post<ACIDPaymentResult>("/dbms/test-transaction", input);
  return data;
}

export async function fetchDBMSSchemaAnalysis() {
  const { data } = await api.get<any>("/dbms/schema-analysis");
  return data;
}
