import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { createPublication, deletePublication, fetchPublications, fetchStudents, updatePublication } from "@/api/endpoints";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, statusTone, statusLabel } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, FormField, inputClass } from "@/components/ui/Modal";
import type { Publication, PublicationInput } from "@/types";

const PUB_TYPES = ["journal", "conference", "book_chapter", "preprint", "other"];
const PUB_STATUSES = ["draft", "submitted", "under_review", "revision_required", "accepted", "published", "rejected"];

export function ResearchPublicationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Publication | "new" | null>(null);

  const { data: studentsPage } = useQuery({ queryKey: ["students-lite"], queryFn: () => fetchStudents({ page_size: 100 }) });
  const { data: pubPage, isLoading } = useQuery({ queryKey: ["publications"], queryFn: () => fetchPublications() });

  function studentName(id: number) {
    return studentsPage?.items.find((s) => s.id === id)?.full_name ?? `Student #${id}`;
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this publication? This cannot be undone.")) return;
    await deletePublication(id);
    queryClient.invalidateQueries({ queryKey: ["publications"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> Add Publication
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !pubPage || pubPage.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No publications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {pubPage.items.map((p) => (
                <div key={p.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{p.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {studentName(p.student_id)} · {p.pub_type.replace("_", " ")} · {p.venue ?? "Venue TBD"}
                      </p>
                      {p.authors && p.authors.length > 0 && (
                        <p className="mt-0.5 text-xs text-slate-400">Authors: {p.authors.join(", ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
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
        <PublicationModal
          publication={editing === "new" ? null : editing}
          students={studentsPage?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["publications"] })}
        />
      )}
    </div>
  );
}

function PublicationModal({
  publication,
  students,
  onClose,
  onSaved,
}: {
  publication: Publication | null;
  students: { id: number; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PublicationInput>({
    student_id: publication?.student_id ?? students[0]?.id ?? 0,
    title: publication?.title ?? "",
    pub_type: publication?.pub_type ?? "journal",
    venue: publication?.venue ?? "",
    status: publication?.status ?? "draft",
    doi: publication?.doi ?? "",
    url: publication?.url ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (publication) {
        await updatePublication(publication.id, form);
      } else {
        await createPublication(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not save publication.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={publication ? "Edit Publication" : "Add Publication"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Student">
          <select
            className={inputClass}
            value={form.student_id}
            onChange={(e) => setForm((f) => ({ ...f, student_id: Number(e.target.value) }))}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Title">
          <input required className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type">
            <select className={inputClass} value={form.pub_type} onChange={(e) => setForm((f) => ({ ...f, pub_type: e.target.value }))}>
              {PUB_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {PUB_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Venue">
          <input className={inputClass} value={form.venue ?? ""} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="DOI">
            <input className={inputClass} value={form.doi ?? ""} onChange={(e) => setForm((f) => ({ ...f, doi: e.target.value }))} />
          </FormField>
          <FormField label="URL">
            <input className={inputClass} value={form.url ?? ""} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          </FormField>
        </div>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
