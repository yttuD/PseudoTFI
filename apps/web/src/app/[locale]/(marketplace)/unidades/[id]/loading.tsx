import { Skeleton } from "@/components/ui/skeleton";

export default function UnidadDetailLoading() {
  return (
    <div className="w-full min-h-screen bg-background animate-fade-in">
      {/* Hero Image Gallery Skeleton */}
      <div className="w-full h-[45vh] md:h-[60vh] relative bg-muted">
        <div className="absolute inset-0 grid grid-cols-4 gap-1">
          {/* Foto Principal */}
          <div className="col-span-4 md:col-span-2 lg:col-span-3 relative overflow-hidden">
            <Skeleton className="w-full h-full rounded-none" />
          </div>
          {/* Miniaturas Laterales */}
          <div className="hidden md:grid col-span-2 lg:col-span-1 grid-rows-2 gap-1">
            <Skeleton className="w-full h-full rounded-none" />
            <Skeleton className="w-full h-full rounded-none" />
          </div>
        </div>

        {/* Floating Top Nav within Hero */}
        <div className="absolute top-6 w-full">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12 max-w-6xl relative -mt-16 md:-mt-24 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna Izquierda: Ficha y Detalles */}
          <div className="lg:col-span-2 space-y-8 bg-card/95 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-sm border border-border/70">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              {/* Título de la Unidad */}
              <div className="space-y-2 mb-4">
                <Skeleton className="h-9 w-4/5 rounded-xl" />
                <Skeleton className="h-7 w-3/5 rounded-lg" />
              </div>
            </div>

            {/* Tabs de Contenido */}
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-border/60 pb-2">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>

              {/* Párrafos de Descripción */}
              <div className="space-y-2.5 pt-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>

              {/* Grilla de Amenities / Comodidades */}
              <div className="pt-4 border-t border-border/60 space-y-3">
                <Skeleton className="h-4 w-36 rounded-md" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/50"
                    >
                      <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Sección Mapa Leaflet */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-40 rounded-md" />
                </div>
              </div>
              <div className="border border-border/80 rounded-2xl overflow-hidden h-80 min-h-[300px] relative shadow-sm">
                <Skeleton className="w-full h-full rounded-2xl" />
              </div>
            </div>
          </div>

          {/* Columna Derecha: Sticky CTA Panel */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
            <div className="bg-card border border-border/80 p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-36 rounded-md" />
              </div>

              {/* Lista de Precios */}
              <div className="space-y-4 py-2 border-y border-border/50">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-8 w-36 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-8 w-32 rounded-lg" />
                </div>
              </div>

              {/* Botón WhatsApp & Disclaimer */}
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-3 w-48 mx-auto rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
