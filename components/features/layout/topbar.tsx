import { GlobalSearch } from "@/components/features/layout/global-search";
import { UserMenu } from "@/components/features/layout/user-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/auth/session";

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <GlobalSearch />
      </div>
      <UserMenu user={user} />
    </header>
  );
}
