import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { FilterProvider } from "@/context/FilterContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { StudentDirectoryPage } from "@/pages/StudentDirectoryPage";
import { StudentProfilePage } from "@/pages/StudentProfilePage";
import { ResearchPublicationsPage } from "@/pages/ResearchPublicationsPage";
import { SubmissionsPage } from "@/pages/SubmissionsPage";
import { MilestonesPage } from "@/pages/MilestonesPage";
import { DepartmentAnalyticsPage } from "@/pages/DepartmentAnalyticsPage";
import { SupervisorDashboardPage } from "@/pages/SupervisorDashboardPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { BillingPage } from "@/pages/BillingPage";
import { DBMSExplorerPage } from "@/pages/DBMSExplorerPage";
import type { Role } from "@/types";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Protected({ title, children, roles }: { title: string; children: ReactNode; roles?: Role[] }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout title={title}>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FilterProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/" element={<Protected title="Main Dashboard"><DashboardPage /></Protected>} />
              <Route path="/students" element={<Protected title="Student Directory"><StudentDirectoryPage /></Protected>} />
              <Route path="/students/:id" element={<Protected title="Student Profile"><StudentProfilePage /></Protected>} />
              <Route path="/billing" element={<Protected title="Tuition & Research Billing Ledger"><BillingPage /></Protected>} />
              <Route path="/dbms" element={<Protected title="DBMS Architectural Concepts"><DBMSExplorerPage /></Protected>} />

              <Route path="/research" element={<Protected title="Research & Publications"><ResearchPublicationsPage /></Protected>} />
              <Route path="/submissions" element={<Protected title="Submissions"><SubmissionsPage /></Protected>} />
              <Route path="/milestones" element={<Protected title="Milestones"><MilestonesPage /></Protected>} />
              <Route path="/supervisor" element={<Protected title="Supervisor Dashboard" roles={["supervisor"]}><SupervisorDashboardPage /></Protected>} />
              <Route path="/analytics" element={<Protected title="Department Analytics" roles={["admin", "coordinator"]}><DepartmentAnalyticsPage /></Protected>} />
              <Route path="/reports" element={<Protected title="Reports" roles={["admin", "coordinator"]}><ReportsPage /></Protected>} />
              <Route path="/notifications" element={<Protected title="Notifications"><NotificationsPage /></Protected>} />
              <Route path="/settings" element={<Protected title="Settings" roles={["admin"]}><SettingsPage /></Protected>} />
            </Routes>
          </BrowserRouter>
        </FilterProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
