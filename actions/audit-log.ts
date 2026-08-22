"use server";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult, Pagination } from "@/lib/validations/common";

export type AuditLogEntry = Database["public"]["Tables"]["audit_logs"]["Row"] & {
  user: { full_name: string } | null;
};

export type ListAuditLogInput = {
  page: number;
  pageSize: number;
  tableName?: string;
  action?: string;
};

/** Section 3: "View audit log: Admin only." Backed by 0018_audit_triggers.sql's DB-level trigger — nothing here writes to this table, only reads it. */
export async function listAuditLog(
  input: ListAuditLogInput,
): Promise<ActionResult<{ entries: AuditLogEntry[]; total: number; pagination: Pagination; tableNames: string[] }>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("audit_logs")
      .select("*, user:profiles(full_name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (input.tableName) query = query.eq("table_name", input.tableName);
    if (input.action) query = query.eq("action", input.action);

    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await query.range(from, from + input.pageSize - 1);
    if (error) throw error;

    // A cheap, small distinct-values query for the filter dropdown —
    // audit_logs.table_name only ever takes one of ~9 values, so a
    // full-table scan-free "distinct" via a capped select is fine here.
    const { data: tableRows } = await supabase.from("audit_logs").select("table_name").limit(1000);
    const tableNames = Array.from(new Set((tableRows ?? []).map((r) => r.table_name))).sort();

    return {
      success: true,
      data: {
        entries: (data ?? []) as AuditLogEntry[],
        total: count ?? 0,
        pagination: { page: input.page, pageSize: input.pageSize },
        tableNames,
      },
    };
  } catch (err) {
    console.error("listAuditLog failed", err);
    return { success: false, error: "Couldn't load the audit log." };
  }
}
