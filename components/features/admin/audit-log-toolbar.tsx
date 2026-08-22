"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";
const ACTIONS = ["INSERT", "UPDATE", "DELETE"];

export function AuditLogToolbar({ tableNames }: { tableNames: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={searchParams.get("table") ?? ALL} onValueChange={(v) => setParam("table", v)}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All tables" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tables</SelectItem>
          {tableNames.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={searchParams.get("action") ?? ALL} onValueChange={(v) => setParam("action", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {ACTIONS.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
