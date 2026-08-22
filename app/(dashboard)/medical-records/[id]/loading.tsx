import { Skeleton } from "@/components/ui/skeleton";

export default function MedicalRecordLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
