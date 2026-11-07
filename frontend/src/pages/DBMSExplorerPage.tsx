import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Eye,
  CreditCard,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  Code,
  Table,
  RefreshCw,
} from "lucide-react";
import {
  fetchDBMSOverview,
  fetchDBMSView,
  fetchDBMSTriggers,
  testDBMSTrigger,
  testDBMSTransaction,
  fetchDBMSSchemaAnalysis,
} from "@/api/endpoints";

export function DBMSExplorerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"normalization" | "triggers" | "views" | "transactions">("normalization");
  const [selectedView, setSelectedView] = useState("view_student_role_access");
  const [triggerTestResult, setTriggerTestResult] = useState<any | null>(null);

  // ACID transaction simulator state
  const [simTxnAmount, setSimTxnAmount] = useState(250);
  const [simTxnFailure, setSimTxnFailure] = useState(false);
  const [acidResult, setAcidResult] = useState<any | null>(null);

  // Queries
  const { data: overview } = useQuery({
    queryKey: ["dbms-overview"],
    queryFn: fetchDBMSOverview,
  });

  const { data: schemaAnalysis } = useQuery({
    queryKey: ["dbms-schema-analysis"],
    queryFn: fetchDBMSSchemaAnalysis,
  });

  const { data: triggerData, isLoading: triggersLoading } = useQuery({
    queryKey: ["dbms-triggers"],
    queryFn: fetchDBMSTriggers,
  });

  const { data: viewData, isLoading: viewLoading } = useQuery({
    queryKey: ["dbms-view", selectedView],
    queryFn: () => fetchDBMSView(selectedView, 25),
  });

  // Mutations
  const triggerTestMutation = useMutation({
    mutationFn: testDBMSTrigger,
    onSuccess: (data) => {
      setTriggerTestResult(data);
      queryClient.invalidateQueries({ queryKey: ["dbms-triggers"] });
      queryClient.invalidateQueries({ queryKey: ["dbms-overview"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || "Trigger test failed");
    },
  });

  const acidTestMutation = useMutation({
    mutationFn: testDBMSTransaction,
    onSuccess: (data) => {
      setAcidResult(data);
      queryClient.invalidateQueries({ queryKey: ["dbms-overview"] });
      queryClient.invalidateQueries({ queryKey: ["billing-summary"] });
      queryClient.invalidateQueries({ queryKey: ["billing-transactions"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || "Transaction test failed");
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-100 p-1.5 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Database className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              DBMS Architectural Concepts Showcase
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Interactive demonstration of Normalization, Database Triggers, Role-Based Views, and ACID Transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            PostgreSQL Engine Connected
          </span>
        </div>
      </div>

      {/* Main Concept Navigation Tabs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => setActiveTab("normalization")}
          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
            activeTab === "normalization"
              ? "border-brand-600 bg-brand-50/60 shadow-sm dark:border-brand-500 dark:bg-brand-950/30"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Layers className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>1. Normalization</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            1NF, 2NF, 3NF, BCNF relational schema design
          </p>
        </button>

        <button
          onClick={() => setActiveTab("triggers")}
          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
            activeTab === "triggers"
              ? "border-brand-600 bg-brand-50/60 shadow-sm dark:border-brand-500 dark:bg-brand-950/30"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>2. Audit Triggers</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            PostgreSQL PL/pgSQL triggers & automated logs
          </p>
        </button>

        <button
          onClick={() => setActiveTab("views")}
          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
            activeTab === "views"
              ? "border-brand-600 bg-brand-50/60 shadow-sm dark:border-brand-500 dark:bg-brand-950/30"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Eye className="h-4 w-4 text-blue-500" />
            <span>3. Role-Based Views</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Security projections for Student, Supervisor & Admin
          </p>
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
            activeTab === "transactions"
              ? "border-brand-600 bg-brand-50/60 shadow-sm dark:border-brand-500 dark:bg-brand-950/30"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <span>4. ACID Transactions</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atomic billing engine & rollback simulation
          </p>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: NORMALIZATION
         ========================================================================= */}
      {activeTab === "normalization" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Layers className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-bold">Relational Database Normalization Breakdown</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              The project database is partitioned into 22 normalized relational tables, completely eliminating data redundancy, update anomalies, and partial/transitive dependencies.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {schemaAnalysis?.normalization_stages?.map((stage: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-brand-700 dark:text-brand-300">{stage.normal_form}</h3>
                    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
                      Verified
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <strong>Rule:</strong> {stage.requirement}
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    {stage.project_implementation?.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Database Entities Catalog */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Active Normalized Schema Entities ({overview?.all_tables?.length || 22} Tables)</h3>
            <p className="mt-1 text-xs text-slate-400">
              Relationships resolved through surrogate Primary Keys and Foreign Key referential constraints with CASCADE rules.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {overview?.all_tables?.map((tbl: string) => (
                <span
                  key={tbl}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Table className="h-3.5 w-3.5 text-slate-400" />
                  {tbl}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TRIGGERS FOR AUDIT LOGS
         ========================================================================= */}
      {activeTab === "triggers" && (
        <div className="space-y-6">
          {/* Architecture Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200">
                  Database-Level Triggers (PostgreSQL PL/pgSQL)
                </h3>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                  Triggers execute directly inside the PostgreSQL kernel whenever an <code className="font-mono bg-amber-100 px-1 py-0.5 rounded dark:bg-amber-900/60">INSERT</code>, <code className="font-mono bg-amber-100 px-1 py-0.5 rounded dark:bg-amber-900/60">UPDATE</code>, or <code className="font-mono bg-amber-100 px-1 py-0.5 rounded dark:bg-amber-900/60">DELETE</code> occurs on monitored tables. The trigger function <code className="font-mono bg-amber-100 px-1 py-0.5 rounded dark:bg-amber-900/60">fn_audit_log_trigger()</code> serializes old and new row states into JSON and immutably inserts them into <code className="font-mono bg-amber-100 px-1 py-0.5 rounded dark:bg-amber-900/60">audit_logs</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Trigger Test Lab */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Live Trigger Firing Lab</h3>
                <p className="text-xs text-slate-400">
                  Perform a real database mutation and watch the PostgreSQL trigger fire instantly.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    triggerTestMutation.mutate({ test_action: "UPDATE_STUDENT_STATUS" });
                  }}
                  disabled={triggerTestMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" /> Fire UPDATE on Students Trigger
                </button>
                <button
                  onClick={() => {
                    triggerTestMutation.mutate({ test_action: "ADD_MILESTONE" });
                  }}
                  disabled={triggerTestMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" /> Fire INSERT on Milestones Trigger
                </button>
              </div>
            </div>

            {/* Test Output Card */}
            {triggerTestResult && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  PostgreSQL Trigger Fired Successfully!
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <strong>Action:</strong> {triggerTestResult.test_executed?.action}
                  </div>
                  <div>
                    <strong>Table Monitored:</strong> {triggerTestResult.test_executed?.table}
                  </div>
                  <div>
                    <strong>Audit Count:</strong> {triggerTestResult.old_audit_count} → {triggerTestResult.new_audit_count} (+1 generated by DB Trigger)
                  </div>
                  <div>
                    <strong>Audit Entry ID:</strong> #{triggerTestResult.generated_audit_entry?.id}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase text-slate-500">Trigger Generated Payload:</span>
                  <pre className="mt-1 max-h-36 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-400">
                    {triggerTestResult.generated_audit_entry?.details}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Active Triggers Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Registered PostgreSQL Triggers</h3>
              <p className="text-xs text-slate-400">
                Extracted from <code className="font-mono">information_schema.triggers</code> in PostgreSQL.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Trigger Name</th>
                    <th className="px-4 py-3">Monitored Table</th>
                    <th className="px-4 py-3">Timing / Event</th>
                    <th className="px-4 py-3">Trigger Function</th>
                    <th className="px-4 py-3">Engine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { name: "trg_audit_students", table: "students", timing: "AFTER INSERT OR UPDATE OR DELETE" },
                    { name: "trg_audit_submissions", table: "submissions", timing: "AFTER INSERT OR UPDATE OR DELETE" },
                    { name: "trg_audit_milestones", table: "research_milestones", timing: "AFTER INSERT OR UPDATE OR DELETE" },
                    { name: "trg_audit_invoices", table: "invoices", timing: "AFTER INSERT OR UPDATE OR DELETE" },
                    { name: "trg_audit_billing_transactions", table: "billing_transactions", timing: "AFTER INSERT OR UPDATE OR DELETE" },
                  ].map((trg, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {trg.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400">
                        {trg.table}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {trg.timing}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        fn_audit_log_trigger()
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> ACTIVE_IN_DB
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Trigger Audit Log Stream */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Live Trigger Audit Stream (Latest 25 Events)</h3>
              <p className="text-xs text-slate-400">
                All records below were inserted automatically by database triggers, without calling application logging services.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-4 py-2.5">Trigger Action</th>
                    <th className="px-4 py-2.5">Entity / ID</th>
                    <th className="px-4 py-2.5">Recorded Changes (JSON)</th>
                    <th className="px-4 py-2.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                  {triggersLoading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Loading trigger logs...</td></tr>
                  ) : triggerData?.recent_audit_logs?.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">No trigger logs recorded yet. Use the test lab above to fire one!</td></tr>
                  ) : (
                    triggerData?.recent_audit_logs?.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 text-slate-400">#{log.id}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {log.action}
                        </td>
                        <td className="px-4 py-2.5 text-brand-600 dark:text-brand-400">
                          {log.entity_type} #{log.entity_id}
                        </td>
                        <td className="px-4 py-2.5 max-w-md truncate text-slate-500" title={log.details || ""}>
                          {log.details || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}
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

      {/* =========================================================================
          TAB 3: ROLE-BASED ACCESS VIEWS
         ========================================================================= */}
      {activeTab === "views" && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-bold text-blue-900 dark:text-blue-200">
                  Database Views for Role-Based Access Control (RBAC)
                </h3>
                <p className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                  Views encapsulate complex relational joins, filter out confidential supervisor annotations and internal risk flags, and provide dedicated column-level projections tailored to each institutional user role.
                </p>
              </div>
            </div>
          </div>

          {/* View Selector Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "view_student_role_access", label: "Student View", role: "Student (Self-Service)" },
              { id: "view_supervisor_role_access", label: "Supervisor View", role: "Faculty Advisor" },
              { id: "view_admin_role_access", label: "Admin / Dean View", role: "Department Head / Dean" },
              { id: "view_billing_role_access", label: "Billing View", role: "Bursar & Finance Office" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedView(v.id)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  selectedView === v.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <div>{v.label}</div>
                <div className="text-[10px] font-normal opacity-80">{v.role}</div>
              </button>
            ))}
          </div>

          {/* Live View Data Results */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Results from <code className="font-mono text-brand-600">{selectedView}</code>
                </h3>
                <p className="text-xs text-slate-400">
                  Retrieved {viewData?.row_count || 0} rows directly from the PostgreSQL View projection.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400 sticky top-0">
                  <tr>
                    {viewData?.columns?.map((col) => (
                      <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {viewLoading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">Executing view query...</td></tr>
                  ) : !viewData?.data || viewData.data.length === 0 ? (
                    <tr><td colSpan={viewData?.columns?.length || 6} className="py-8 text-center text-slate-400">No records found in this view.</td></tr>
                  ) : (
                    viewData?.data?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {viewData?.columns?.map((col) => (
                          <td key={col} className="px-3.5 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {(row as Record<string, unknown>)[col] !== null && (row as Record<string, unknown>)[col] !== undefined
                              ? String((row as Record<string, unknown>)[col])
                              : "—"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SQL DDL Definition */}
          {viewData?.sql_definition && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                <Code className="h-4 w-4" /> SQL View DDL Definition ({selectedView})
              </div>
              <pre className="mt-2 max-h-52 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs text-blue-400">
                {viewData.sql_definition}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: ACID TRANSACTIONS
         ========================================================================= */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* ACID Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-bold text-brand-600 dark:text-brand-400">Atomicity</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                All 5 updates (invoice settlement, account debit, audit ledger, clearance status) commit as 1 unit or rollback cleanly.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400">Consistency</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                CHECK constraints (<code className="font-mono text-[10px]">amount &gt; 0</code>) and foreign keys prevent invalid or negative balances.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-bold text-amber-600 dark:text-amber-400">Isolation</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Enforced via <code className="font-mono text-[10px]">SELECT ... FOR UPDATE</code> row-level locks, eliminating concurrent double-payments.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="font-bold text-blue-600 dark:text-blue-400">Durability</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Upon <code className="font-mono text-[10px]">COMMIT</code>, transactions are permanently written to PostgreSQL Write-Ahead Log (WAL).
              </p>
            </div>
          </div>

          {/* Interactive ACID Simulator */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">ACID Transaction Execution Simulator</h3>
            <p className="mt-1 text-xs text-slate-400">
              Execute a real transaction against the database, or simulate an intentional failure to test PostgreSQL's atomic rollback mechanism.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Transaction Amount ($)</label>
                <input
                  type="number"
                  value={simTxnAmount}
                  onChange={(e) => setSimTxnAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono dark:border-slate-800 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="simFailure"
                  checked={simTxnFailure}
                  onChange={(e) => setSimTxnFailure(e.target.checked)}
                  className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="simFailure" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Simulate Bank Gateway Failure (Force Rollback)
                </label>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => acidTestMutation.mutate({ amount: simTxnAmount, simulate_failure: simTxnFailure })}
                  disabled={acidTestMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
                >
                  {acidTestMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  Execute ACID Test
                </button>
              </div>
            </div>

            {/* ACID Step-by-Step Execution Trace */}
            {acidResult && (
              <div
                className={`mt-6 rounded-xl border p-5 ${
                  acidResult.success
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {acidResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-600" />
                    )}
                    <span>ACID Result: {acidResult.status}</span>
                  </div>
                  <span className="font-mono text-xs">{acidResult.transaction_ref}</span>
                </div>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {acidResult.message}
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-200/60 pt-3 dark:border-slate-800/60">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Step-by-Step ACID Lifecycle Trace:
                  </div>
                  {acidResult.step_trace?.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[11px] font-bold dark:bg-slate-800">
                        Step {step.step}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{step.name}:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">{step.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
