"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";
const DEBOUNCE_MS = 300;

export function InvoicesToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(next: URLSearchParams) {
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  }

  function onStatusChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete("status");
    else params.set("status", value);
    pushParams(params);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("search", value);
      else params.delete("search");
      pushParams(params);
    }, DEBOUNCE_MS);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search invoice number…"
          className="pl-8"
          aria-label="Search invoices"
        />
      </div>
      <Select value={searchParams.get("status") ?? ALL} onValueChange={onStatusChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
          <SelectItem value="partially_paid">Partially paid</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
