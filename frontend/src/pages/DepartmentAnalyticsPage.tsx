import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { fetchDashboardCharts, fetchDashboardSummary, fetchFilterOptions } from "@/api/endpoints";
import { KpiCard } from "@/components/ui/KpiCard";
import { BarChartCard, PieChartCard } from "@/components/charts/ChartCards";
import { Card } from "@/components/ui/Card";

export function DepartmentAnalyticsPage() {
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);

  const { data: options } = useQuery({ queryKey: ["filter-options"], queryFn: fetchFilterOptions });
  const filters = { department_id: departmentId };

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["dept-summary", departmentId],
    queryFn: () => fetchDashboardSummary(filters),
  });
  const { data: charts, isLoading: loadingCharts } = useQuery({
    queryKey: ["dept-charts", departmentId],
    queryFn: () => fetchDashboardCharts(filters),
  });

  return (
    <div>
      <Card className="mb-6 flex items-center gap-3 p-4">
        <Building2 className="h-4 w-4 text-slate-400" />
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Department:</label>
        <select
          className="select-field"
          value={departmentId ?? ""}
          onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Departments</option>
          {options?.departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </Card>

      {loadingSummary || !summary ? (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Students" value={summary.total_students} icon={Users} tone="brand" />
          <KpiCard label="Avg. Progress" value={`${summary.average_progress}%`} icon={TrendingUp} tone="success" />
          <KpiCard label="At Risk" value={summary.at_risk_students} icon={AlertTriangle} tone="danger" />
          <KpiCard label="Research Papers" value={summary.total_papers} icon={Building2} tone="neutral" />
        </div>
      )}

      {loadingCharts || !charts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BarChartCard title="Students by Program" data={charts.students_by_program} />
          <PieChartCard title="Risk Distribution" data={charts.risk_distribution} riskColors />
          <BarChartCard title="Progress Distribution" data={charts.progress_distribution} />
          <BarChartCard title="Research Output" data={charts.department_research_output} />
        </div>
      )}
    </div>
  );
}
