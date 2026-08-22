"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import type { AuditLogEntry } from "@/actions/audit-log";
import { AuditLogChangesDialog } from "@/components/features/admin/audit-log-changes-dialog";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/lib/table";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const columnHelper = createColumnHelper<AppTableFeatures, AuditLogEntry>();

export const auditLogColumns = columnHelper.columns([
  columnHelper.accessor("created_at", {
    header: "When",
    cell: ({ row }) => format(parseISO(row.original.created_at), "d MMM yyyy, HH:mm:ss"),
  }),
  columnHelper.display({
    id: "user",
    header: "User",
    cell: ({ row }) => row.original.user?.full_name ?? "System",
  }),
  columnHelper.accessor("action", {
    header: "Action",
    cell: ({ row }) => <Badge variant={ACTION_VARIANT[row.original.action] ?? "outline"}>{row.original.action}</Badge>,
  }),
  columnHelper.accessor("table_name", {
    header: "Table",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.table_name}</span>,
  }),
  columnHelper.accessor("record_id", {
    header: "Record",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.record_id?.slice(0, 8) ?? "—"}</span>,
  }),
  columnHelper.display({
    id: "changes",
    header: "",
    cell: ({ row }) => <AuditLogChangesDialog changes={row.original.changes} />,
  }),
]);
