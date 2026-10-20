"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  Search,
  User,
  AlertCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LogEntry {
  id: string;
  actorNombre: string;
  actorEmail: string;
  actorRol: "gestor" | "delegado" | "sistema";
  accion:
    | "crear_unidad"
    | "modificar_precio"
    | "crear_alquiler"
    | "borrar_inquilino"
    | "cambio_estado"
    | "invitar_delegado";
  entidadTipo: "unidad" | "alquiler" | "inquilino" | "delegado" | "pago";
  entidadRef: string;
  detalles: string;
  fecha: string;
  ipOrigen: string;
}

const ACCION_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  crear_unidad: {
    label: "Crear Unidad",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  modificar_precio: {
    label: "Modificar Precio",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  crear_alquiler: {
    label: "Nuevo Alquiler",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  borrar_inquilino: {
    label: "Borrar Inquilino",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  cambio_estado: {
    label: "Cambio de Estado",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  invitar_delegado: {
    label: "Invitar Delegado",
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
};

export default function LogsClientView({
  initialLogs = [],
  initialError = false,
}: {
  initialLogs?: LogEntry[];
  initialError?: boolean;
}) {
  const [logs] = useState<LogEntry[]>(initialLogs);
  const [actorFilter, setActorFilter] = useState<string>("todos");
  const [accionFilter, setAccionFilter] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actorFilter !== "todos" && log.actorRol !== actorFilter) return false;
      if (accionFilter !== "todas" && log.accion !== accionFilter) return false;
      if (fechaDesde && log.fecha < fechaDesde) return false;
      if (fechaHasta && log.fecha > fechaHasta + " 23:59") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchText =
          log.detalles.toLowerCase().includes(q) ||
          log.actorNombre.toLowerCase().includes(q) ||
          log.actorEmail.toLowerCase().includes(q) ||
          log.entidadRef.toLowerCase().includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [logs, actorFilter, accionFilter, searchQuery, fechaDesde, fechaHasta]);

  const handleResetFilters = () => {
    setActorFilter("todos");
    setAccionFilter("todas");
    setSearchQuery("");
    setFechaDesde("");
    setFechaHasta("");
  };

  if (initialError) {
    return (
      <div data-testid="logs-api-error" className="w-full max-w-5xl mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Registro de Actividad
            </h1>
            <p className="text-xs sm:text-sm text-destructive dark:text-rose-400 mt-1 font-mono">
              Error al consultar el servicio de auditoría de logs.
            </p>
          </div>
        </div>
        <div className="p-8 rounded-2xl bg-card border border-border shadow-xs text-center space-y-4">
          <p className="text-sm text-muted-foreground dark:text-[#AEB7C7] max-w-md mx-auto">
            No se pudo obtener el historial de eventos del workspace. Por favor revise su conexión y reintente.
          </p>
          <div className="pt-2">
            <a
              href="/es/logs"
              className="px-5 py-2.5 min-h-[44px] inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              Reintentar Conexión
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <History className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Registro de Actividad
            </h1>
          </div>
          <p className="text-muted-foreground dark:text-[#AEB7C7] mt-1.5 font-mono text-xs sm:text-sm">
            Auditoría cronológica de eventos internos del workspace (Gestor y Delegados)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 min-h-[36px] flex items-center">
            {filteredLogs.length} eventos registrados
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs min-h-[44px] px-3">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Limpiar
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Combinables */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-md shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por detalle, actor o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 min-h-[44px] h-11 text-xs font-mono"
            />
          </div>

          {/* Filtro por Actor */}
          <div>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full min-h-[44px] h-11 px-3 rounded-md border border-input bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="todos">Todos los actores</option>
              <option value="gestor">Solo Gestor Principal</option>
              <option value="delegado">Solo Delegados</option>
            </select>
          </div>

          {/* Filtro por Tipo de Acción */}
          <div>
            <select
              value={accionFilter}
              onChange={(e) => setAccionFilter(e.target.value)}
              className="w-full min-h-[44px] h-11 px-3 rounded-md border border-input bg-background text-foreground text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              <option value="todas">Todas las acciones</option>
              <option value="crear_unidad">Crear Unidad</option>
              <option value="modificar_precio">Modificar Precio</option>
              <option value="crear_alquiler">Crear Alquiler</option>
              <option value="borrar_inquilino">Borrar Inquilino</option>
              <option value="cambio_estado">Cambio de Estado</option>
              <option value="invitar_delegado">Invitar Delegado</option>
            </select>
          </div>

          {/* Filtro Rango de Fechas */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="min-h-[44px] h-11 text-xs font-mono px-2"
              title="Fecha desde"
            />
            <span className="text-muted-foreground text-xs font-mono">a</span>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="min-h-[44px] h-11 text-xs font-mono px-2"
              title="Fecha hasta"
            />
          </div>
        </div>
      </div>

      {/* Lista / Tabla de Logs */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div data-testid="logs-empty-state" className="p-12 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-base text-foreground">No se encontraron eventos</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No existen registros que coincidan con los filtros combinados seleccionados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="min-h-[44px] min-w-[44px] px-4 py-2 text-xs"
            >
              Restablecer filtros
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border" data-testid="logs-list">
            {filteredLogs.map((log) => {
              const cfg = ACCION_CONFIG[log.accion] || {
                label: log.accion,
                color: "bg-muted text-foreground border-border",
              };

              return (
                <div
                  key={log.id}
                  data-testid="log-entry-item"
                  className="p-4 sm:p-5 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ID: {log.id}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3 inline" /> {log.fecha}
                      </span>
                    </div>

                    <p className="font-medium text-sm text-foreground">
                      {log.detalles}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      <span className="font-semibold text-foreground/90 flex items-center gap-1">
                        <User className="h-3 w-3 inline" /> {log.actorNombre} ({log.actorRol})
                      </span>
                      <span>({log.actorEmail})</span>
                      <span>• IP: {log.ipOrigen}</span>
                      <span>• Ref: {log.entidadRef}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
