import { Skeleton } from "@/components/ui/skeleton";

export function SportMatchListLoader() {
  return (
    <div className="space-y-8">
      <section>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
