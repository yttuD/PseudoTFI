import { Skeleton } from "@/components/ui/skeleton";

export default function DelegadosLoading() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Tabla de Delegados */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden p-4 space-y-3">
        <div className="grid grid-cols-4 gap-4 pb-3 border-b border-border/60 px-3">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3.5 w-16 rounded ml-auto" />
        </div>

        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 items-center p-3 rounded-xl bg-muted/15 border border-border/40"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-40 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-xl ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
