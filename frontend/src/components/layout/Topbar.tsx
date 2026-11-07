import { useEffect, useState } from "react";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
          <User className="h-4 w-4 text-slate-500" />
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{user?.full_name}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{user?.role}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" /> Log out
        </Button>
      </div>
    </header>
  );
}
