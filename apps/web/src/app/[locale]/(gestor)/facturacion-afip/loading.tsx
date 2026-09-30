import { Skeleton } from "@/components/ui/skeleton";

export default function FacturacionAfipLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado con Botón de Emisión */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      {/* Apartado: Datos Fiscales del Emisor (ARCA / AFIP) */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border/60 p-5 bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-64 rounded-lg" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-80 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 3 Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-sm min-h-[120px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-36 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <div className="mt-2 space-y-1">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de Comprobantes Emitidos */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/60 space-y-1">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {/* Header de tabla */}
            <div className="grid grid-cols-6 gap-4 pb-2 border-b border-border/50 px-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-3 w-12 rounded ml-auto" />
            </div>
            {/* Filas */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-4 items-center p-2.5 rounded-xl bg-muted/10 border border-border/30"
              >
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3.5 w-36 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-7 w-7 rounded-lg ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
