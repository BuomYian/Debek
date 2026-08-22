"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { getPatient, searchPatients, type Patient } from "@/actions/patients";
import { QuickRegisterPatientDialog } from "@/components/features/appointments/quick-register-patient-dialog";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function PatientPicker({
  value,
  selected,
  onSelect,
}: {
  value: string | undefined;
  /** The full patient object for `value`, if already known — avoids a re-fetch just to render the trigger label. */
  selected?: Patient | null;
  onSelect: (patient: Patient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(next: string) {
    setQuery(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!next.trim()) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPatients(next);
        setResults(result.success ? result.data : []);
      });
    }, 250);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span>
              {selected.first_name} {selected.last_name}{" "}
              <span className="text-muted-foreground">({selected.patient_number})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a patient…</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name, phone, or patient number…" value={query} onValueChange={onQueryChange} />
          <CommandList>
            {query.trim() && !isPending && results.length === 0 && <CommandEmpty>No patients found.</CommandEmpty>}
            <CommandGroup>
              {results.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => {
                    onSelect(patient);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("size-4", value === patient.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>
                      {patient.first_name} {patient.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {patient.patient_number} · {patient.phone}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-2">
            <QuickRegisterPatientDialog
              onRegistered={(id) => {
                setOpen(false);
                startTransition(async () => {
                  const result = await getPatient(id);
                  if (result.success) onSelect(result.data);
                });
              }}
            />
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
