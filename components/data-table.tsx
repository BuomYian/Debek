"use client";

import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tableFeatureSet, type AppTableFeatures } from "@/lib/table";

/**
 * Small, generic TanStack Table v9 + shadcn/ui wrapper. Client-side only
 * (no server-side pagination/sorting) — fine for short, fully-loaded
 * lists like the staff directory. Modules with large row counts
 * (patients, appointments) need actual server-side pagination per
 * Section 7's "server-side pagination everywhere (default 20 rows)"
 * requirement — those build their own fetch-and-page loop rather than
 * reusing this as-is.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = "No results.",
}: {
  columns: ColumnDef<AppTableFeatures, TData, unknown>[];
  data: TData[];
  emptyMessage?: string;
}) {
  const table = useTable({ features: tableFeatureSet, columns, data });

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
