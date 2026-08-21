"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { searchPatients, type Patient } from "@/actions/patients";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * Section 6: "Global search (⌘K / Ctrl+K) for patients and
 * appointments." Patients only for now — appointments join in Phase 6,
 * once that data exists.
 */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPatients(value);
        setResults(result.success ? result.data : []);
      });
    }, 250);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
    }
  }

  function onSelect(id: string) {
    onOpenChange(false);
    router.push(`/patients/${id}`);
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-full max-w-64 justify-start gap-2 px-2.5 text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 text-left text-sm">Search patients…</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search"
        description="Search patients by name, phone, or patient number"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search by name, phone, or patient number…" value={query} onValueChange={onQueryChange} />
          <CommandList>
            {query.trim() && !isPending && results.length === 0 && <CommandEmpty>No patients found.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Patients">
                {results.map((patient) => (
                  <CommandItem key={patient.id} value={patient.id} onSelect={() => onSelect(patient.id)}>
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
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
