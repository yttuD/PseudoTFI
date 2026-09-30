import { Metadata } from 'next';
import { ShieldAlert, CheckCircle, Ban, AlertCircle, Filter } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ModeraciÃ³n Global | Consola de Devs - Rendo',
  description: 'Cola de unidades y perfiles que superan el umbral de denuncias automÃ¡ticas.',
};

// Mock inicial representativo de cola de moderaciÃ³n por umbral (>50 reportes)
const MOCK_REVIEWS = [
  {
    id: 'rev-001',
    tipo: 'unidad',
    target: 'Departamento 2 Ambientes Palermo',
    propietario: 'gestor@Rendo.com.ar',
    reportes: 54,
    motivo_principal: 'Discrepancia severa en fotos y precio falso',
    estado: 'pendiente',
    fecha: '2026-09-11 18:30',
  },
  {
    id: 'rev-002',
    tipo: 'perfil',
    target: 'Inmobiliaria Fake S.A.',
    propietario: 'contacto@fake-inmo.com',
    reportes: 62,
    motivo_principal: 'Intento de estafa por cobro previo a visita',
    estado: 'en_analisis',
    fecha: '2026-09-10 14:15',
  },
];

export default function DevModeracionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
              /cola-moderacion-global
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cola de revisiÃ³n preventiva activada por umbral automÃ¡tico (&gt; 50 reportes comunitarios acumulados).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            2 CASOS PENDIENTES
          </span>
        </div>
      </div>

      {/* Tabla de incidentes */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/30 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono font-medium uppercase text-muted-foreground">Filtro de Umbral</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Criterio actual: Reportes &gt;= 50
          </span>
        </div>

        <div className="divide-y divide-border/20 overflow-x-auto">
          {MOCK_REVIEWS.map((item) => (
            <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-primary/15 text-primary">
                    {item.tipo}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">ID: {item.id}</span>
                  <span className="text-xs font-mono text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {item.reportes} denuncias
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-foreground">{item.target}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Propietario / Workspace: <span className="text-foreground">{item.propietario}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-400/90 pt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.motivo_principal}</span>
                </div>
              </div>

              {/* Acciones del Operador */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Desestimar
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1.5 transition-colors"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Suspender Unidad
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
