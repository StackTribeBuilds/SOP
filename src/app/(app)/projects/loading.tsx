import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground shadow p-6 flex flex-col h-48">
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-auto" />
            <div className="mt-4 space-y-3">
               <div className="flex justify-between">
                 <Skeleton className="h-4 w-20" />
                 <Skeleton className="h-4 w-12" />
               </div>
               <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
