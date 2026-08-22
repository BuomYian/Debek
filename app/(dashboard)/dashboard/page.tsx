import { getAdminDashboard, getDoctorDashboard } from "@/actions/dashboard";
import { listTodaysQueue } from "@/actions/appointments";
import { AdminDashboardView } from "@/components/features/dashboard/admin-dashboard";
import { DoctorDashboardView } from "@/components/features/dashboard/doctor-dashboard";
import { ReceptionistDashboardView } from "@/components/features/dashboard/receptionist-dashboard";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Dashboard" };

const GREETING_BY_ROLE: Record<string, string> = {
  admin: "Today's appointments, patients seen, revenue, outstanding balance, and the week ahead.",
  doctor: "Today's schedule, patients seen this week, and your next appointment.",
  receptionist: "Today's queue, check-in actions, and a quick-book shortcut.",
};

/**
 * Section 5.1: "Auto-redirect to the correct dashboard after login."
 * One /dashboard route (Section 8) whose *content* is role-aware,
 * rather than a distinct URL per role.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Welcome back, {user.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">{GREETING_BY_ROLE[user.role]}</p>
      </div>

      {user.role === "admin" && <AdminDashboardContent />}
      {user.role === "doctor" && <DoctorDashboardContent />}
      {user.role === "receptionist" && <ReceptionistDashboardContent />}
    </div>
  );
}

async function AdminDashboardContent() {
  const result = await getAdminDashboard();
  if (!result.success) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {result.error}
      </p>
    );
  }
  return <AdminDashboardView data={result.data} />;
}

async function DoctorDashboardContent() {
  const result = await getDoctorDashboard();
  if (!result.success) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {result.error}
      </p>
    );
  }
  return <DoctorDashboardView data={result.data} />;
}

async function ReceptionistDashboardContent() {
  const result = await listTodaysQueue();
  return <ReceptionistDashboardView appointments={result.success ? result.data : []} />;
}
