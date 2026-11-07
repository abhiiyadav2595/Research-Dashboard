import { useQuery } from "@tanstack/react-query";
import { Users, GraduationCap, Activity, AlertTriangle, TrendingUp, FileText, ClipboardList, School } from "lucide-react";
import { fetchDashboardCharts, fetchDashboardSummary } from "@/api/endpoints";
import { useFilters } from "@/context/FilterContext";
import { FilterBar } from "@/components/layout/FilterBar";
import { KpiCard } from "@/components/ui/KpiCard";
import { BarChartCard, PieChartCard } from "@/components/charts/ChartCards";

export function DashboardPage() {
  const { filters } = useFilters();

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dashboard-summary", filters],
    queryFn: () => fetchDashboardSummary(filters),
  });

  const { data: charts, isLoading: loadingCharts } = useQuery({
    queryKey: ["dashboard-charts", filters],
    queryFn: () => fetchDashboardCharts(filters),
  });

  return (
    <div>
      <FilterBar />

      {loadingSummary ? (
        <KpiSkeleton />
      ) : summary ? (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Total Students" value={summary.total_students} icon={Users} tone="brand" />
          <KpiCard label="PhD Students" value={summary.phd_students} icon={GraduationCap} tone="neutral" />
          <KpiCard label="Master's Students" value={summary.masters_students} icon={School} tone="neutral" />
          <KpiCard label="Active Students" value={summary.active_students} icon={Activity} tone="success" />
          <KpiCard label="Students At Risk" value={summary.at_risk_students} icon={AlertTriangle} tone="danger" />
          <KpiCard label="Average Progress" value={`${summary.average_progress}%`} icon={TrendingUp} tone="brand" />
          <KpiCard label="Total Research Papers" value={summary.total_papers} icon={FileText} tone="neutral" />
          <KpiCard label="Pending Submissions" value={summary.pending_submissions} icon={ClipboardList} tone="warning" />
        </div>
      ) : null}

      {loadingCharts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : charts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BarChartCard title="Students by Program" data={charts.students_by_program} />
          <BarChartCard title="Students by Semester" data={charts.students_by_semester} />
          <PieChartCard title="Publication Status" data={charts.publication_status} />
          <BarChartCard title="Progress Distribution" data={charts.progress_distribution} />
          <PieChartCard title="Students at Risk" data={charts.risk_distribution} riskColors />
          <BarChartCard title="Department Research Output" data={charts.department_research_output} />
        </div>
      ) : null}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}
