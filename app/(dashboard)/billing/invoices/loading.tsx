import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="rounded-md border">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="m-3 h-8" />
        ))}
      </div>
    </div>
  );
}
