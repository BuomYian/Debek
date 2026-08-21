import { Skeleton } from "@/components/ui/skeleton";

export default function DoctorsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="rounded-md border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-3 h-8" />
        ))}
      </div>
    </div>
  );
}
