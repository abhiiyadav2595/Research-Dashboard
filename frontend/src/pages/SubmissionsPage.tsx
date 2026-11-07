import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, MessageSquarePlus, AlertTriangle } from "lucide-react";
import {
  addSubmissionRemark,
  createSubmission,
  fetchOverdueSubmissions,
  fetchStudents,
  fetchSubmissions,
  updateSubmission,
} from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, statusTone, statusLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, FormField, inputClass } from "@/components/ui/Modal";
import type { Submission, SubmissionInput } from "@/types";

const SUB_STATUSES = ["pending", "submitted", "under_review", "approved", "rejected", "overdue"];

export function SubmissionsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Submission | "new" | null>(null);
  const [remarking, setRemarking] = useState<Submission | null>(null);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const { data: studentsPage } = useQuery({ queryKey: ["students-lite"], queryFn: () => fetchStudents({ page_size: 100 }) });
  const { data: allPage, isLoading: loadingAll } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => fetchSubmissions(),
    enabled: !showOverdueOnly,
  });
  const { data: overdue, isLoading: loadingOverdue } = useQuery({
    queryKey: ["submissions-overdue"],
    queryFn: fetchOverdueSubmissions,
    enabled: showOverdueOnly,
  });

  const items = showOverdueOnly ? overdue?.items : allPage?.items;
  const isLoading = showOverdueOnly ? loadingOverdue : loadingAll;

  function studentName(id: number) {
    return studentsPage?.items.find((s) => s.id === id)?.full_name ?? `Student #${id}`;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["submissions"] });
    queryClient.invalidateQueries({ queryKey: ["submissions-overdue"] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button
          size="sm"
          variant={showOverdueOnly ? "primary" : "outline"}
          onClick={() => setShowOverdueOnly((v) => !v)}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> {showOverdueOnly ? "Showing Overdue Only" : "Show Overdue Only"}
        </Button>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Add Submission
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !items || items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {showOverdueOnly ? "Nothing overdue right now." : "No submissions recorded yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {studentName(s.student_id)} · {s.category} · Deadline: {s.deadline ?? "—"}
                        {s.reviewer && ` · Reviewer: ${s.reviewer}`}
                      </p>
                      {s.remarks.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-xs italic text-slate-400">
                          {s.remarks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.is_overdue && <Badge tone="danger">Overdue</Badge>}
                      <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setRemarking(s)}>
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <SubmissionModal
          submission={editing === "new" ? null : editing}
          students={studentsPage?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
      {remarking && (
        <RemarkModal submission={remarking} onClose={() => setRemarking(null)} onSaved={invalidate} />
      )}
    </div>
  );
}

function SubmissionModal({
  submission,
  students,
  onClose,
  onSaved,
}: {
  submission: Submission | null;
  students: { id: number; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<SubmissionInput>({
    student_id: submission?.student_id ?? students[0]?.id ?? 0,
    name: submission?.name ?? "",
    category: submission?.category ?? "",
    deadline: submission?.deadline ?? "",
    status: submission?.status ?? "pending",
    document_link: submission?.document_link ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (submission) {
        await updateSubmission(submission.id, form);
      } else {
        await createSubmission(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not save submission.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={submission ? "Edit Submission" : "Add Submission"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Student">
          <select className={inputClass} value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: Number(e.target.value) }))}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </FormField>
        <FormField label="Name">
          <input required className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
            <input required className={inputClass} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </FormField>
          <FormField label="Deadline">
            <input required type="date" className={inputClass} value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {SUB_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </FormField>
        <FormField label="Document Link (optional)">
          <input className={inputClass} value={form.document_link ?? ""} onChange={(e) => setForm((f) => ({ ...f, document_link: e.target.value }))} />
        </FormField>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RemarkModal({ submission, onClose, onSaved }: { submission: Submission; onClose: () => void; onSaved: () => void }) {
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!remark.trim()) return;
    setSaving(true);
    try {
      await addSubmissionRemark(submission.id, remark.trim());
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Add Remark — ${submission.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Remark">
          <textarea required rows={3} className={inputClass} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Adding…" : "Add Remark"}</Button>
        </div>
      </form>
    </Modal>
  );
}
