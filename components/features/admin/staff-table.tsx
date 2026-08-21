"use client";

import { useMemo } from "react";

import type { StaffMember } from "@/actions/admin-users";
import { DataTable } from "@/components/data-table";
import { getStaffColumns } from "@/components/features/admin/staff-columns";

export function StaffTable({ staff, currentUserId }: { staff: StaffMember[]; currentUserId: string }) {
  const columns = useMemo(() => getStaffColumns(currentUserId), [currentUserId]);
  return <DataTable columns={columns} data={staff} emptyMessage="No staff yet." />;
}
