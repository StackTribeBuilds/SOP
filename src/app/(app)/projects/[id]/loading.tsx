import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <Skeleton className="h-10 w-64 mb-4" />
        
        <div className="border-b">
          <nav className="-mb-px flex space-x-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-24 mb-3" />
            ))}
          </nav>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mt-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card/50 shadow-sm p-4 h-64">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-20 w-full mb-3" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
