import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow p-6">
           <Skeleton className="h-6 w-32 mb-6" />
           <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow p-6">
           <Skeleton className="h-6 w-32 mb-6" />
           <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    </div>
  );
}
