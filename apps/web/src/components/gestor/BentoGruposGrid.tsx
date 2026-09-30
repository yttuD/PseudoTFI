'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Plus, 
  Pencil, 
  AlertTriangle, 
  LayoutGrid, 
  Table as TableIcon,
  Home,
  Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GrupoFormModal } from '@/components/gestor/GrupoFormModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface UnidadItem {
  id: string;
  titulo_es?: string;
  categoria?: string | { nombre?: string };
  zonas?: { nombre?: string };
  grupo_id?: string | null;
  estado: string;
  fotos?: string[];
  modalidades_precio?: { modalidad: string; precio: number; moneda?: string }[];
  modalidades?: { unidad_tiempo: string; precio: number }[];
  created_at?: string;
}

export interface GrupoItem {
  id: string;
  nombre: string;
  descripcion?: string;
  creado_en?: string;
  created_at?: string;
}

const ESTADO_STYLES: Record<string, string> = {
  borrador:           'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-transparent font-mono uppercase text-[10px]',
  publicada:          'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50 font-mono uppercase text-[10px]',
  pausada:            'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50 font-mono uppercase text-[10px]',
  no_disponible:      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/50 font-mono uppercase text-[10px]',
  en_revision:        'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200/50 font-mono uppercase text-[10px]',
  suspendida:         'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 font-mono uppercase text-[10px]',
  archivada:          'border-border text-muted-foreground bg-transparent font-mono uppercase text-[10px]',
  bloqueada_por_impago: 'bg-red-900 text-white font-mono uppercase text-[10px]',
};

export function BentoGruposGrid({
  unidades,
  grupos,
  locale,
  token,
  isReadOnly = false,
}: {
  unidades: UnidadItem[];
  grupos: GrupoItem[];
  locale: string;
  token: string;
  isReadOnly?: boolean;
}) {
  const [viewMode, setViewMode] = useState<'bento' | 'table'>('bento');

  // Mapear unidades a sus respectivos grupos
  const gruposConUnidades = grupos.map((g) => ({
    ...g,
    unidades: unidades.filter((u) => u.grupo_id === g.id),
  }));

  // Identificar unidades sin grupo o con grupo inexistente
  const grupoIdsConocidos = new Set(grupos.map((g) => g.id));
  const unidadesSinGrupo = unidades.filter((u) => !u.grupo_id || !grupoIdsConocidos.has(u.grupo_id));

  // Formateador de precio para preview
  const formatPrecio = (unidad: UnidadItem) => {
    const mods = unidad.modalidades_precio || unidad.modalidades;
    if (mods && mods.length > 0) {
      const first = mods[0];
      const precio = ('precio' in first ? first.precio : 0);
      const unidadTiempo = ('modalidad' in first ? first.modalidad : ('unidad_tiempo' in first ? first.unidad_tiempo : 'mes'));
      return `$${Number(precio).toLocaleString('es-AR')} / ${unidadTiempo}`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Barra superior de controles de vista */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase text-muted-foreground tracking-wider">
            Total: <strong>{unidades.length}</strong> {unidades.length === 1 ? 'unidad' : 'unidades'} en <strong>{grupos.length}</strong> {grupos.length === 1 ? 'grupo' : 'grupos'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode('bento')}
              className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'bento'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grilla Bento
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Tabla Clásica
            </button>
          </div>

          {!isReadOnly && (
            <Link
              href={`/${locale}/mis-unidades/nueva`}
              className={buttonVariants({ size: 'sm', className: 'font-mono uppercase text-xs min-h-[44px] min-w-[44px] inline-flex items-center justify-center' })}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nueva Unidad
            </Link>
          )}
        </div>
      </div>

      {/* VISTA 1: GRILLA BENTO DE GRUPOS Y UNIDADES */}
      {viewMode === 'bento' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tarjetas de cada Grupo registrado */}
          {gruposConUnidades.map((grupo) => (
            <Card
              key={grupo.id}
              className="flex flex-col rounded-2xl border border-border/70 bg-card/85 backdrop-blur-md shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Cabecera de la Tarjeta del Grupo */}
              <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate">
                        {grupo.nombre}
                      </CardTitle>
                      {grupo.descripcion && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {grupo.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs shrink-0 bg-background/80">
                    {grupo.unidades.length} {grupo.unidades.length === 1 ? 'Unidad' : 'Unidades'}
                  </Badge>
                </div>
              </CardHeader>

              {/* Cuerpo: Sub-grilla interna de Unidades */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {grupo.unidades.length === 0 ? (
                  <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 my-auto">
                    <Home className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-mono">
                      Sin unidades asignadas a este grupo aún
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {grupo.unidades.map((unidad) => {
                      const precioStr = formatPrecio(unidad);
                      const catName = typeof unidad.categoria === 'string' ? unidad.categoria : (unidad.categoria as { nombre?: string })?.nombre;

                      return (
                        <div
                          key={unidad.id}
                          className="group relative p-3 rounded-xl border border-border/50 bg-background/70 hover:bg-background/95 hover:border-primary/40 transition-all flex flex-col gap-2 shadow-2xs"
                        >
                          {/* Banner explicativo ante estados observados */}
                          {(unidad.estado === 'en_revision' || unidad.estado === 'suspendida') && (
                            <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                              <span className="leading-tight">
                                <strong>{unidad.estado === 'en_revision' ? 'En Revisión:' : 'Suspendida:'}</strong> Superó umbral preventivo (&gt;50 denuncias).
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            {/* Miniatura o Placeholder */}
                            <div className="w-12 h-12 rounded-lg bg-muted/50 shrink-0 overflow-hidden border border-border/40 flex items-center justify-center">
                              {unidad.fotos && unidad.fotos.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={unidad.fotos[0]}
                                  alt={unidad.titulo_es || 'Unidad'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <Home className="w-5 h-5 text-muted-foreground/50" />
                              )}
                            </div>

                            {/* Información de la Unidad */}
                            <div className="flex-1 min-w-0">
                              {isReadOnly ? (
                                <span className="font-semibold text-xs text-foreground truncate block">
                                  {unidad.titulo_es || 'Unidad sin título'}
                                </span>
                              ) : (
                                <Link
                                  href={`/${locale}/mis-unidades/${unidad.id}/editar`}
                                  className="font-semibold text-xs text-foreground truncate block hover:text-primary transition-colors min-h-[44px] flex items-center"
                                >
                                  {unidad.titulo_es || 'Unidad sin título'}
                                </Link>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={ESTADO_STYLES[unidad.estado] || ESTADO_STYLES.borrador}>
                                  {unidad.estado.replace(/_/g, ' ')}
                                </Badge>
                                {catName && (
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                    • {catName}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Acceso directo a edición */}
                            {!isReadOnly && (
                              <Link
                                href={`/${locale}/mis-unidades/${unidad.id}/editar`}
                                className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Editar Unidad"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>
                            )}
                          </div>

                          {/* Precio si existe */}
                          {precioStr && (
                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                              <span>Tarifa:</span>
                              <strong className="text-foreground font-semibold">{precioStr}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botón rápido para añadir unidad a este grupo */}
                {!isReadOnly && (
                  <div className="pt-2">
                    <Link
                      href={`/${locale}/mis-unidades/nueva?grupo_id=${grupo.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold transition-colors min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Unidad a este Grupo
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Tarjeta obligatoria para "Unidades sin Grupo Asignado" */}
          <Card className="flex flex-col rounded-2xl border border-border/70 bg-card/85 backdrop-blur-md shadow-sm hover:shadow-md transition-all overflow-hidden">
            <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-muted text-muted-foreground shrink-0 border border-border/60">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold truncate">
                      Unidades sin Grupo Asignado
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Propiedades individuales o independientes
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs shrink-0 bg-background/80">
                  {unidadesSinGrupo.length} {unidadesSinGrupo.length === 1 ? 'Unidad' : 'Unidades'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
              {unidadesSinGrupo.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 my-auto">
                  <p className="text-xs text-muted-foreground font-mono">
                    Todas las unidades están organizadas en grupos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unidadesSinGrupo.map((unidad) => {
                    const precioStr = formatPrecio(unidad);
                    const catName = typeof unidad.categoria === 'string' ? unidad.categoria : (unidad.categoria as { nombre?: string })?.nombre;

                    return (
                      <div
                        key={unidad.id}
                        className="group relative p-3 rounded-xl border border-border/50 bg-background/70 hover:bg-background/95 hover:border-primary/40 transition-all flex flex-col gap-2 shadow-2xs"
                      >
                        {(unidad.estado === 'en_revision' || unidad.estado === 'suspendida') && (
                          <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                            <span className="leading-tight">
                              <strong>{unidad.estado === 'en_revision' ? 'En Revisión:' : 'Suspendida:'}</strong> Superó umbral preventivo.
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted/50 shrink-0 overflow-hidden border border-border/40 flex items-center justify-center">
                            {unidad.fotos && unidad.fotos.length > 0 ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={unidad.fotos[0]}
                                alt={unidad.titulo_es || 'Unidad'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Home className="w-5 h-5 text-muted-foreground/50" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {isReadOnly ? (
                              <span className="font-semibold text-xs text-foreground truncate block">
                                {unidad.titulo_es || 'Unidad sin título'}
                              </span>
                            ) : (
                              <Link
                                href={`/${locale}/mis-unidades/${unidad.id}/editar`}
                                className="font-semibold text-xs text-foreground truncate block hover:text-primary transition-colors min-h-[44px] flex items-center"
                              >
                                {unidad.titulo_es || 'Unidad sin título'}
                              </Link>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={ESTADO_STYLES[unidad.estado] || ESTADO_STYLES.borrador}>
                                {unidad.estado.replace(/_/g, ' ')}
                              </Badge>
                              {catName && (
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  • {catName}
                                </span>
                              )}
                            </div>
                          </div>

                          {!isReadOnly && (
                            <Link
                              href={`/${locale}/mis-unidades/${unidad.id}/editar`}
                              className="p-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title="Editar Unidad"
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          )}
                        </div>

                        {precioStr && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                            <span>Tarifa:</span>
                            <strong className="text-foreground font-semibold">{precioStr}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isReadOnly && (
                <div className="pt-2">
                  <Link
                    href={`/${locale}/mis-unidades/nueva`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-border/80 hover:border-foreground/40 bg-muted/20 hover:bg-muted/40 text-foreground text-xs font-semibold transition-colors min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Unidad Individual
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta interactiva final: "+ Crear Nuevo Grupo / Edificio" */}
          {!isReadOnly && (
            <div className="flex flex-col justify-center items-center p-8 rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-primary/5 transition-all text-center min-h-[300px]">
              <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-3">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">
                Crear Nuevo Grupo / Edificio
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-5">
                Organiza complejos de cabañas, pisos en un edificio o módulos de locales comerciales en un solo contenedor.
              </p>
              <GrupoFormModal
                token={token}
                trigger={
                  <Button className="font-mono text-xs uppercase tracking-wider min-h-[44px] min-w-[44px]">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Nuevo Grupo
                  </Button>
                }
              />
            </div>
          )}
        </div>
      ) : (
        /* VISTA 2: TABLA CLÁSICA ANALÍTICA DENSE */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[100px] font-mono text-xs uppercase">ID Ref</TableHead>
                <TableHead className="font-mono text-xs uppercase">Título</TableHead>
                <TableHead className="font-mono text-xs uppercase">Grupo / Edificio</TableHead>
                <TableHead className="font-mono text-xs uppercase">Categoría</TableHead>
                <TableHead className="font-mono text-xs uppercase">Estado</TableHead>
                <TableHead className="text-right font-mono text-xs uppercase">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((unidad) => {
                const grupoNombre = grupos.find((g) => g.id === unidad.grupo_id)?.nombre || 'Sin Grupo';
                const catName = typeof unidad.categoria === 'string' ? unidad.categoria : (unidad.categoria as { nombre?: string })?.nombre;

                return (
                  <TableRow key={unidad.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {unidad.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <span>{unidad.titulo_es || 'Sin título'}</span>
                        {(unidad.estado === 'en_revision' || unidad.estado === 'suspendida') && (
                          <div className="mt-1.5 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                              <strong>{unidad.estado === 'en_revision' ? 'En Revisión:' : 'Suspendida:'}</strong> Superó el umbral automático (&gt;50 denuncias).
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {grupoNombre}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {catName || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={ESTADO_STYLES[unidad.estado] || ESTADO_STYLES.borrador}>
                        {unidad.estado.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!isReadOnly ? (
                        <Link
                          href={`/${locale}/mis-unidades/${unidad.id}/editar`}
                          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'min-h-[44px] min-w-[44px] inline-flex items-center justify-center' })}
                        >
                          Editar
                        </Link>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">Solo lectura</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
