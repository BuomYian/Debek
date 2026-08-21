"use client";

import { createColumnHelper } from "@tanstack/react-table";

import type { StaffMember } from "@/actions/admin-users";
import { Badge } from "@/components/ui/badge";
import { EditStaffDialog } from "@/components/features/admin/edit-staff-dialog";
import { StaffStatusToggle } from "@/components/features/admin/staff-status-toggle";
import type { AppTableFeatures } from "@/lib/table";

const ROLE_LABEL: Record<StaffMember["role"], string> = {
  admin: "Admin",
  doctor: "Doctor",
  receptionist: "Receptionist",
};

const columnHelper = createColumnHelper<AppTableFeatures, StaffMember>();

export function getStaffColumns(currentUserId: string) {
  return columnHelper.columns([
    columnHelper.accessor("fullName", {
      header: "Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.fullName}</span>
          {row.original.id === currentUserId && (
            <span className="text-xs text-muted-foreground">You</span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: ({ row }) => row.original.email ?? "—",
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: ({ row }) => <Badge variant="secondary">{ROLE_LABEL[row.original.role]}</Badge>,
    }),
    columnHelper.accessor("phone", {
      header: "Phone",
      cell: ({ row }) => row.original.phone ?? "—",
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge>Active</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <EditStaffDialog staff={row.original} />
          <StaffStatusToggle staff={row.original} isSelf={row.original.id === currentUserId} />
        </div>
      ),
    }),
  ]);
}
