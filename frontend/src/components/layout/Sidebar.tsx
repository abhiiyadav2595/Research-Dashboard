import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  GitBranch,
  Users2,
  BarChart3,
  FileDown,
  Bell,
  Settings,
  GraduationCap,
  CreditCard,
  Database,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "coordinator", "supervisor"] },
  { to: "/students", label: "Student Directory", icon: Users, roles: ["admin", "coordinator", "supervisor"] },
  { to: "/billing", label: "Billing & Transactions", icon: CreditCard, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/dbms", label: "DBMS Showcase", icon: Database, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/research", label: "Research & Publications", icon: FileText, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/submissions", label: "Submissions", icon: ClipboardList, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/milestones", label: "Milestones", icon: GitBranch, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/supervisor", label: "Supervisor Dashboard", icon: Users2, roles: ["supervisor"] },
  { to: "/analytics", label: "Department Analytics", icon: BarChart3, roles: ["admin", "coordinator"] },
  { to: "/reports", label: "Reports", icon: FileDown, roles: ["admin", "coordinator"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "coordinator", "supervisor", "student"] },
  { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <GraduationCap className="h-6 w-6 text-brand-600" />
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Scholar Progress</p>
          <p className="text-xs text-slate-400">Research & PG Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
