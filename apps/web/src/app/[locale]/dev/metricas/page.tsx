import { Metadata } from 'next';
import { Activity, Server, Database, Zap, Cpu, ShieldCheck, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'MÃ©tricas de Infraestructura | Consola de Devs - Rendo',
  description: 'Monitoreo de latencia, consumo de memoria, pool de PostgreSQL y cupos globales.',
};

export default function DevMetricasPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
              /telemetria-metricas-sistema
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoreo en tiempo real de rendimiento de API, pool de conexiones de Supabase y salud del clÃºster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> TODOS LOS SERVICIOS OPERACIONALES
          </span>
        </div>
      </div>

      {/* Grid de MÃ©tricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/40 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono uppercase">Latencia Media API</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">34 ms</div>
          <p className="text-[11px] text-emerald-400 mt-1 font-mono">p95: 88 ms | p99: 142 ms</p>
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono uppercase">Pool PostgreSQL</span>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">12 / 60</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">20% saturaciÃ³n mÃ¡x</p>
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono uppercase">Cupos Asignados</span>
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">148 u.</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">82% ocupaciÃ³n en Gestores</p>
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-mono uppercase">Memoria Node (RSS)</span>
            <Cpu className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">214 MB</div>
          <p className="text-[11px] text-emerald-400 mt-1 font-mono">Heap estable sin leaks</p>
        </div>
      </div>

      {/* Desglose de Servicios y SLIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-border/40 bg-card space-y-4">
          <h2 className="text-sm font-semibold font-mono text-foreground flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            Estado de Componentes de Infraestructura
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-foreground">NestJS API Core (Port 3005)</span>
              <span className="text-emerald-400 font-semibold">UP (100.0% uptime)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-foreground">Next.js Web Frontend (Port 3000)</span>
              <span className="text-emerald-400 font-semibold">UP (100.0% uptime)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-foreground">Supabase PostgreSQL 15 & Auth</span>
              <span className="text-emerald-400 font-semibold">UP (100.0% uptime)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <span className="text-foreground">Mercado Pago Webhook Ingestion</span>
              <span className="text-emerald-400 font-semibold">READY</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border/40 bg-card space-y-4">
          <h2 className="text-sm font-semibold font-mono text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            LÃ­mites y Umbrales Operativos
          </h2>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 flex justify-between items-center">
              <div>
                <div className="text-foreground font-semibold">Timeout ResoluciÃ³n SSR</div>
                <div className="text-[11px] text-muted-foreground">AbortSignal estricto de cliente</div>
              </div>
              <span className="text-primary font-bold">400 ms</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 flex justify-between items-center">
              <div>
                <div className="text-foreground font-semibold">Umbral Cola de ModeraciÃ³n</div>
                <div className="text-[11px] text-muted-foreground">Denuncias para disparo automÃ¡tico</div>
              </div>
              <span className="text-amber-400 font-bold">&gt; 50 reportes</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30 flex justify-between items-center">
              <div>
                <div className="text-foreground font-semibold">Cupo Inicial Trial Gestor</div>
                <div className="text-[11px] text-muted-foreground">Alta de nuevo workspace</div>
              </div>
              <span className="text-emerald-400 font-bold">3 unidades</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
