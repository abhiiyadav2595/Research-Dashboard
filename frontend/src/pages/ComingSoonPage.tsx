import { Card, CardContent } from "@/components/ui/Card";

export function ComingSoonPage({ title, phase }: { title: string; phase: string }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">
          This module is scaffolded for <span className="font-medium">{phase}</span>. The backend API for it
          already exists — wire this page up next following the same pattern as the Dashboard and Student
          Directory pages.
        </p>
      </CardContent>
    </Card>
  );
}
