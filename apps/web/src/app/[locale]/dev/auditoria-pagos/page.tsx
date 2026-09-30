import { Metadata } from 'next';
import { CreditCard, CheckCircle2, XCircle, Clock, ExternalLink, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AuditorÃ­a de Pagos Manuales | Consola de Devs - Rendo',
  description: 'AprobaciÃ³n o rechazo de comprobantes de transferencia y efectivo.',
};

const MOCK_PAGOS = [
  {
    id: 'pay-901',
    gestor: 'gestor@Rendo.com.ar',
    workspace: 'Inmobiliaria Norte',
    monto: '$ 45.000 ARS',
    concepto: 'Cupo 10 Unidades (Plan Mensual)',
    metodo: 'Transferencia Bancaria (CBU)',
    comprobante: 'comprobante_cbu_90123.pdf',
    fecha: '2026-09-11 16:40',
    estado: 'pendiente_revision',
  },
  {
    id: 'pay-902',
    gestor: 'carlos.propiedades@gmail.com',
    workspace: 'Carlos Propiedades',
    monto: '$ 80.000 ARS',
    concepto: 'Cupo 20 Unidades (Plan Semestral)',
    metodo: 'Efectivo en Sucursal',
    comprobante: 'recibo_caja_441.pdf',
    fecha: '2026-09-11 12:10',
    estado: 'pendiente_revision',
  },
];

export default function DevAuditoriaPagosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
              /auditoria-pagos-manuales
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            RevisiÃ³n manual de transferencias bancarias y recibos de caja para acreditaciÃ³n de cupos de publicaciÃ³n.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> 2 PENDIENTES DE VALIDACIÃ“N
          </span>
        </div>
      </div>

      {/* Grid de Pagos */}
      <div className="grid gap-4">
        {MOCK_PAGOS.map((pago) => (
          <div
            key={pago.id}
            className="p-5 rounded-xl border border-border/40 bg-card hover:border-border/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-primary/10 text-primary border border-primary/20">
                  {pago.metodo}
                </span>
                <span className="text-xs font-mono text-muted-foreground">REF: {pago.id}</span>
                <span className="text-xs font-mono text-muted-foreground">Fecha: {pago.fecha}</span>
              </div>

              <div>
                <h2 className="text-base font-semibold text-foreground font-mono">{pago.monto}</h2>
                <p className="text-xs font-medium text-primary">{pago.concepto}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Workspace: <span className="text-foreground font-medium">{pago.workspace}</span> ({pago.gestor})
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver Comprobante ({pago.comprobante})
                  <ExternalLink className="h-3 w-3 ml-0.5" />
                </button>
              </div>
            </div>

            {/* Acciones de AuditorÃ­a */}
            <div className="flex sm:flex-col md:flex-row items-center gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border/30">
              <button
                type="button"
                className="w-full md:w-auto px-4 py-2 text-xs font-mono font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprobar y Acreditar Cupo
              </button>
              <button
                type="button"
                className="w-full md:w-auto px-4 py-2 text-xs font-mono font-semibold rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 flex items-center justify-center gap-1.5 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
