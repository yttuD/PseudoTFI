import { Skeleton } from "@/components/ui/skeleton";

export default function AlquileresLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tabla de Contratos y Reservas */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="space-y-3">
            {/* Cabecera de la tabla */}
            <div className="grid grid-cols-6 gap-4 pb-3 border-b border-border/60 px-3">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-3.5 w-16 rounded ml-auto" />
            </div>

            {/* 5 Filas de Contratos */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4 items-center p-3 rounded-xl bg-muted/15 border border-border/40"
              >
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
