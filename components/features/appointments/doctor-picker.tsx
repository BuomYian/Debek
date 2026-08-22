"use client";

import { useEffect, useState, useTransition } from "react";

import { listDoctors, listSpecializations, type DoctorWithProfile } from "@/actions/doctors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all__";

/** Section 5.4: "select doctor or specialization." */
export function DoctorPicker({
  value,
  onSelect,
}: {
  value: string | undefined;
  onSelect: (doctor: DoctorWithProfile) => void;
}) {
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specialization, setSpecialization] = useState<string>(ALL);
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listSpecializations();
      if (result.success) setSpecializations(result.data);
    });
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const result = await listDoctors(specialization === ALL ? {} : { specialization });
      setDoctors(result.success ? result.data.filter((d) => d.is_accepting_appointments) : []);
    });
  }, [specialization]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Specialization</span>
        <Select value={specialization} onValueChange={setSpecialization}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any specialization</SelectItem>
            {specializations.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Doctor</span>
        <Select
          value={value}
          onValueChange={(id) => {
            const doctor = doctors.find((d) => d.id === id);
            if (doctor) onSelect(doctor);
          }}
          disabled={isPending || doctors.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={doctors.length === 0 ? "No doctors available" : "Select a doctor"} />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.profile?.full_name} · {d.specialization}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
