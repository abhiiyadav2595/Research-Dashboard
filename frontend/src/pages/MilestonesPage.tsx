import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Milestone as MilestoneIcon } from "lucide-react";
import { fetchStudentDetail, fetchStudents } from "@/api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, statusTone, statusLabel } from "@/components/ui/Badge";

export function MilestonesPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: studentsPage } = useQuery({
    queryKey: ["students-for-milestones", search],
    queryFn: () => fetchStudents({ search: search || undefined, page_size: 20 }),
  });

  const { data: detail } = useQuery({
    queryKey: ["student", selectedId],
    queryFn: () => fetchStudentDetail(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>Select a Student</CardTitle></CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
              placeholder="Search students…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[500px] space-y-1 overflow-y-auto">
            {studentsPage?.items.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selectedId === s.id
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <p className="font-medium">{s.full_name}</p>
                <p className="text-xs text-slate-400">{s.student_code} · {s.program}</p>
              </button>
            ))}
            {studentsPage && studentsPage.items.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No matches.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <MilestoneIcon className="h-4 w-4 text-slate-400" />
          <CardTitle>
            {detail ? `${detail.full_name}'s Research Milestones` : "Milestones"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <p className="py-12 text-center text-sm text-slate-400">
              Pick a student on the left to view their research milestones.
            </p>
          ) : !detail ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !detail.research_profile ? (
            <p className="py-12 text-center text-sm text-slate-400">
              No research profile set up for this student yet.
            </p>
          ) : (
            <div>
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                <InfoBox label="Research Topic" value={detail.research_profile.research_topic} />
                <InfoBox label="Proposal Status" value={detail.research_profile.proposal_status} />
                <InfoBox label="Thesis Status" value={detail.research_profile.thesis_status} />
              </div>
              {!detail.research_profile.milestones || detail.research_profile.milestones.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No milestones recorded for this student.</p>
              ) : (
                <div className="space-y-2">
                  {detail.research_profile.milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.title}</p>
                        <p className="text-xs text-slate-400">
                          Due: {m.due_date ?? "—"}{m.completed_date && ` · Completed: ${m.completed_date}`}
                        </p>
                      </div>
                      <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/60">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 dark:text-slate-200">{value ?? "—"}</p>
    </div>
  );
}
