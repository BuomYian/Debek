"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DoctorWithProfile } from "@/actions/doctors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

export function DoctorFilter({ doctors }: { doctors: DoctorWithProfile[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("doctorId") ?? ALL;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) {
      params.delete("doctorId");
    } else {
      params.set("doctorId", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-52">
        <SelectValue placeholder="All doctors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All doctors</SelectItem>
        {doctors.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.profile?.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
