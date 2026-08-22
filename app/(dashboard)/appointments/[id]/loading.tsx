import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentDetailLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
