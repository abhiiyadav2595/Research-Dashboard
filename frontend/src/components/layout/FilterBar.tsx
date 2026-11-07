import { useQuery } from "@tanstack/react-query";
import { fetchFilterOptions } from "@/api/endpoints";
import { useFilters } from "@/context/FilterContext";
import { Button } from "@/components/ui/Button";
import { RotateCcw } from "lucide-react";

export function FilterBar() {
  const { filters, setFilter, resetFilters } = useFilters();
  const { data: options } = useQuery({ queryKey: ["filter-options"], queryFn: fetchFilterOptions });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <select
        className="select-field"
        value={filters.program_id ?? ""}
        onChange={(e) => setFilter("program_id", e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Programs</option>
        {options?.programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        className="select-field"
        value={filters.department_id ?? ""}
        onChange={(e) => setFilter("department_id", e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Departments</option>
        {options?.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        className="select-field"
        value={filters.supervisor_id ?? ""}
        onChange={(e) => setFilter("supervisor_id", e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Supervisors</option>
        {options?.supervisors.map((s) => (
          <option key={s.id} value={s.id}>{s.full_name}</option>
        ))}
      </select>

      <select
        className="select-field"
        value={filters.semester ?? ""}
        onChange={(e) => setFilter("semester", e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Semesters</option>
        {options?.semesters.map((s) => (
          <option key={s} value={s}>Semester {s}</option>
        ))}
      </select>

      <select
        className="select-field"
        value={filters.batch_year ?? ""}
        onChange={(e) => setFilter("batch_year", e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">All Batches</option>
        {options?.batch_years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select
        className="select-field"
        value={filters.status ?? ""}
        onChange={(e) => setFilter("status", e.target.value || undefined)}
      >
        <option value="">All Statuses</option>
        {options?.statuses.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Progress</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Min"
          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          value={filters.min_progress ?? ""}
          onChange={(e) => setFilter("min_progress", e.target.value ? Number(e.target.value) : undefined)}
        />
        <span>–</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="Max"
          className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          value={filters.max_progress ?? ""}
          onChange={(e) => setFilter("max_progress", e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <Button variant="outline" size="sm" onClick={resetFilters} className="ml-auto">
        <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
      </Button>
    </div>
  );
}
