import { randomUUID } from 'node:crypto';

export interface ResilientUnidad {
  id: string;
  gestor_id?: string;
  titulo_es?: string;
  descripcion_es?: string;
  titulo_en?: string;
  descripcion_en?: string;
  titulo_pt?: string;
  descripcion_pt?: string;
  categoria: string;
  zona_id?: string | number;
  grupo_id?: string | null;
  fotos?: string[];
  ubicacion_aprox?: { lat: number; lng: number };
  ubicacion_exacta?: { lat: number; lng: number } | null;
  whatsapp?: string;
  instagram?: string;
  estado: string;
  created_at: string;
  deleted_at?: string | null;
  modalidades_precio?: Array<{
    id: string;
    unidad_id: string;
    modalidad: string;
    precio: number;
    moneda: string;
  }>;
}

export interface ResilientGrupo {
  id: string;
  gestor_id: string;
  nombre: string;
  descripcion?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface ResilientInquilino {
  id: string;
  gestor_id: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  documento?: string;
  garantes?: Array<{
    nombre_completo: string;
    dni?: string;
    telefono?: string;
    email?: string;
  }>;
  consentimiento_ley25326?: boolean;
  consentimiento_fecha?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface ResilientAlquiler {
  id: string;
  gestor_id: string;
  unidad_id: string;
  inquilino_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  monto_total: number;
  monto_sena?: number;
  monto_deposito?: number;
  estado_pago?: 'cobrado_total' | 'seña_cobrada' | 'pendiente';
  monto_cobrado?: number;
  moneda: string;
  estado: string;
  contrato_url?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface ResilientAfipComprobante {
  id: string;
  gestor_id: string;
  alquiler_id?: string | null;
  tipo_comprobante: string;
  tipo_comprobante_codigo: number;
  punto_venta: number;
  numero_comprobante: number;
  concepto: number;
  cuit_emisor: string;
  receptor_nombre: string;
  receptor_doc_tipo: string;
  receptor_doc_nro: string;
  fecha_emision: string;
  periodo_desde: string;
  periodo_hasta: string;
  importe_total: number;
  cae: string;
  cae_vencimiento: string;
  estado: string;
  pdf_url?: string | null;
  created_at: string;
}

export interface ResilientGestorAfipConfig {
  id: string;
  gestor_id: string;
  cuit: string;
  razon_social: string;
  condicion_iva: 'monotributo' | 'responsable_inscripto' | 'exento';
  punto_venta: number;
  iibb?: string;
  inicio_actividades?: string;
  domicilio_fiscal: string;
  entorno: 'homologacion' | 'produccion';
  created_at: string;
  updated_at: string;
}

export interface ResilientDelegado {
  id: string;
  gestor_id: string;
  email: string;
  rol: string;
  created_at: string;
}

export interface ResilientUser {
  id: string;
  cupo_maximo: number;
  suscripcion_expira_en?: Date | null;
}

export interface ResilientVistaUnidad {
  id: string;
  unidad_id: string;
  ip_hash: string;
  created_at: string;
}

export interface ResilientContactoWhatsapp {
  id: string;
  unidad_id: string;
  ip_hash?: string;
  created_at: string;
}

export interface ResilientFavorito {
  id: string;
  usuario_id: string;
  unidad_id: string;
  created_at: string;
}

class ResilientStoreService {
  private unidades: ResilientUnidad[] = [
    {
      id: 'u0000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      titulo_es: 'Departamento 2 Ambientes con Cochera - Centro',
      descripcion_es: 'Excelente departamento céntrico totalmente amoblado, con cochera cubierta, wifi de alta velocidad y balcón a la calle.',
      titulo_en: '2-Room Downtown Apartment with Garage',
      descripcion_en: 'Excellent downtown apartment fully furnished with covered garage, high speed wifi and street balcony.',
      titulo_pt: 'Apartamento de 2 Quartos com Garagem - Centro',
      descripcion_pt: 'Excelente apartamento central totalmente mobiliado com garagem coberta, wifi e varanda.',
      categoria: 'departamento',
      zona_id: 'z1',
      grupo_id: 'g0000000-0000-0000-0000-000000000001',
      fotos: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      ],
      ubicacion_aprox: { lat: -29.1440, lng: -59.2630 },
      ubicacion_exacta: { lat: -29.1442, lng: -59.2635 },
      whatsapp: '+5493777123456',
      estado: 'publicada',
      created_at: new Date().toISOString(),
      deleted_at: null,
      modalidades_precio: [
        {
          id: 'm1',
          unidad_id: 'u0000000-0000-0000-0000-000000000001',
          modalidad: 'dia',
          precio: 35000,
          moneda: 'ARS',
        },
        {
          id: 'm2',
          unidad_id: 'u0000000-0000-0000-0000-000000000001',
          modalidad: 'mes',
          precio: 280000,
          moneda: 'ARS',
        },
      ],
    },
    {
      id: 'u0000000-0000-0000-0000-000000000002',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      titulo_es: 'Cabaña Premium con Pileta y Quincho',
      descripcion_es: 'Hermosa cabaña en entorno natural sobre la costanera con pileta privada, quincho con parrilla y estacionamiento.',
      titulo_en: 'Premium Cabin with Pool and BBQ Area',
      descripcion_en: 'Beautiful riverfront cabin in a natural setting with private pool, barbecue grill and parking.',
      titulo_pt: 'Chalé Premium com Piscina e Churrasqueira',
      descripcion_pt: 'Belo chalé à beira-rio em ambiente natural com piscina privativa, churrasqueira e estacionamento.',
      categoria: 'cabaña',
      zona_id: 'z2',
      grupo_id: 'g0000000-0000-0000-0000-000000000001',
      fotos: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      ],
      ubicacion_aprox: { lat: -29.1380, lng: -59.2710 },
      ubicacion_exacta: { lat: -29.1385, lng: -59.2710 },
      whatsapp: '+5493777654321',
      estado: 'publicada',
      created_at: new Date().toISOString(),
      deleted_at: null,
      modalidades_precio: [
        {
          id: 'm3',
          unidad_id: 'u0000000-0000-0000-0000-000000000002',
          modalidad: 'dia',
          precio: 55000,
          moneda: 'ARS',
        },
      ],
    },
  ];

  private grupos: ResilientGrupo[] = [
    {
      id: 'g0000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Complejo Costanera Norte',
      descripcion: 'Complejo de departamentos y cabañas turísticas frente al río en Goya.',
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  private inquilinos: ResilientInquilino[] = [
    {
      id: 'i0000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      nombre_completo: 'Carlos Gómez',
      email: 'carlos.gomez@ejemplo.com',
      telefono: '+5493777554433',
      documento: '34.567.890',
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  private alquileres: ResilientAlquiler[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      unidad_id: 'u0000000-0000-0000-0000-000000000001',
      inquilino_id: 'i0000000-0000-0000-0000-000000000001',
      fecha_inicio: new Date(Date.now() - 5 * 86400000).toISOString(),
      fecha_fin: new Date(Date.now() + 25 * 86400000).toISOString(),
      monto_total: 280000,
      monto_sena: 50000,
      monto_deposito: 280000,
      estado_pago: 'cobrado_total',
      monto_cobrado: 280000,
      moneda: 'ARS',
      estado: 'activo',
      created_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  public resetAlquileres(): void {
    this.alquileres = [];
  }

  private delegados: ResilientDelegado[] = [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      email: 'delegado@renda.com.ar',
      rol: 'delegado',
      created_at: new Date().toISOString(),
    },
  ];

  private users = new Map<string, ResilientUser>([
    [
      '11111111-1111-1111-1111-111111111111',
      {
        id: '11111111-1111-1111-1111-111111111111',
        cupo_maximo: 5,
        suscripcion_expira_en: null,
      },
    ],
  ]);

  public isGestorWorkspace(gestorId?: string): boolean {
    return !gestorId || gestorId === '11111111-1111-1111-1111-111111111111' || gestorId === 'default-gestor' || gestorId === 'mock-user-id';
  }

  getUnidades(publicadasOnly: boolean = false, gestorId?: string): ResilientUnidad[] {
    return this.unidades.filter((u) => {
      if (u.deleted_at) return false;
      if (publicadasOnly && u.estado !== 'publicada') return false;
      if (gestorId && !this.isGestorWorkspace(gestorId) && u.gestor_id !== gestorId) return false;
      return true;
    });
  }

  getUnidadById(id: string): ResilientUnidad | undefined {
    return this.unidades.find((u) => u.id === id && !u.deleted_at);
  }

  addUnidad(unidad: Omit<ResilientUnidad, 'id' | 'created_at'> & { id?: string }): ResilientUnidad {
    const id = unidad.id || randomUUID();
    const created: ResilientUnidad = {
      ...unidad,
      id,
      created_at: new Date().toISOString(),
      deleted_at: null,
      modalidades_precio: unidad.modalidades_precio || [],
    };
    this.unidades.unshift(created);
    return created;
  }

  updateUnidad(id: string, updates: Partial<ResilientUnidad>, gestorId?: string): ResilientUnidad | null {
    const idx = this.unidades.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    if (gestorId && this.unidades[idx].gestor_id !== gestorId && !this.isGestorWorkspace(gestorId)) {
      return null;
    }
    this.unidades[idx] = { ...this.unidades[idx], ...updates };
    return this.unidades[idx];
  }

  getGrupos(gestorId?: string): ResilientGrupo[] {
    return this.grupos.filter((g) => !g.deleted_at && (this.isGestorWorkspace(gestorId) || g.gestor_id === gestorId));
  }

  addGrupo(gestorId: string, nombre: string): ResilientGrupo {
    const grupo: ResilientGrupo = {
      id: randomUUID(),
      gestor_id: gestorId,
      nombre,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.grupos.push(grupo);
    return grupo;
  }

  getInquilinos(gestorId?: string): ResilientInquilino[] {
    return this.inquilinos.filter((i) => !i.deleted_at && (this.isGestorWorkspace(gestorId) || i.gestor_id === gestorId));
  }

  addInquilino(
    gestorId: string,
    data: {
      nombre_completo: string;
      email?: string;
      telefono?: string;
      documento?: string;
      garantes?: Array<{ nombre_completo: string; dni?: string; telefono?: string; email?: string }>;
      consentimiento_ley25326?: boolean;
      consentimiento_fecha?: string | null;
    }
  ): ResilientInquilino {
    const inquilino: ResilientInquilino = {
      id: randomUUID(),
      gestor_id: gestorId,
      ...data,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.inquilinos.push(inquilino);
    return inquilino;
  }

  getAlquileres(gestorId?: string): ResilientAlquiler[] {
    return this.alquileres.filter((a) => !a.deleted_at && (this.isGestorWorkspace(gestorId) || a.gestor_id === gestorId));
  }

  addAlquiler(
    gestorId: string,
    data: {
      unidad_id: string;
      inquilino_id: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      monto_total: number;
      monto_sena?: number;
      monto_deposito?: number;
      estado_pago?: 'cobrado_total' | 'seña_cobrada' | 'pendiente';
      monto_cobrado?: number;
      moneda?: string;
      contrato_url?: string | null;
    }
  ): ResilientAlquiler {
    const estadoPago = data.estado_pago || 'pendiente';
    const montoTotal = Number(data.monto_total || 0);
    const montoSena = Number(data.monto_sena || 0);
    const montoDeposito = Number(data.monto_deposito || 0);
    let montoCobrado = Number(data.monto_cobrado !== undefined ? data.monto_cobrado : 0);

    if (data.monto_cobrado === undefined) {
      if (estadoPago === 'cobrado_total') {
        montoCobrado = montoTotal;
      } else if (estadoPago === 'seña_cobrada') {
        montoCobrado = montoSena;
      } else {
        montoCobrado = 0;
      }
    }

    const alquiler: ResilientAlquiler = {
      id: randomUUID(),
      gestor_id: gestorId,
      unidad_id: data.unidad_id,
      inquilino_id: data.inquilino_id,
      fecha_inicio: data.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: data.fecha_fin || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      monto_total: montoTotal,
      monto_sena: montoSena,
      monto_deposito: montoDeposito,
      estado_pago: estadoPago,
      monto_cobrado: montoCobrado,
      moneda: data.moneda || 'ARS',
      estado: 'activo',
      contrato_url: data.contrato_url || null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.alquileres.push(alquiler);
    return alquiler;
  }

  getDelegados(gestorId?: string): ResilientDelegado[] {
    return this.delegados.filter((d) => this.isGestorWorkspace(gestorId) || d.gestor_id === gestorId);
  }

  addDelegado(gestorId: string, email: string): ResilientDelegado {
    const delegado: ResilientDelegado = {
      id: randomUUID(),
      gestor_id: gestorId,
      email,
      rol: 'delegado',
      created_at: new Date().toISOString(),
    };
    this.delegados.push(delegado);
    return delegado;
  }

  getUser(userId: string): ResilientUser {
    if (this.isGestorWorkspace(userId)) {
      return {
        id: '11111111-1111-1111-1111-111111111111',
        cupo_maximo: 5,
        suscripcion_expira_en: null,
      };
    }
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        cupo_maximo: 3,
        suscripcion_expira_en: null,
      });
    }
    return this.users.get(userId)!;
  }

  private vistas: ResilientVistaUnidad[] = [];
  private contactos: ResilientContactoWhatsapp[] = [];

  addVista(unidad_id: string, ip_hash: string): ResilientVistaUnidad {
    const v: ResilientVistaUnidad = {
      id: randomUUID(),
      unidad_id,
      ip_hash,
      created_at: new Date().toISOString(),
    };
    this.vistas.push(v);
    return v;
  }

  addContacto(unidad_id: string, ip_hash?: string): ResilientContactoWhatsapp {
    const c: ResilientContactoWhatsapp = {
      id: randomUUID(),
      unidad_id,
      ip_hash,
      created_at: new Date().toISOString(),
    };
    this.contactos.push(c);
    return c;
  }

  getVistas(unidadIds?: string[]): ResilientVistaUnidad[] {
    if (unidadIds !== undefined && unidadIds.length === 0) return [];
    if (!unidadIds) return this.vistas;
    const set = new Set(unidadIds);
    return this.vistas.filter((v) => set.has(v.unidad_id));
  }

  getContactos(unidadIds?: string[]): ResilientContactoWhatsapp[] {
    if (unidadIds !== undefined && unidadIds.length === 0) return [];
    if (!unidadIds) return this.contactos;
    const set = new Set(unidadIds);
    return this.contactos.filter((c) => set.has(c.unidad_id));
  }

  private comprobantes: ResilientAfipComprobante[] = [
    {
      id: 'cmp-00000000-0000-0000-0000-000000000001',
      gestor_id: '11111111-1111-1111-1111-111111111111',
      alquiler_id: 'a0000000-0000-0000-0000-000000000001',
      tipo_comprobante: 'Factura C',
      tipo_comprobante_codigo: 11,
      punto_venta: 1,
      numero_comprobante: 104,
      concepto: 2,
      cuit_emisor: '20-33445566-7',
      receptor_nombre: 'Carlos Gómez',
      receptor_doc_tipo: 'DNI',
      receptor_doc_nro: '34.567.890',
      fecha_emision: new Date().toISOString().split('T')[0],
      periodo_desde: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      periodo_hasta: new Date().toISOString().split('T')[0],
      importe_total: 280000,
      cae: '74382910482910',
      cae_vencimiento: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      estado: 'aprobado',
      pdf_url: null,
      created_at: new Date().toISOString(),
    },
  ];

  getComprobantes(gestorId?: string): ResilientAfipComprobante[] {
    if (!gestorId || this.isGestorWorkspace(gestorId)) {
      return [...this.comprobantes];
    }
    return this.comprobantes.filter((c) => c.gestor_id === gestorId);
  }

  getComprobanteById(id: string): ResilientAfipComprobante | undefined {
    return this.comprobantes.find((c) => c.id === id);
  }

  addComprobante(c: Omit<ResilientAfipComprobante, 'id' | 'created_at'>): ResilientAfipComprobante {
    const nextNro = this.comprobantes.length > 0
      ? Math.max(...this.comprobantes.map((item) => item.numero_comprobante)) + 1
      : 1;

    const created: ResilientAfipComprobante = {
      ...c,
      id: randomUUID(),
      numero_comprobante: c.numero_comprobante || nextNro,
      created_at: new Date().toISOString(),
    };
    this.comprobantes.unshift(created);
    return created;
  }

  private afipConfigs = new Map<string, ResilientGestorAfipConfig>();

  getAfipConfig(gestorId?: string): ResilientGestorAfipConfig | undefined {
    const targetId = !gestorId || this.isGestorWorkspace(gestorId)
      ? '11111111-1111-1111-1111-111111111111'
      : gestorId;
    return this.afipConfigs.get(targetId);
  }

  saveAfipConfig(
    gestorId: string,
    data: Omit<ResilientGestorAfipConfig, 'id' | 'gestor_id' | 'created_at' | 'updated_at'>
  ): ResilientGestorAfipConfig {
    const targetId = this.isGestorWorkspace(gestorId)
      ? '11111111-1111-1111-1111-111111111111'
      : gestorId;

    const existing = this.afipConfigs.get(targetId);
    const now = new Date().toISOString();
    const updated: ResilientGestorAfipConfig = {
      id: existing?.id || randomUUID(),
      gestor_id: targetId,
      ...data,
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    this.afipConfigs.set(targetId, updated);
    return updated;
  }

  private favoritos: ResilientFavorito[] = [];

  getFavoritos(usuarioId: string): ResilientUnidad[] {
    const userFavs = this.favoritos.filter((f) => f.usuario_id === usuarioId);
    const favUnidadIds = new Set(userFavs.map((f) => f.unidad_id));
    return this.unidades.filter((u) => favUnidadIds.has(u.id) && !u.deleted_at);
  }

  getFavoritosIds(usuarioId: string): string[] {
    return this.favoritos.filter((f) => f.usuario_id === usuarioId).map((f) => f.unidad_id);
  }

  isFavorito(usuarioId: string, unidadId: string): boolean {
    return this.favoritos.some((f) => f.usuario_id === usuarioId && f.unidad_id === unidadId);
  }

  addFavorito(usuarioId: string, unidadId: string): { ok: boolean; alreadyExists: boolean } {
    const exists = this.favoritos.some((f) => f.usuario_id === usuarioId && f.unidad_id === unidadId);
    if (!exists) {
      this.favoritos.push({
        id: randomUUID(),
        usuario_id: usuarioId,
        unidad_id: unidadId,
        created_at: new Date().toISOString(),
      });
      return { ok: true, alreadyExists: false };
    }
    return { ok: true, alreadyExists: true };
  }

  removeFavorito(usuarioId: string, unidadId: string): { ok: boolean } {
    this.favoritos = this.favoritos.filter(
      (f) => !(f.usuario_id === usuarioId && f.unidad_id === unidadId)
    );
    return { ok: true };
  }
}

export const resilientStore = new ResilientStoreService();
