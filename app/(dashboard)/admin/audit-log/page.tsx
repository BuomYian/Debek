import { History } from "lucide-react";

import { listAuditLog } from "@/actions/audit-log";
import { DataTable } from "@/components/data-table";
import { AuditLogToolbar } from "@/components/features/admin/audit-log-toolbar";
import { auditLogColumns } from "@/components/features/admin/audit-log-columns";
import { PaginationControls } from "@/components/pagination-controls";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Audit Log" };

const PAGE_SIZE = 25;

export default async function AuditLogPage(props: PageProps<"/admin/audit-log">) {
  await requireRole(["admin"]);
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const tableName = typeof searchParams.table === "string" ? searchParams.table : undefined;
  const action = typeof searchParams.action === "string" ? searchParams.action : undefined;

  const result = await listAuditLog({ page, pageSize: PAGE_SIZE, tableName, action });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every create, update, and delete on clinical and financial data — written automatically by database
          triggers, not by the application (see supabase/migrations/0018_audit_triggers.sql).
        </p>
      </div>

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : (
        <>
          <AuditLogToolbar tableNames={result.data.tableNames} />
          {result.data.entries.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <History className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No audit entries match these filters.</p>
            </div>
          ) : (
            <>
              <DataTable columns={auditLogColumns} data={result.data.entries} />
              <PaginationControls page={page} pageSize={PAGE_SIZE} total={result.data.total} />
            </>
          )}
        </>
      )}
    </div>
  );
}
