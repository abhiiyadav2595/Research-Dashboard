import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchStudents } from "@/api/endpoints";
import { useFilters } from "@/context/FilterContext";
import { FilterBar } from "@/components/layout/FilterBar";
import { Card } from "@/components/ui/Card";
import { Badge, riskTone, statusTone, statusLabel } from "@/components/ui/Badge";
import type { StudentSummary } from "@/types";

const columnHelper = createColumnHelper<StudentSummary>();

export function StudentDirectoryPage() {
  const { filters, setFilter } = useFilters();
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  const queryFilters = { ...filters, page, page_size: 10, search: filters.search };

  const { data, isLoading } = useQuery({
    queryKey: ["students", queryFilters],
    queryFn: () => fetchStudents(queryFilters),
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("student_code", { header: "Student ID" }),
      columnHelper.accessor("full_name", { header: "Name" }),
      columnHelper.accessor("program", { header: "Program" }),
      columnHelper.accessor("department", { header: "Department" }),
      columnHelper.accessor("current_semester", { header: "Semester" }),
      columnHelper.accessor("supervisor", { header: "Supervisor" }),
      columnHelper.accessor("overall_progress", {
        header: "Progress",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${info.getValue()}%` }} />
            </div>
            <span className="text-xs text-slate-500">{info.getValue()}%</span>
          </div>
        ),
      }),
      columnHelper.accessor("paper_count", { header: "Papers" }),
      columnHelper.accessor("pending_tasks", { header: "Pending Tasks" }),
      columnHelper.accessor("risk_level", {
        header: "Status",
        cell: (info) => <Badge tone={riskTone(info.getValue())}>{info.getValue()}</Badge>,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <FilterBar />

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
              placeholder="Search by name, ID, or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setFilter("search", searchInput || undefined);
                }
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-slate-200 dark:border-slate-800">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                    Loading students…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                    No students match the selected filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/students/${row.original.id}`)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-200">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page {data.page} of {data.total_pages || 1} ({data.total} students)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Re-export for pages that need consistent status label formatting
export { statusLabel, statusTone };
