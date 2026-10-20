import { Skeleton } from "@/components/ui/skeleton";

export default function UnidadesCatalogLoading() {
  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filtros Desktop Skeleton */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
          <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-xl" />
                ))}
              </div>
            </div>

            {/* Rango de Precios */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Skeleton className="h-4 w-32 rounded-md" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full rounded-xl" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-64 rounded-xl" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-card rounded-3xl border border-border/80 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Skeleton className="h-full w-full rounded-none" />
                  <div className="absolute top-3 left-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-4/5 rounded-lg" />
                    <Skeleton className="h-3.5 w-1/2 rounded-md" />
                  </div>
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                    <Skeleton className="h-6 w-28 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
