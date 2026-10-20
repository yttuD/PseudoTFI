import { Skeleton } from "@/components/ui/skeleton";

export default function LogsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-2xl border border-border/80 bg-card shadow-sm space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Tabla de Auditoría */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden p-4 space-y-3">
        <div className="grid grid-cols-5 gap-4 pb-3 border-b border-border/60 px-3">
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-16 rounded ml-auto" />
        </div>

        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="grid grid-cols-5 gap-4 items-center p-3 rounded-xl bg-muted/15 border border-border/40"
          >
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
