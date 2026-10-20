import { Skeleton } from "@/components/ui/skeleton";

export default function MisUnidadesLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Grilla Bento / Cards de Unidades & Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-card rounded-3xl border border-border/80 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            {/* Contenedor de Foto */}
            <div className="relative aspect-video w-full">
              <Skeleton className="h-full w-full rounded-none" />
              <div className="absolute top-3 left-3">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="absolute top-3 right-3">
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-lg" />
                <Skeleton className="h-3.5 w-1/2 rounded-md" />
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
