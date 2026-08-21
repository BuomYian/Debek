"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

/** Section 5.3: "Filter doctors by specialization." */
export function DoctorsToolbar({ specializations }: { specializations: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("specialization") ?? ALL;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) {
      params.delete("specialization");
    } else {
      params.set("specialization", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="All specializations" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All specializations</SelectItem>
        {specializations.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
