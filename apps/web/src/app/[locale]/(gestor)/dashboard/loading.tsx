import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-8 w-64 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Grid Superior: 3 Tarjetas Métricas Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Cupo */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-3.5 w-44 rounded-md" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex items-center justify-center py-6">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40 mx-auto rounded-md" />
        </div>

        {/* Card 2: Alquileres Activos */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded-lg" />
              <Skeleton className="h-3.5 w-40 rounded-md" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="p-4 bg-muted/20 rounded-2xl space-y-3">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-3 w-28 rounded-md" />
            <div className="pt-3 border-t border-border/50 flex justify-between">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-3 w-8 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>

        {/* Card 3: Terminal Financiero */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36 rounded-lg" />
              <Skeleton className="h-3.5 w-44 rounded-md" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-28 rounded-md" />
              <Skeleton className="h-3.5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl mt-2" />
          </div>
          <Skeleton className="h-3 w-36 rounded-md" />
        </div>
      </div>

      {/* Grid Inferior: 2 Widgets Modulares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Widget A: Equipo & Delegados */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-2.5 w-40 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end">
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        </div>

        {/* Widget B: Registro de Actividad Reciente */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-52 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                <Skeleton className="h-7 w-7 rounded-lg shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-2.5 w-14 rounded-md" />
                  </div>
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end">
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
