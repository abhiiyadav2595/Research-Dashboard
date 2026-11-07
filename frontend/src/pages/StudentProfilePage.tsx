import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchStudentDetail } from "@/api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, riskTone, statusTone, statusLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = Number(id);

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudentDetail(studentId),
    enabled: !!studentId,
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  if (!student) {
    return <p className="text-slate-500">Student not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{student.full_name}</h2>
            <p className="text-sm text-slate-500">
              {student.student_code} · {student.program} · {student.department} · Batch {student.batch_year}
            </p>
            <p className="mt-1 text-sm text-slate-500">Supervisor: {student.supervisor ?? "Unassigned"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(student.enrollment_status)}>{statusLabel(student.enrollment_status)}</Badge>
            <Badge tone={riskTone(student.risk_level)}>{student.risk_level} RISK</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ProgressStat label="Overall Progress" value={student.overall_progress} />
        <ProgressStat label="Academic" value={student.evaluations?.at(-1)?.academic_score} />
        <ProgressStat label="Research" value={student.evaluations?.at(-1)?.research_score} />
        <ProgressStat label="Submission Compliance" value={student.evaluations?.at(-1)?.submission_score} />
      </div>

      {student.evaluations?.at(-1)?.risk_reasons?.length ? (
        <Card>
          <CardHeader><CardTitle>At-Risk Reasons</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              {student.evaluations.at(-1)!.risk_reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Semester-wise Academic Record</CardTitle></CardHeader>
        <CardContent>
          {student.semesters.length === 0 ? (
            <p className="text-sm text-slate-400">No semester records yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="py-1.5">Semester</th>
                  <th className="py-1.5">CGPA</th>
                  <th className="py-1.5">Credits Completed</th>
                  <th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {student.semesters.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2">Semester {s.semester_number}</td>
                    <td className="py-2">{s.cgpa ?? "—"}</td>
                    <td className="py-2">{s.credits_completed ?? "—"}</td>
                    <td className="py-2"><Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {student.research_profile?.milestones && student.research_profile.milestones.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Research Milestones ({student.research_profile.milestones.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {student.research_profile.milestones.map((m) => (
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
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Publications ({student.publications.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {student.publications.length === 0 ? (
              <p className="text-sm text-slate-400">No publications recorded.</p>
            ) : (
              student.publications.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.title}</p>
                    <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{p.pub_type} · {p.venue ?? "Venue TBD"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Submissions & Deadlines ({student.submissions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {student.submissions.length === 0 ? (
              <p className="text-sm text-slate-400">No submissions recorded.</p>
            ) : (
              student.submissions.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</p>
                    <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.category} · Deadline: {s.deadline ?? "—"}
                  </p>
                  {s.remarks.length > 0 && (
                    <p className="mt-1 text-xs italic text-slate-400">"{s.remarks[s.remarks.length - 1]}"</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProgressStat({ label, value }: { label: string; value?: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">
        {value !== undefined ? `${value}%` : "—"}
      </p>
    </Card>
  );
}
