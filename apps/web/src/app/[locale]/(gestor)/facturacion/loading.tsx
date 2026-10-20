import { Skeleton } from "@/components/ui/skeleton";

export default function FacturacionLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-md" />
      </div>

      {/* Estado Actual del Cupo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded-md mt-2" />
        </div>
      </div>

      {/* Selector Dinámico de Cupo */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-64 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Card Configuración de Cantidad */}
          <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-6">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-56 rounded-lg" />
              <Skeleton className="h-3.5 w-72 rounded-md" />
            </div>

            <div className="flex items-center justify-center gap-4 py-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-16 w-32 rounded-2xl" />
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>

            <div className="flex gap-2 justify-center">
              {[5, 10, 20, 50].map((q) => (
                <Skeleton key={q} className="h-8 w-16 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Card Resumen de Liquidación */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="space-y-2.5 py-2 border-y border-border/60">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
