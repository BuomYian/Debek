import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  FileText,
  LayoutDashboard,
  ListChecks,
  Pill,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";

import type { UserRole } from "@/lib/auth/session";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

/**
 * What each role sees in the sidebar. This mirrors — but does not
 * replace — the real access control: hiding a link here is a UX
 * courtesy, not a security boundary. The actual boundary is the layout
 * guards (lib/auth/guards.ts) and RLS (supabase/migrations/0020), which
 * apply regardless of what's rendered here.
 *
 * Medical Records has no link of its own: per Section 8's route table it
 * has no list page (only /medical-records/[id] and /new), reached
 * instead from a patient's record tabs or from completing an
 * appointment.
 */
const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  admin: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Patients", href: "/patients", icon: Users },
        { label: "Doctors", href: "/doctors", icon: Stethoscope },
        { label: "Appointments", href: "/appointments", icon: CalendarClock },
        { label: "Prescriptions", href: "/prescriptions", icon: Pill },
        { label: "Billing", href: "/billing/invoices", icon: Receipt },
        { label: "Outstanding Balances", href: "/billing/payments", icon: Wallet },
        { label: "Reports", href: "/reports", icon: FileText },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Staff & Users", href: "/admin/users", icon: ShieldCheck },
        { label: "Audit Log", href: "/admin/audit-log", icon: ListChecks },
      ],
    },
  ],
  doctor: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "My Schedule", href: "/doctors/schedule", icon: CalendarClock },
        { label: "Patients", href: "/patients", icon: Users },
        { label: "Appointments", href: "/appointments", icon: Stethoscope },
        { label: "Prescriptions", href: "/prescriptions", icon: Pill },
      ],
    },
  ],
  receptionist: [
    {
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Patients", href: "/patients", icon: Users },
        { label: "Doctors", href: "/doctors", icon: Stethoscope },
        { label: "Appointments", href: "/appointments", icon: CalendarClock },
        { label: "Today's Queue", href: "/appointments/queue", icon: ListChecks },
        { label: "Billing", href: "/billing/invoices", icon: Receipt },
        { label: "Outstanding Balances", href: "/billing/payments", icon: Wallet },
      ],
    },
  ],
};

export function getNavSections(role: UserRole): NavSection[] {
  return NAV_BY_ROLE[role];
}
