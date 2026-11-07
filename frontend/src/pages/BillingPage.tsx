import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Receipt,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  FileText,
  UserCheck,
} from "lucide-react";
import {
  fetchBillingSummary,
  fetchBillingAccounts,
  fetchInvoices,
  fetchBillingTransactions,
  createInvoice,
  processPayment,
} from "@/api/endpoints";
import type { StudentFeeAccount, Invoice } from "@/types";

export function BillingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"accounts" | "invoices" | "transactions">("accounts");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const page = 1;

  // Modals state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [acidTrace, setAcidTrace] = useState<any | null>(null);

  // New Invoice form state
  const [newInvStudentId, setNewInvStudentId] = useState<number>(1);
  const [newInvNotes, setNewInvNotes] = useState("");
  const newInvDueDays = 30;
  const [newInvItems, setNewInvItems] = useState<Array<{ fee_catalog_id?: number; item_description: string; quantity: number; unit_price: number }>>([
    { item_description: "Doctoral Supervision & Research Fee", quantity: 1, unit_price: 3500 },
  ]);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: fetchBillingSummary,
  });

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["billing-accounts", searchTerm, statusFilter, page],
    queryFn: () => fetchBillingAccounts({ search: searchTerm, status: statusFilter, page, per_page: 15 }),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => fetchInvoices(),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["billing-transactions"],
    queryFn: () => fetchBillingTransactions(50),
  });

  // Mutations
  const payMutation = useMutation({
    mutationFn: processPayment,
    onSuccess: (data) => {
      setAcidTrace(data);
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-transactions"] });
    },
    onError: (err: any) => {
      const errData = err.response?.data;
      if (errData && errData.step_trace) {
        setAcidTrace(errData);
      } else {
        alert(err.message || "Payment failed");
      }
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      setIsInvoiceModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || "Failed to create invoice");
    },
  });

  const handleOpenPayModal = (studentId: number, invoiceId?: number, remainingAmt?: number) => {
    setSelectedStudentId(studentId);
    setSelectedInvoiceId(invoiceId ?? null);
    setPayAmount(remainingAmt ? String(remainingAmt) : "500.00");
    setSimulateFailure(false);
    setAcidTrace(null);
    setIsPayModalOpen(true);
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedInvoiceId || !payAmount) return;
    payMutation.mutate({
      student_id: selectedStudentId,
      invoice_id: selectedInvoiceId,
      amount: parseFloat(payAmount),
      payment_method: paymentMethod,
      simulate_failure: simulateFailure,
    });
  };

  const handleAddInvoiceItem = () => {
    setNewInvItems([...newInvItems, { item_description: "Lab Consumables & High-Performance Computing", quantity: 1, unit_price: 750 }]);
  };

  const handleRemoveInvoiceItem = (idx: number) => {
    setNewInvItems(newInvItems.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tuition & Research Billing Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Demonstrating relational 3NF normalization and PostgreSQL ACID transactions for billing.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Plus className="h-4 w-4" /> Issue Invoice
          </button>
          <button
            onClick={() => handleOpenPayModal(accountsData?.items[0]?.student_id || 1)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
          >
            <CreditCard className="h-4 w-4" /> ACID Payment Lab
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Invoiced
            </span>
            <span className="rounded-full bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            ${summaryLoading ? "..." : (summary?.total_billed ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">Academic tuition, lab fees, viva defense</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payments Collected
            </span>
            <span className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${summaryLoading ? "..." : (summary?.total_paid ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">ACID committed transactions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outstanding Balance
            </span>
            <span className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            ${summaryLoading ? "..." : (summary?.outstanding_balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-slate-400">Pending clearance across {summary?.total_accounts ?? 0} scholars</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Unpaid Invoices
            </span>
            <span className="rounded-full bg-rose-100 p-2 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summaryLoading ? "..." : summary?.unpaid_invoices ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-400">Requires settlement before thesis submission</p>
        </div>
      </div>

      {/* ACID Explanation Callout */}
      <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
          <div className="text-sm">
            <p className="font-semibold text-brand-900 dark:text-brand-200">
              DBMS ACID Transaction Architecture in Billing
            </p>
            <p className="mt-0.5 text-brand-700 dark:text-brand-300">
              Payments execute within atomic blocks (<code className="rounded bg-brand-100 px-1 py-0.5 text-xs font-mono dark:bg-brand-900/60">db.session.begin_nested()</code>). 
              Row-level locks (<code className="rounded bg-brand-100 px-1 py-0.5 text-xs font-mono dark:bg-brand-900/60">SELECT ... FOR UPDATE</code>) ensure Isolation against concurrent race conditions, while CHECK constraints preserve Consistency. If any step fails, an automatic <strong>ROLLBACK</strong> occurs.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "accounts"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <UserCheck className="h-4 w-4" /> Student Fee Accounts
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "invoices"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="h-4 w-4" /> Invoices & Fee Statements
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "transactions"
              ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <CreditCard className="h-4 w-4" /> ACID Transaction History
        </button>
      </div>

      {/* Tab 1: Student Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholar or account number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="">All Account Statuses</option>
              <option value="ACTIVE">Active (Balance Due)</option>
              <option value="CLEARANCE_GRANTED">Clearance Granted (Paid)</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="FINANCIAL_HOLD">Financial Hold</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Account #</th>
                  <th className="px-4 py-3">Scholar</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Total Billed</th>
                  <th className="px-4 py-3">Total Paid</th>
                  <th className="px-4 py-3">Current Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {accountsLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading billing accounts...</td>
                  </tr>
                ) : accountsData?.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No student fee accounts found.</td>
                  </tr>
                ) : (
                  accountsData?.items.map((acc: StudentFeeAccount) => (
                    <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {acc.account_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div>{acc.student_name}</div>
                        <div className="text-xs text-slate-400">{acc.student_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {acc.department || "General"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono">
                        ${acc.total_billed.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono">
                        ${acc.total_paid.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-900 dark:text-slate-100">
                        ${acc.current_balance.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            acc.account_status === "CLEARANCE_GRANTED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : acc.account_status === "PAST_DUE"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {acc.account_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenPayModal(acc.student_id, undefined, acc.current_balance)}
                          disabled={acc.current_balance <= 0}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold shadow-sm transition-colors ${
                            acc.current_balance <= 0
                              ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                              : "bg-brand-600 text-white hover:bg-brand-500"
                          }`}
                        >
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Invoices */}
      {activeTab === "invoices" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Scholar</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoicesLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No invoices issued yet.</td>
                </tr>
              ) : (
                invoices?.map((inv: Invoice) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      <div>{inv.student_name}</div>
                      <div className="text-xs text-slate-400">{inv.student_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      Sem {inv.semester_number || 1}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {inv.due_date || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                      ${inv.amount_paid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      ${inv.remaining_balance.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : inv.status === "PARTIALLY_PAID"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status !== "PAID" && (
                        <button
                          onClick={() => handleOpenPayModal(inv.student_id, inv.id, inv.remaining_balance)}
                          className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-500"
                        >
                          Settle
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Transactions */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">ACID Transaction Ledger</h3>
              <p className="text-xs text-slate-400">
                Audited financial logs demonstrating ACID isolation and atomic state transitions in PostgreSQL.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Scholar</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">ACID Status</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {txLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">Loading transactions...</td>
                    </tr>
                  ) : transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">No transactions executed yet.</td>
                    </tr>
                  ) : (
                    transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tx.transaction_ref}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                          <div>{tx.student_name}</div>
                          <div className="text-xs text-slate-400">{tx.student_code}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {tx.transaction_type}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {tx.payment_method.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              tx.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {tx.status === "SUCCESS" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {tx.acid_phase}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACID Payment Lab Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">ACID Payment Execution Lab</h3>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleExecutePayment} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Select Invoice to Settle</label>
                <select
                  value={selectedInvoiceId || ""}
                  onChange={(e) => {
                    const invId = Number(e.target.value);
                    setSelectedInvoiceId(invId);
                    const inv = invoices?.find((i) => i.id === invId);
                    if (inv) {
                      setSelectedStudentId(inv.student_id);
                      setPayAmount(String(inv.remaining_balance));
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                  required
                >
                  <option value="">-- Choose Invoice --</option>
                  {invoices
                    ?.filter((i) => i.status !== "PAID")
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoice_number} ({i.student_name} - Balance: ${i.remaining_balance})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-800 dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                  >
                    <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="SCHOLARSHIP_GRANT">Scholarship / Fellowship</option>
                    <option value="CHEQUE">Institutional Cheque</option>
                  </select>
                </div>
              </div>

              {/* Simulate ACID Rollback Switch */}
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Simulate ACID Failure & Rollback
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                </div>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  When enabled, throws an exception midway through execution. Proves that PostgreSQL rolls back: no balances change and atomicity is preserved.
                </p>
              </div>

              {/* Live ACID Execution Trace Output */}
              {acidTrace && (
                <div
                  className={`rounded-xl border p-3.5 text-xs ${
                    acidTrace.success
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {acidTrace.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      )}
                      ACID Status: {acidTrace.status}
                    </span>
                    <span className="font-mono text-xs">{acidTrace.transaction_ref}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {acidTrace.step_trace?.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <span className="font-mono font-bold text-brand-600">[{step.step}]</span>
                        <div>
                          <span className="font-semibold">{step.name}:</span> {step.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
                >
                  {payMutation.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                  Execute Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Issue Fee Invoice (1NF Line Items)</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Scholar</label>
                <select
                  value={newInvStudentId}
                  onChange={(e) => setNewInvStudentId(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                >
                  {accountsData?.items.map((acc: StudentFeeAccount) => (
                    <option key={acc.student_id} value={acc.student_id}>
                      {acc.student_name} ({acc.student_code} - {acc.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-slate-500">Line Items (Decomposed)</label>
                  <button onClick={handleAddInvoiceItem} className="text-xs font-semibold text-brand-600 hover:underline">
                    + Add Fee Line
                  </button>
                </div>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {newInvItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.item_description}
                        onChange={(e) => {
                          const updated = [...newInvItems];
                          updated[idx].item_description = e.target.value;
                          setNewInvItems(updated);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => {
                          const updated = [...newInvItems];
                          updated[idx].unit_price = parseFloat(e.target.value) || 0;
                          setNewInvItems(updated);
                        }}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono dark:border-slate-800 dark:bg-slate-800"
                      />
                      {newInvItems.length > 1 && (
                        <button onClick={() => handleRemoveInvoiceItem(idx)} className="text-rose-500 text-xs">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Notes / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Semester 4 Research Tuition & Computing"
                  value={newInvNotes}
                  onChange={(e) => setNewInvNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    createInvoiceMutation.mutate({
                      student_id: newInvStudentId,
                      items: newInvItems,
                      notes: newInvNotes,
                      due_days: newInvDueDays,
                    })
                  }
                  disabled={createInvoiceMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
