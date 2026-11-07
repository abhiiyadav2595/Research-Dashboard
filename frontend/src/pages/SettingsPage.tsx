import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, RefreshCw } from "lucide-react";
import {
  createManagedUser,
  fetchProgressWeights,
  fetchUsers,
  recomputeAllProgress,
  toggleUserStatus,
  updateProgressWeights,
} from "@/api/endpoints";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, FormField, inputClass } from "@/components/ui/Modal";
import type { ProgressWeights, Role } from "@/types";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [showAddUser, setShowAddUser] = useState(false);

  const { data: usersPage } = useQuery({ queryKey: ["users"], queryFn: () => fetchUsers() });
  const { data: weights } = useQuery({ queryKey: ["progress-weights"], queryFn: fetchProgressWeights });

  async function handleToggle(id: number, current: boolean) {
    await toggleUserStatus(id, !current);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>User Management</CardTitle>
          <Button size="sm" onClick={() => setShowAddUser(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="py-1.5">Name</th>
                <th className="py-1.5">Email</th>
                <th className="py-1.5">Role</th>
                <th className="py-1.5">Status</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {usersPage?.items.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2">{u.full_name}</td>
                  <td className="py-2 text-slate-500">{u.email}</td>
                  <td className="py-2 uppercase text-xs text-slate-500">{u.role}</td>
                  <td className="py-2">
                    <Badge tone={u.is_active ? "success" : "neutral"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleToggle(u.id, u.is_active)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {weights && <ProgressWeightsCard initial={weights} />}

      {showAddUser && (
        <AddUserModal onClose={() => setShowAddUser(false)} onCreated={() => queryClient.invalidateQueries({ queryKey: ["users"] })} />
      )}
    </div>
  );
}

function ProgressWeightsCard({ initial }: { initial: ProgressWeights }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: initial.name,
    academic_weight: initial.academic_weight,
    research_weight: initial.research_weight,
    milestone_weight: initial.milestone_weight,
    publication_weight: initial.publication_weight,
    submission_weight: initial.submission_weight,
  });
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [message, setMessage] = useState("");

  const total =
    form.academic_weight + form.research_weight + form.milestone_weight + form.publication_weight + form.submission_weight;

  async function handleSave() {
    setMessage("");
    if (Math.abs(total - 100) > 0.01) {
      setMessage(`Weights must sum to 100 (currently ${total}).`);
      return;
    }
    setSaving(true);
    try {
      await updateProgressWeights(form);
      setMessage("Saved — all student progress scores have been recomputed.");
      queryClient.invalidateQueries({ queryKey: ["progress-weights"] });
    } catch {
      setMessage("Could not save weights.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecompute() {
    setRecomputing(true);
    try {
      const res = await recomputeAllProgress();
      setMessage(res.message);
    } finally {
      setRecomputing(false);
    }
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: "academic_weight", label: "Academic" },
    { key: "research_weight", label: "Research" },
    { key: "milestone_weight", label: "Milestones" },
    { key: "publication_weight", label: "Publications" },
    { key: "submission_weight", label: "Submissions" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Progress Scoring Weights</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-500">
          Controls how each student's overall progress score is computed. Must sum to 100.
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={form[key] as number}
                onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        <p className={`mt-3 text-sm ${Math.abs(total - 100) > 0.01 ? "text-rose-600" : "text-emerald-600"}`}>
          Total: {total}
        </p>
        {message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Weights"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleRecompute} disabled={recomputing}>
            <RefreshCw className="h-3.5 w-3.5" /> {recomputing ? "Recomputing…" : "Recompute All Students"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email: "", full_name: "", role: "student" as Role, password: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createManagedUser(form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Full Name">
          <input required className={inputClass} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
        </FormField>
        <FormField label="Email">
          <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </FormField>
        <FormField label="Role">
          <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
            <option value="admin">Admin</option>
            <option value="coordinator">Coordinator</option>
            <option value="supervisor">Supervisor</option>
            <option value="student">Student</option>
          </select>
        </FormField>
        <FormField label="Temporary Password">
          <input required type="text" className={inputClass} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </FormField>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Creating…" : "Create User"}</Button>
        </div>
      </form>
    </Modal>
  );
}
