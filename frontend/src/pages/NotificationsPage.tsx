import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, History } from "lucide-react";
import { fetchAuditLogs, fetchNotifications, markNotificationRead } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled: user?.role === "admin",
  });

  async function handleMarkRead(id: number) {
    await markNotificationRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Bell className="h-4 w-4 text-slate-400" />
          <CardTitle>Your Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !notifications || notifications.length === 0 ? (
            <p className="text-sm text-slate-400">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${
                  n.is_read
                    ? "border-slate-100 dark:border-slate-800"
                    : "border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-900/10"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    {n.category} · {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                  </p>
                </div>
                {!n.is_read && (
                  <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {user?.role === "admin" && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <History className="h-4 w-4 text-slate-400" />
            <CardTitle>System Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] space-y-2 overflow-y-auto">
            {!auditLogs || auditLogs.length === 0 ? (
              <p className="text-sm text-slate-400">No activity recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-2 text-xs dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{log.user}</span>{" "}
                  <span className="text-slate-500">{log.action}</span>
                  {log.entity_type && <span className="text-slate-400"> · {log.entity_type} #{log.entity_id}</span>}
                  <div className="text-[10px] text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString() : ""}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
