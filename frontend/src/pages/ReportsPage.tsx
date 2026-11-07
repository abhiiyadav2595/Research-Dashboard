import { useState } from "react";
import { FileSpreadsheet, FileText, FileDown, AlertTriangle } from "lucide-react";
import { downloadReport } from "@/api/endpoints";
import { useFilters } from "@/context/FilterContext";
import { FilterBar } from "@/components/layout/FilterBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const REPORTS = [
  { kind: "students.csv" as const, label: "Student Directory (CSV)", desc: "All filtered students, spreadsheet-friendly.", icon: FileSpreadsheet },
  { kind: "students.xlsx" as const, label: "Student Directory (Excel)", desc: "Same data, formatted as an .xlsx workbook.", icon: FileSpreadsheet },
  { kind: "students.pdf" as const, label: "Student Directory (PDF)", desc: "Printable summary report of filtered students.", icon: FileText },
  { kind: "at-risk.pdf" as const, label: "At-Risk Students (PDF)", desc: "Focused report on students flagged at risk, with reasons.", icon: AlertTriangle },
];

export function ReportsPage() {
  const { filters } = useFilters();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDownload(kind: (typeof REPORTS)[number]["kind"]) {
    setError("");
    setDownloading(kind);
    try {
      await downloadReport(kind, filters);
    } catch {
      setError("Could not generate that report. Try adjusting filters or try again.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <FilterBar />
      <p className="mb-4 text-sm text-slate-500">
        Reports respect the filters above — narrow down by department, program, or status before exporting.
      </p>
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORTS.map(({ kind, label, desc, icon: Icon }) => (
          <Card key={kind}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                <Icon className="h-4 w-4" />
              </div>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">{desc}</p>
              <Button size="sm" onClick={() => handleDownload(kind)} disabled={downloading === kind}>
                <FileDown className="h-3.5 w-3.5" /> {downloading === kind ? "Generating…" : "Download"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
