import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { clsx } from "clsx";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "brand" | "danger" | "success" | "neutral" | "warning";
}

const TONE_CLASSES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function KpiCard({ label, value, icon: Icon, tone = "neutral" }: KpiCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </Card>
  );
}
