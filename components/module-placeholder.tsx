import { Construction } from "lucide-react";

/**
 * Temporary placeholder for routes that are scaffolded (Phase 1: folder
 * structure) but whose feature logic ships in a later build phase per
 * Section 10 of the build spec. Every real module replaces this with its
 * own page implementation when its phase is built.
 */
export function ModulePlaceholder({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      <Construction className="size-8 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">Scheduled for {phase}.</p>
    </div>
  );
}
