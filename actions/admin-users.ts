"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { getSiteUrl } from "@/lib/site";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validations/common";
import {
  inviteStaffSchema,
  updateStaffSchema,
  type InviteStaffInput,
  type UpdateStaffInput,
} from "@/lib/validations/auth";

export type StaffMember = {
  id: string;
  email: string | null;
  fullName: string;
  role: "admin" | "doctor" | "receptionist";
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

/**
 * Reading auth.users (for email) requires the service-role client —
 * that table isn't exposed through PostgREST/RLS to the `authenticated`
 * role at all, admin or not. Every mutation below still re-checks
 * `role === 'admin'` first regardless of which client it then uses.
 */
export async function listStaff(): Promise<ActionResult<StaffMember[]>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const service = await createServiceRoleClient();

    const { data: profiles, error: profilesError } = await service
      .from("profiles")
      .select("id, full_name, role, phone, is_active, created_at")
      .order("created_at", { ascending: true });
    if (profilesError) throw profilesError;

    const { data: usersPage, error: usersError } = await service.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    const emailById = new Map(usersPage.users.map((u) => [u.id, u.email ?? null]));

    const staff: StaffMember[] = (profiles ?? []).map((p) => ({
      id: p.id,
      email: emailById.get(p.id) ?? null,
      fullName: p.full_name,
      role: p.role,
      phone: p.phone,
      isActive: p.is_active,
      createdAt: p.created_at,
    }));

    return { success: true, data: staff };
  } catch (err) {
    console.error("listStaff failed", err);
    return { success: false, error: "Couldn't load staff list. Please try again." };
  }
}

export async function inviteStaff(input: InviteStaffInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { email, fullName, role, phone } = parsed.data;

  try {
    const service = await createServiceRoleClient();
    const { error } = await service.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role, phone: phone || null },
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err) {
    console.error("inviteStaff failed", err);
    return { success: false, error: "Couldn't send the invite. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true, data: null };
}

/**
 * Updates an existing profile's name/role/phone. Runs through the
 * admin's own authenticated client (not service-role) so this is
 * actually exercised by RLS + the privilege-escalation trigger
 * (0004_profiles.sql), not just gated by the check above — the
 * defence-in-depth Section 3 asks for.
 */
export async function updateStaffProfile(input: UpdateStaffInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { id, fullName, role, phone } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role, phone: phone || null })
      .eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err) {
    console.error("updateStaffProfile failed", err);
    return { success: false, error: "Couldn't update that staff member. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true, data: null };
}

export async function setStaffActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  if (id === auth.user.id && !isActive) {
    return { success: false, error: "You can't deactivate your own account." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err) {
    console.error("setStaffActive failed", err);
    return { success: false, error: "Couldn't update that staff member. Please try again." };
  }

  revalidatePath("/admin/users");
  return { success: true, data: null };
}
