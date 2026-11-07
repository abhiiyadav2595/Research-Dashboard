import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, TrendingUp, FileText } from "lucide-react";
import { fetchDashboardSummary, fetchStudents } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, riskTone } from "@/components/ui/Badge";

export function SupervisorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const supervisorId = user?.supervisor_id;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["supervisor-summary", supervisorId],
    queryFn: () => fetchDashboardSummary({ supervisor_id: supervisorId! }),
    enabled: !!supervisorId,
  });

  const { data: studentsPage, isLoading: loadingStudents } = useQuery({
    queryKey: ["supervisor-students", supervisorId],
    queryFn: () => fetchStudents({ supervisor_id: supervisorId!, page_size: 50 }),
    enabled: !!supervisorId,
  });

  if (!supervisorId) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-sm text-slate-500">
            Your account isn't linked to a supervisor profile, so there are no students to show here.
            Contact an administrator to have your account linked.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {loadingSummary || !summary ? (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="My Students" value={summary.total_students} icon={Users} tone="brand" />
          <KpiCard label="At Risk" value={summary.at_risk_students} icon={AlertTriangle} tone="danger" />
          <KpiCard label="Avg. Progress" value={`${summary.average_progress}%`} icon={TrendingUp} tone="success" />
          <KpiCard label="Papers" value={summary.total_papers} icon={FileText} tone="neutral" />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>My Students</CardTitle></CardHeader>
        <CardContent>
          {loadingStudents ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !studentsPage || studentsPage.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No students currently assigned to you.</p>
          ) : (
            <div className="space-y-2">
              {studentsPage.items.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/students/${s.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.full_name}</p>
                    <p className="text-xs text-slate-500">{s.student_code} · {s.program} · Semester {s.current_semester}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Progress</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.overall_progress}%</p>
                    </div>
                    <Badge tone={riskTone(s.risk_level)}>{s.risk_level}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
