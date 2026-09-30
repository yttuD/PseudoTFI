import { Skeleton } from "@/components/ui/skeleton";

export default function InquilinosLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tabla de Inquilinos */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="space-y-3">
            {/* Header de tabla */}
            <div className="grid grid-cols-4 gap-4 pb-3 border-b border-border/60 px-3">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
            </div>

            {/* Filas */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-4 gap-4 items-center p-3 rounded-xl bg-muted/15 border border-border/40"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-36 rounded-md" />
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
