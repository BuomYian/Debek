import { listStaff } from "@/actions/admin-users";
import { InviteStaffDialog } from "@/components/features/admin/invite-staff-dialog";
import { StaffTable } from "@/components/features/admin/staff-table";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Staff & Users" };

export default async function AdminUsersPage() {
  const user = await requireRole(["admin"]);
  const result = await listStaff();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Staff & Users</h1>
          <p className="text-sm text-muted-foreground">
            Invite staff, assign roles, and deactivate accounts.
          </p>
        </div>
        <InviteStaffDialog />
      </div>

      {result.success ? (
        <StaffTable staff={result.data} currentUserId={user.id} />
      ) : (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
