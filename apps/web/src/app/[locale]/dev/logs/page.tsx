'use client';

import { useState, useMemo } from 'react';
import { Terminal, Search } from 'lucide-react';

interface GlobalAuditLog {
  id: string;
  workspace_id: string;
  workspace_nombre: string;
  actor_email: string;
  actor_rol: 'gestor' | 'delegado' | 'buscador' | 'admin' | 'dev';
  accion: string;
  entidad: string;
  entidad_id: string;
  ip: string;
  timestamp: string;
  detalles: string;
}

const MOCK_GLOBAL_LOGS: GlobalAuditLog[] = [
  {
    id: 'glog-001',
    workspace_id: 'ws-palermo-01',
    workspace_nombre: 'Inmobiliaria Palermo Soho',
    actor_email: 'gestor@Rendo.com.ar',
    actor_rol: 'gestor',
    accion: 'unidad.publicar',
    entidad: 'unidad',
    entidad_id: 'uni-101',
    ip: '190.220.14.88',
    timestamp: '2026-09-11 19:40:12',
    detalles: 'PublicaciÃ³n de departamento 3 amb en Palermo. Precio: $450.000',
  },
  {
    id: 'glog-002',
    workspace_id: 'ws-palermo-01',
    workspace_nombre: 'Inmobiliaria Palermo Soho',
    actor_email: 'delegado@Rendo.com.ar',
    actor_rol: 'delegado',
    accion: 'alquiler.crear',
    entidad: 'alquiler',
    entidad_id: 'alq-502',
    ip: '190.220.14.90',
    timestamp: '2026-09-11 18:22:04',
    detalles: 'CreaciÃ³n de contrato de alquiler para unidad uni-102. Inquilino: Juan PÃ©rez',
  },
  {
    id: 'glog-003',
    workspace_id: 'ws-belgrano-04',
    workspace_nombre: 'Belgrano Propiedades',
    actor_email: 'mariana.gestor@gmail.com',
    actor_rol: 'gestor',
    accion: 'cupo.actualizar',
    entidad: 'cupo',
    entidad_id: 'cupo-77',
    ip: '181.44.120.12',
    timestamp: '2026-09-11 17:15:30',
    detalles: 'AcreditaciÃ³n de cupo 15 unidades por webhook Mercado Pago',
  },
  {
    id: 'glog-004',
    workspace_id: 'ws-seguridad-global',
    workspace_nombre: 'Plataforma Rendo Global',
    actor_email: 'admin@Rendo.com.ar',
    actor_rol: 'admin',
    accion: 'unidad.suspension_preventiva',
    entidad: 'unidad',
    entidad_id: 'uni-99',
    ip: '186.130.4.1',
    timestamp: '2026-09-11 15:02:11',
    detalles: 'SuspensiÃ³n preventiva por acumulaciÃ³n de 52 denuncias',
  },
  {
    id: 'glog-005',
    workspace_id: 'ws-sur-08',
    workspace_nombre: 'Inmobiliaria Quilmes Centro',
    actor_email: 'delegado_sur@Rendo.com.ar',
    actor_rol: 'delegado',
    accion: 'inquilino.crear',
    entidad: 'inquilino',
    entidad_id: 'inq-33',
    ip: '181.16.89.5',
    timestamp: '2026-09-10 11:20:00',
    detalles: 'Alta manual de legajo de inquilino nuevo con DNI verificado',
  },
];

export default function DevLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [actorRoleFilter, setActorRoleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filteredLogs = useMemo(() => {
    return MOCK_GLOBAL_LOGS.filter((log) => {
      const matchSearch =
        !searchTerm ||
        log.detalles.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.workspace_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchWorkspace = !workspaceFilter || log.workspace_id === workspaceFilter;
      const matchRole = !actorRoleFilter || log.actor_rol === actorRoleFilter;
      const matchAction = !actionFilter || log.accion === actionFilter;

      return matchSearch && matchWorkspace && matchRole && matchAction;
    });
  }, [searchTerm, workspaceFilter, actorRoleFilter, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
              /auditoria-global-logs
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registro de auditorÃ­a consolidado de toda la plataforma con trazabilidad multi-tenant cruzada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
            {filteredLogs.length} EVENTOS ENCONTRADOS
          </span>
        </div>
      </div>

      {/* Barra de Filtros Cruzados */}
      <div className="p-4 rounded-xl border border-border/40 bg-card/60 backdrop-blur space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* BÃºsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por detalle, actor o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filtro de Workspace */}
          <div>
            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="">Todos los Workspaces</option>
              <option value="ws-palermo-01">Inmobiliaria Palermo Soho</option>
              <option value="ws-belgrano-04">Belgrano Propiedades</option>
              <option value="ws-sur-08">Inmobiliaria Quilmes Centro</option>
              <option value="ws-seguridad-global">Rendo Global (Sistema)</option>
            </select>
          </div>

          {/* Filtro de Rol de Actor */}
          <div>
            <select
              value={actorRoleFilter}
              onChange={(e) => setActorRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="">Todos los Roles</option>
              <option value="gestor">Gestores (Owners)</option>
              <option value="delegado">Delegados</option>
              <option value="admin">Administradores</option>
              <option value="dev">Desarrolladores</option>
            </select>
          </div>

          {/* Filtro de Tipo de AcciÃ³n */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="">Todas las Acciones</option>
              <option value="unidad.publicar">unidad.publicar</option>
              <option value="alquiler.crear">alquiler.crear</option>
              <option value="cupo.actualizar">cupo.actualizar</option>
              <option value="unidad.suspension_preventiva">unidad.suspension_preventiva</option>
              <option value="inquilino.crear">inquilino.crear</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="overflow-x-auto font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="p-3">Timestamp / IP</th>
                <th className="p-3">Workspace</th>
                <th className="p-3">Actor / Rol</th>
                <th className="p-3">AcciÃ³n</th>
                <th className="p-3">Detalle del Evento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 whitespace-nowrap">
                    <div className="text-foreground">{log.timestamp}</div>
                    <div className="text-[10px] text-muted-foreground">{log.ip}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-foreground">{log.workspace_nombre}</div>
                    <div className="text-[10px] text-muted-foreground">{log.workspace_id}</div>
                  </td>
                  <td className="p-3">
                    <div className="text-foreground">{log.actor_email}</div>
                    <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase">
                      {log.actor_rol}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
                      {log.accion}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-md">
                    {log.detalles}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
