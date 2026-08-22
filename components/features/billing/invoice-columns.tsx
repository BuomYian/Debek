"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import Link from "next/link";

import type { InvoiceWithDetails } from "@/actions/billing";
import { InvoiceStatusBadge } from "@/components/features/billing/invoice-status-badge";
import type { AppTableFeatures } from "@/lib/table";

const columnHelper = createColumnHelper<AppTableFeatures, InvoiceWithDetails>();

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export const invoiceColumns = columnHelper.columns([
  columnHelper.accessor("invoice_number", {
    header: "Invoice #",
    cell: ({ row }) => (
      <Link href={`/billing/${row.original.id}`} className="font-mono text-xs font-medium hover:underline">
        {row.original.invoice_number}
      </Link>
    ),
  }),
  columnHelper.display({
    id: "patient",
    header: "Patient",
    cell: ({ row }) =>
      row.original.patient ? `${row.original.patient.first_name} ${row.original.patient.last_name}` : "—",
  }),
  columnHelper.accessor("issue_date", {
    header: "Issued",
    cell: ({ row }) => format(parseISO(row.original.issue_date), "d MMM yyyy"),
  }),
  columnHelper.accessor("total", {
    header: "Total",
    cell: ({ row }) => money(row.original.total),
  }),
  columnHelper.accessor("balance", {
    header: "Balance",
    cell: ({ row }) => money(row.original.balance ?? 0),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  }),
]);
