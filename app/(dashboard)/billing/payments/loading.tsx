import { Skeleton } from "@/components/ui/skeleton";

export default function OutstandingBalancesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-56" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
