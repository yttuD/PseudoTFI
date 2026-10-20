import { Skeleton } from "@/components/ui/skeleton";

export default function MetricasLoading() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header & Filtros Rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-72 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-9 w-52 rounded-2xl" />
          <Skeleton className="h-9 w-40 rounded-2xl" />
          <Skeleton className="h-9 w-28 rounded-2xl" />
        </div>
      </div>

      {/* BLOQUE 1: 4 KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card p-5 sm:p-6 rounded-3xl border border-border/80 shadow-sm min-h-[130px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-2xl" />
            </div>
            <div className="mt-2 space-y-1.5">
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* BLOQUE 2: Gráfico de Evolución Temporal Continua */}
      <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-72 rounded-md" />
          </div>
          <Skeleton className="h-8 w-64 rounded-2xl" />
        </div>

        <div className="h-72 sm:h-80 w-full flex items-end gap-3 pt-4 px-2">
          {[40, 65, 30, 80, 55, 90, 45, 70, 85, 60, 95, 50, 75, 85, 60].map((h, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <Skeleton
                className="w-full rounded-t-lg"
                style={{ height: `${h}%` }}
              />
              <Skeleton className="h-2.5 w-6 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* BLOQUE 3: Distribución y Rendimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Categoría */}
        <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm space-y-5">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Rendimiento Individual de Unidades */}
        <div className="lg:col-span-2 bg-card p-6 rounded-3xl border border-border/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-52 rounded-lg" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-48 rounded-md" />
                    <Skeleton className="h-4 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-32 rounded-md" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-2 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOQUE 4: Módulo Financiero y CRM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-2.5 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl border border-border/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-2.5 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
