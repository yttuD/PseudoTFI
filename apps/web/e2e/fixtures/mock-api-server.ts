import http from 'http';
import { randomUUID } from 'node:crypto';
import type { Socket } from 'net';

let server: http.Server | null = null;
const activeSockets = new Set<Socket>();
const previewGroups: Record<string, any>[] = [];
const previewUnits: Record<string, any>[] = [];

async function readPreviewBody(req: http.IncomingMessage): Promise<Record<string, any>> {
  let body = '';
  for await (const chunk of req) body += chunk.toString();
  try { return JSON.parse(body); } catch { return {}; }
}

/**
 * Ultra-lightweight deterministic Mock API Server for SSR endpoints on port 3001.
 * Prevents ECONNREFUSED / fetch failed when Next.js Server Components call Node fetch during Playwright runs.
 * Tracks all active sockets, rejects port collisions, and provides bounded teardown.
 */
export function startMockApiServer(port = 3001): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    if (server) {
      return resolve(server);
    }

    const s = http.createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url || '';
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');

      let jwtPayload: any = null;
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            jwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          }
        } catch {}
      }

      let activeAccessContext: any = jwtPayload?.accessContext || null;
      if (!activeAccessContext) {
        if (token.includes('pendiente') || token.includes('unconf')) {
          activeAccessContext = { actor: 'delegado', state: 'pendiente_configuracion', permiso: null, scope: null };
        } else if (token.includes('del_ver') || token.includes('ver')) {
          activeAccessContext = { actor: 'delegado', state: 'activo', permiso: 'ver', scope: { alcanceTipo: 'grupo', grupoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' } };
        } else if (token.includes('del_ges') || token.includes('ges')) {
          activeAccessContext = { actor: 'delegado', state: 'activo', permiso: 'gestionar', scope: { alcanceTipo: 'unidades', unidadIds: ['a0000000-0000-0000-0000-000000000001'] } };
        } else if (token.includes('admin') || token.includes('dev')) {
          activeAccessContext = { actor: 'admin', state: 'activo', permiso: 'gestionar', scope: { alcanceTipo: 'cuenta' }, capabilities: ['*'] };
        } else if (token.includes('gestor')) {
          activeAccessContext = { actor: 'gestor', state: 'activo', permiso: 'gestionar', scope: { alcanceTipo: 'cuenta' } };
        }
      }

      if (url.includes('/delegados/contexto')) {
        if (token.includes('service-error') || token.includes('fail') || token.includes('error-simulated') || jwtPayload?.simulateError === true || jwtPayload?.email?.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno del servicio de autorización.' }));
          return;
        }

        if (activeAccessContext) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(activeAccessContext));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            actor: 'gestor',
            state: 'activo',
            permiso: 'gestionar',
            scope: { alcanceTipo: 'cuenta' },
          })
        );
        return;
      }

      // Server-authoritative fail-closed owner-only barrier
      const isOwnerOnlyEndpoint =
        url.startsWith('/facturacion') ||
        url.startsWith('/afip') ||
        url.startsWith('/logs') ||
        url.startsWith('/metricas/financiero') ||
        (url.startsWith('/delegados') && !url.includes('/contexto') && !url.includes('/invitaciones/recibidas') && !url.includes('/aceptar') && !url.includes('/rechazar'));

      if (isOwnerOnlyEndpoint && activeAccessContext?.actor === 'delegado') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ statusCode: 403, error: 'Forbidden', message: 'Acceso restringido al Gestor titular.' }));
        return;
      }

      const SVG_UNIDAD_1 = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%232563eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%23ffffff'%3EUnidad 1%3C/text%3E%3C/svg%3E";
      const SVG_UNIDAD_2 = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%2310b981'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='32' fill='%23ffffff'%3EUnidad 2%3C/text%3E%3C/svg%3E";

      const SAMPLE_UNIDAD_1 = {
        id: 'a0000000-0000-0000-0000-000000000001',
        titulo: 'Departamento 2 Ambientes Frente al Río',
        titulo_es: 'Departamento 2 Ambientes Frente al Río',
        descripcion: 'Departamento completamente equipado con vista panorámica y cochera.',
        descripcion_es: 'Departamento completamente equipado con vista panorámica y cochera.',
        categoria: 'departamento',
        fotos: [SVG_UNIDAD_1],
        ubicacion_aprox: { lat: -29.1445, lng: -59.2645 },
        whatsapp: '+5493777123456',
        modalidades_precio: [{ id: 'm1', precio: 45000, tipo_periodo: 'mensual' }],
      };

      const SAMPLE_UNIDAD_2 = {
        id: 'a0000000-0000-0000-0000-000000000002',
        titulo: 'Casa Familiar con Jardín y Parrilla',
        titulo_es: 'Casa Familiar con Jardín y Parrilla',
        descripcion: 'Hermosa casa de 3 dormitorios en zona residencial tranquila.',
        descripcion_es: 'Hermosa casa de 3 dormitorios en zona residencial tranquila.',
        categoria: 'casa',
        fotos: [SVG_UNIDAD_2],
        ubicacion_aprox: { lat: -29.1400, lng: -59.2600 },
        whatsapp: '+5493777654321',
        modalidades_precio: [{ id: 'm2', precio: 85000, tipo_periodo: 'mensual' }],
      };

      if (url.includes('fuera-de-alcance') || url.includes('not-found')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ statusCode: 404, message: 'Unidad no encontrada.' }));
        return;
      }

      if (url.includes('/marketplace/zonas')) {
        if (url.includes('simulate-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno al cargar zonas.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            {
              id: 'c1',
              nombre: 'Goya',
              zonas: [
                { id: 'z1', nombre: 'Centro' },
                { id: 'z2', nombre: 'Costanera' },
                { id: 'z3', nombre: 'Zona Norte' },
              ],
            },
          ])
        );
        return;
      }

      if (url.includes('/marketplace/unidades')) {
        if (url.includes('simulate-error') || url.includes('trigger-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno en catálogo de unidades.' }));
          return;
        }

        // Contact endpoint
        if (url.includes('/contacto')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // Single unit detail: /marketplace/unidades/:id
        const detailMatch = url.match(/\/marketplace\/unidades\/([a-zA-Z0-9_-]+)/);
        if (detailMatch && detailMatch[1] && !detailMatch[1].startsWith('?')) {
          const unitId = detailMatch[1];
          const isAuth = !!authHeader && authHeader.length > 10;
          if (unitId === 'a0000000-0000-0000-0000-000000000002') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                ...SAMPLE_UNIDAD_2,
                ubicacion_exacta: isAuth ? { lat: -29.1400, lng: -59.2600 } : null,
              })
            );
            return;
          }
          // Default to unit 1
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              ...SAMPLE_UNIDAD_1,
              id: unitId,
              ubicacion_exacta: isAuth ? { lat: -29.1445, lng: -59.2645 } : null,
            })
          );
          return;
        }

        // Empty catalog queries
        if (url.includes('q=no-results') || url.includes('empty=true') || url.includes('categoria=lote')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0 }));
          return;
        }

        // Default catalog list
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([SAMPLE_UNIDAD_1, SAMPLE_UNIDAD_2]));
        return;
      }

      if (url.includes('/favoritos')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno en servicio de favoritos.' }));
          return;
        }

        if (req.method === 'GET') {
          if (!authHeader || token.length < 5) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 401, message: 'No autorizado.' }));
            return;
          }
          if (url.includes('empty=true') || token.includes('empty-favs')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([{ id: 'fav-1', unidad: SAMPLE_UNIDAD_1 }]));
          return;
        }

        if (req.method === 'POST') {
          if (!authHeader || token.length < 5) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 401, message: 'No autorizado.' }));
            return;
          }
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (req.method === 'DELETE') {
          if (!authHeader || token.length < 5) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 401, message: 'No autorizado.' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }
      }

      if (url.includes('/reportes')) {
        if (url.includes('simulate-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno al registrar reporte.' }));
          return;
        }
        if (!authHeader || token.length < 5) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 401, message: 'No autorizado.' }));
          return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Reporte registrado exitosamente.' }));
        return;
      }

      if (url.includes('/delegados/invitaciones/recibidas')) {
        if (url.includes('simulate-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error interno al cargar invitaciones.' }));
          return;
        }
        if (!authHeader || token.length < 5) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 401, message: 'No autorizado.' }));
          return;
        }
        const isBuscador = jwtPayload?.email?.includes('buscador') || token.includes('buscador');
        const isGestor = jwtPayload?.email?.includes('gestor') || jwtPayload?.user_metadata?.role === 'gestor' || token.includes('gestor');
        if (url.includes('empty=true') || token.includes('empty-inv') || (isGestor && !isBuscador)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            {
              id: 'inv-001',
              email: 'buscador@test.com',
              rol: 'delegado',
              estado: 'pendiente',
              gestorNombre: 'Gestor Inmobiliario Central',
              gestorDisplayName: 'Gestor Inmobiliario Central',
              expiraEn: '2026-10-26T00:00:00.000Z',
              expiresAt: '2026-10-26T00:00:00.000Z',
              alcanceTipo: 'cuenta',
              createdAt: '2026-09-20T10:00:00.000Z',
            },
          ])
        );
        return;
      }

      if (url.includes('/delegados/invitaciones/') && (url.includes('/aceptar') || url.includes('/rechazar'))) {
        if (url.includes('simulate-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error al procesar acción de invitación.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (url.includes('/cupo/asignar-trial')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      if (url === '/cupo' || url.startsWith('/cupo?')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de cupo.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: 'cupo-001',
            gestor_id: '11111111-1111-1111-1111-111111111111',
            cupo_maximo: 10,
            cupo_usado: 2,
            plan: 'pro',
            estado: 'activo',
            suscripcion_expira_en: '2026-12-31T23:59:59.000Z',
            created_at: '2026-01-01T00:00:00.000Z',
          })
        );
        return;
      }

      if (url.startsWith('/grupos')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de grupos.' }));
          return;
        }
        if (activeAccessContext?.actor === 'delegado') {
          if (activeAccessContext.state === 'pendiente_configuracion' || activeAccessContext.state === 'revocada') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 403, message: 'El delegado no tiene permiso para administrar grupos organizativos.' }));
            return;
          }
          if (activeAccessContext.scope?.alcanceTipo === 'unidades') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
        }
        if (req.method === 'POST') {
          if (process.env.RENDO_PREVIEW_VIDEO === '1') {
            const input = await readPreviewBody(req);
            const group = { id: randomUUID(), ...input, total_unidades: 0, color: '#B89355' };
            previewGroups.push(group);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(group));
            return;
          }
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              nombre: 'Nuevo Grupo',
              descripcion: 'Grupo residencial creado en prueba',
              color: '#10B981',
              total_unidades: 0,
              sena_porcentaje: 15,
              sena_default: 15,
              sena_default_activa: true,
              sena_default_tipo: 'porcentaje',
              sena_default_valor: 15,
            })
          );
          return;
        }
        if (req.method === 'PUT' || req.method === 'PATCH') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Grupo actualizado.' }));
          return;
        }
        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              nombre: 'Edificio Los Álamos',
              descripcion: 'Torre céntrica de departamentos',
              color: '#3B82F6',
              total_unidades: 2,
              sena_porcentaje: 20,
              sena_default: 20,
              sena_default_activa: true,
              sena_default_tipo: 'porcentaje',
              sena_default_valor: 20,
              created_at: '2026-01-01T00:00:00.000Z',
            },
            ...(process.env.RENDO_PREVIEW_VIDEO === '1' ? previewGroups : []),
          ])
        );
        return;
      }

      if (url.startsWith('/inquilinos')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de inquilinos.' }));
          return;
        }
        if (activeAccessContext?.actor === 'delegado') {
          if (activeAccessContext.state === 'pendiente_configuracion' || activeAccessContext.state === 'revocada') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: [], total: 0 }));
            return;
          }
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            if (activeAccessContext.permiso === 'ver') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'Operación no permitida en modo solo lectura.' }));
              return;
            }
          }
        }
        if (req.method === 'POST') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'i0000000-0000-0000-0000-000000000002',
              nombre_completo: 'Mariana Inquilina',
              email: 'mariana@inquilinos.com',
              telefono: '+5493777889900',
              documento: '36985214',
              estado_consentimiento: 'firmado',
              message: 'Inquilino registrado exitosamente',
            })
          );
          return;
        }
        if (req.method === 'PUT' || req.method === 'PATCH') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Inquilino actualizado.' }));
          return;
        }
        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: [
              {
                id: 'i0000000-0000-0000-0000-000000000001',
                nombre_completo: 'Juan Manuel Pérez',
                email: 'juan.perez@example.com',
                telefono: '+5493777123456',
                documento: '34567890',
                dni: '34567890',
                estado_consentimiento: 'firmado',
                garante_nombre: 'Roberto Pérez',
                garante_telefono: '+5493777654321',
                garante_documento: '12345678',
                created_at: '2026-01-15T10:00:00.000Z',
              },
            ],
            total: 1,
          })
        );
        return;
      }

      if (url.startsWith('/alquileres')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de alquileres.' }));
          return;
        }
        if (activeAccessContext?.actor === 'delegado') {
          if (activeAccessContext.state === 'pendiente_configuracion' || activeAccessContext.state === 'revocada') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: [], total: 0 }));
            return;
          }
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
            if (activeAccessContext.permiso === 'ver') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'Operación no permitida en modo solo lectura.' }));
              return;
            }
          }
        }
        if (url.includes('overlap-error') || token.includes('overlap-error')) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 409, message: 'Superposición de fechas detectada para la unidad seleccionada.' }));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            let parsed: any = {};
            try {
              parsed = JSON.parse(body);
            } catch {}

            // Existing active rental: 2026-10-01T00:00:00.000Z to 2027-09-30T23:59:59.000Z
            const existingStart = new Date('2026-10-01T00:00:00.000Z').getTime();
            const existingEnd = new Date('2027-09-30T23:59:59.000Z').getTime();

            const reqStart = parsed.fecha_inicio ? new Date(parsed.fecha_inicio).getTime() : 0;
            const reqEnd = parsed.fecha_fin ? new Date(parsed.fecha_fin).getTime() : 0;

            const isOverlap =
              url.includes('overlap-error') ||
              token.includes('overlap-error') ||
              (parsed.unidad_id === 'a0000000-0000-0000-0000-000000000001' &&
               reqStart && reqEnd &&
               reqStart <= existingEnd && reqEnd >= existingStart);

            if (isOverlap) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  statusCode: 409,
                  error: 'Conflict',
                  message: 'Superposición de fechas detectada para la unidad seleccionada.',
                })
              );
              return;
            }

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                id: 'alq-00000000-0000-0000-0000-000000000002',
                message: 'Alquiler registrado exitosamente',
                data: parsed,
              })
            );
          });
          return;
        }
        if (req.method === 'PUT' || req.method === 'PATCH') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Alquiler actualizado.' }));
          return;
        }
        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: [
              {
                id: 'alq-00000000-0000-0000-0000-000000000001',
                unidad_id: 'a0000000-0000-0000-0000-000000000001',
                inquilino_id: 'i0000000-0000-0000-0000-000000000001',
                modalidad: 'mensual',
                fecha_inicio: '2026-10-01T00:00:00.000Z',
                fecha_fin: '2027-09-30T23:59:59.000Z',
                monto_total: 450000,
                monto_sena: 90000,
                monto_deposito: 45000,
                estado_pago: 'cobrado_total',
                estado: 'activo',
                unidad: {
                  id: 'a0000000-0000-0000-0000-000000000001',
                  titulo_es: 'Departamento 2 Ambientes Frente al Río',
                  categoria: 'departamento',
                },
                inquilino: {
                  id: 'i0000000-0000-0000-0000-000000000001',
                  nombre_completo: 'Juan Manuel Pérez',
                },
                created_at: '2026-09-01T12:00:00.000Z',
              },
            ],
            total: 1,
          })
        );
        return;
      }

      if (url.startsWith('/afip')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio AFIP.' }));
          return;
        }
        if (url.includes('/comprobantes')) {
          if (url.includes('empty=true') || token.includes('empty')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify([
              {
                id: 'cmp-00000000-0000-0000-0000-000000000001',
                tipo_comprobante: 'Factura C',
                tipo_comprobante_codigo: 11,
                punto_venta: 1,
                numero_comprobante: 104,
                concepto: 2,
                cuit_emisor: '20-33445566-7',
                receptor_nombre: 'Carlos Gómez',
                receptor_doc_tipo: 'DNI',
                receptor_doc_nro: '34.567.890',
                fecha_emision: '2026-09-01',
                periodo_desde: '2026-08-01',
                periodo_hasta: '2026-08-31',
                importe_total: 280000,
                cae: '74382910482910',
                cae_vencimiento: '2026-09-15',
                estado: 'aprobado',
                pdf_url: null,
                created_at: '2026-09-01T12:00:00.000Z',
              },
            ])
          );
          return;
        }
        if (url.includes('/config')) {
          if (req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Configuración fiscal guardada.' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              configurado: true,
              cuit: '20-33445566-7',
              razon_social: 'Inmobiliaria Central Gestor',
              condicion_iva: 'monotributo',
              punto_venta: 1,
              iibb: '20-33445566-7',
              inicio_actividades: '2020-01-01',
              domicilio_fiscal: 'San Martín 1234, Goya',
              entorno: 'homologacion',
            })
          );
          return;
        }
        if (url.includes('/emitir')) {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'cmp-00000000-0000-0000-0000-000000000002',
              cae: '74382910482911',
              cae_vencimiento: '2026-10-15',
              estado: 'aprobado',
            })
          );
          return;
        }
      }

      if (url === '/delegados' || url.startsWith('/delegados?')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de delegados.' }));
          return;
        }
        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ invitaciones: [], delegaciones: [] }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            invitaciones: [
              {
                id: 'inv-001',
                target: {
                  displayName: 'Usuario Invitado',
                  maskedEmail: 'delegado-invitado@test.com',
                },
                estado: 'pendiente',
                expiresAt: '2026-10-20T10:00:00.000Z',
                channels: {
                  inApp: 'created',
                  email: 'sent',
                },
                createdAt: '2026-09-20T10:00:00.000Z',
              },
            ],
            delegaciones: [
              {
                id: 'del-001',
                delegado: {
                  id: '33333333-3333-3333-3333-333333333333',
                  displayName: 'Delegado Sólo Lectura',
                  maskedEmail: 'delegado-ver@test.com',
                },
                estado: 'activa',
                permiso: 'ver',
                alcanceTipo: 'grupo',
                grupo: {
                  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                  nombre: 'Edificio Los Álamos',
                },
                updatedAt: '2026-09-10T10:00:00.000Z',
              },
            ],
          })
        );
        return;
      }

      if (url.startsWith('/delegados/invitaciones') && req.method === 'POST') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Invitación creada exitosamente.' }));
        return;
      }

      if (url.startsWith('/delegados/') && req.method === 'DELETE') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Delegación revocada exitosamente.' }));
        return;
      }

      if (url.startsWith('/metricas')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de métricas.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            puede_ver_financiero: true,
            resumen: {
              total_vistas: 1250,
              total_contactos: 48,
              tasa_conversion_general: 3.84,
              unidades_activas: 2,
              tasa_ocupacion: 50,
              ingresos_totales: 540000,
              ingresos_mes_actual: 90000,
              ingresos_pendientes_cobro: 45000,
              fondos_en_custodia: 45000,
            },
            serie_temporal: [
              { fecha: '2026-09-20', vistas: 120, contactos: 5, facturacion: 0, conversion: 4.1 },
              { fecha: '2026-09-21', vistas: 145, contactos: 7, facturacion: 90000, conversion: 4.8 },
              { fecha: '2026-09-22', vistas: 130, contactos: 4, facturacion: 0, conversion: 3.1 },
              { fecha: '2026-09-23', vistas: 160, contactos: 8, facturacion: 0, conversion: 5.0 },
              { fecha: '2026-09-24', vistas: 180, contactos: 9, facturacion: 0, conversion: 5.0 },
              { fecha: '2026-09-25', vistas: 195, contactos: 6, facturacion: 0, conversion: 3.1 },
              { fecha: '2026-09-26', vistas: 210, contactos: 9, facturacion: 0, conversion: 4.3 },
            ],
            rendimiento_unidades: [
              {
                id: 'a0000000-0000-0000-0000-000000000001',
                titulo: 'Departamento 2 Ambientes Frente al Río',
                categoria: 'departamento',
                vistas: 720,
                contactos: 30,
                ratio_conversion: 4.16,
                estado: 'publicada',
              },
              {
                id: 'a0000000-0000-0000-0000-000000000002',
                titulo: 'Casa Familiar con Jardín y Parrilla',
                categoria: 'casa',
                vistas: 530,
                contactos: 18,
                ratio_conversion: 3.39,
                estado: 'publicada',
              },
            ],
            distribucion_ocupacion: [
              { categoria: 'departamento', total: 1, alquiladas: 1, tasa: 100 },
              { categoria: 'casa', total: 1, alquiladas: 0, tasa: 0 },
            ],
            financiero: {
              ingresos_totales: 540000,
              ingresos_mes_actual: 90000,
              ingresos_pendientes_cobro: 45000,
              fondos_en_custodia: 45000,
              ingresos_por_categoria: [
                { categoria: 'departamento', monto: 540000 },
              ],
            },
          })
        );
        return;
      }

      if (url.startsWith('/logs')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de logs.' }));
          return;
        }
        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0 }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: [
              {
                id: 'log-001',
                actor_id: 'gestor@test.com',
                actor_rol: 'gestor',
                accion: 'crear',
                recurso_tipo: 'unidad',
                recurso_id: 'a0000000-0000-0000-0000-000000000001',
                created_at: '2026-09-26T14:30:00.000Z',
              },
              {
                id: 'log-002',
                actor_id: 'gestor@test.com',
                actor_rol: 'gestor',
                accion: 'publicar',
                recurso_tipo: 'unidad',
                recurso_id: 'a0000000-0000-0000-0000-000000000001',
                created_at: '2026-09-26T15:00:00.000Z',
              },
            ],
            total: 2,
          })
        );
        return;
      }

      if (url.startsWith('/pagos')) {
        if (url.includes('/mercadopago/preferencia')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'mp-pref-12345',
              init_point: 'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=mp-pref-12345',
            })
          );
          return;
        }
        if (url.includes('/efectivo')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Pago en efectivo registrado para validación' }));
          return;
        }
      }

      if (url.startsWith('/unidades')) {
        if (url.includes('simulate-error') || token.includes('service-error')) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 500, message: 'Error en servicio de unidades.' }));
          return;
        }

        const ALL_OPERATIONAL_UNIDADES = [
          {
            ...SAMPLE_UNIDAD_1,
            id: 'a0000000-0000-0000-0000-000000000001',
            estado: 'publicada',
            grupo_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            zona_id: 'z1',
            ciudad_id: 'c1',
          },
          {
            ...SAMPLE_UNIDAD_2,
            id: 'a0000000-0000-0000-0000-000000000002',
            estado: 'publicada',
            grupo_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            zona_id: 'z1',
            ciudad_id: 'c1',
          },
          {
            id: 'a0000000-0000-0000-0000-000000000003',
            titulo: 'Local Comercial Individual',
            titulo_es: 'Local Comercial Individual',
            descripcion: 'Local comercial a la calle en esquina estratégica.',
            descripcion_es: 'Local comercial a la calle en esquina estratégica.',
            categoria: 'comercial',
            estado: 'publicada',
            grupo_id: null,
            zona_id: 'z1',
            ciudad_id: 'c1',
            precio_mensual: 120000,
            modalidades_precio: [
              { id: 'mp-3', unidad_tiempo: 'mensual', precio: 120000 },
            ],
          },
          ...(process.env.RENDO_PREVIEW_VIDEO === '1' ? previewUnits : []),
        ];

        const getInScopeUnidades = (ctx: any) => {
          if (!ctx || ctx.actor === 'gestor' || ctx.actor === 'admin') {
            return ALL_OPERATIONAL_UNIDADES;
          }
          if (ctx.actor === 'delegado') {
            if (ctx.state === 'pendiente_configuracion' || ctx.state === 'revocada') {
              return [];
            }
            const scope = ctx.scope;
            if (!scope) return [];
            if (scope.alcanceTipo === 'cuenta') {
              return ALL_OPERATIONAL_UNIDADES;
            }
            if (scope.alcanceTipo === 'grupo') {
              return ALL_OPERATIONAL_UNIDADES.filter((u) => u.grupo_id === scope.grupoId);
            }
            if (scope.alcanceTipo === 'unidades') {
              const allowed = Array.isArray(scope.unidadIds) ? scope.unidadIds : [];
              return ALL_OPERATIONAL_UNIDADES.filter((u) => allowed.includes(u.id));
            }
          }
          return ALL_OPERATIONAL_UNIDADES;
        }

        const inScopeUnits = getInScopeUnidades(activeAccessContext);

        const unitDetailMatch = url.match(/^\/unidades\/([a-zA-Z0-9_-]+)/);
        if (unitDetailMatch && unitDetailMatch[1] && !unitDetailMatch[1].startsWith('?')) {
          const uId = unitDetailMatch[1];
          if (process.env.RENDO_PREVIEW_VIDEO === '1' && req.method === 'POST' && url.includes('/modalidades')) {
            const unit = previewUnits.find((item) => item.id === uId);
            if (!unit) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ message: 'Unidad no encontrada.' }));
              return;
            }
            const modality = { id: randomUUID(), ...await readPreviewBody(req) };
            unit.modalidades_precio.push(modality);
            unit.modalidades = unit.modalidades_precio;
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(modality));
            return;
          }
          if (uId.includes('fuera-de-alcance') || uId.includes('not-found')) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 404, message: 'Unidad no encontrada.' }));
            return;
          }

          if (req.method === 'PUT' || req.method === 'PATCH') {
            if (activeAccessContext?.actor === 'delegado' && activeAccessContext.permiso === 'ver') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'Operación no permitida en modo solo lectura.' }));
              return;
            }
            const exists = inScopeUnits.find((u) => u.id === uId);
            if (!exists) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 404, message: 'Unidad no encontrada.' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Unidad actualizada exitosamente' }));
            return;
          }

          if (req.method === 'DELETE') {
            if (activeAccessContext?.actor === 'delegado' && activeAccessContext.permiso === 'ver') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'Operación no permitida en modo solo lectura.' }));
              return;
            }
            const exists = inScopeUnits.find((u) => u.id === uId);
            if (!exists) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 404, message: 'Unidad no encontrada.' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Unidad eliminada exitosamente' }));
            return;
          }

          const matched = inScopeUnits.find((u) => u.id === uId);
          if (!matched) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 404, message: 'Unidad no encontrada.' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(matched));
          return;
        }

        if (req.method === 'POST') {
          if (activeAccessContext?.actor === 'delegado') {
            if (activeAccessContext.permiso === 'ver') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'Operación no permitida en modo solo lectura.' }));
              return;
            }
            if (activeAccessContext.scope?.alcanceTipo === 'unidades') {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ statusCode: 403, message: 'El delegado con alcance de unidades no puede crear nuevas unidades.' }));
              return;
            }
          }
          if (process.env.RENDO_PREVIEW_VIDEO === '1') {
            const input = await readPreviewBody(req);
            const id = randomUUID();
            previewUnits.push({
              id,
              ...input,
              titulo: input.titulo_es || 'Nueva unidad',
              descripcion: input.descripcion_es || '',
              estado: 'borrador',
              modalidades_precio: [],
            });
            const group = previewGroups.find((item) => item.id === input.grupo_id);
            if (group) group.total_unidades += 1;
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id, success: true, message: 'Unidad creada exitosamente' }));
            return;
          }
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: 'a0000000-0000-0000-0000-000000000003',
              success: true,
              message: 'Unidad creada exitosamente',
            })
          );
          return;
        }

        if (url.includes('empty=true') || token.includes('empty')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [], total: 0 }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            data: inScopeUnits,
            total: inScopeUnits.length,
          })
        );
        return;
      }

      // Default fallback for operational endpoints
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [], total: 0 }));
    });

    s.on('connection', (socket) => {
      activeSockets.add(socket);
      socket.on('close', () => activeSockets.delete(socket));
    });

    // Reject port collisions strictly
    s.on('error', (err: Error) => {
      reject(err);
    });

    s.listen(port, '127.0.0.1', () => {
      s.unref();
      server = s;
      resolve(s);
    });
  });
}

export function stopMockApiServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      return resolve();
    }

    const s = server;
    server = null;

    if (typeof (s as any).closeAllConnections === 'function') {
      try {
        (s as any).closeAllConnections();
      } catch {}
    }

    if (typeof (s as any).closeIdleConnections === 'function') {
      try {
        (s as any).closeIdleConnections();
      } catch {}
    }

    activeSockets.forEach((socket) => {
      try {
        socket.unref();
        socket.destroy();
      } catch {}
    });
    activeSockets.clear();

    try {
      s.unref();
    } catch {}

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        try {
          s.removeAllListeners();
          s.unref();
        } catch {}
        resolve();
      }
    };

    const timer = setTimeout(finish, 500);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    try {
      s.close(() => {
        clearTimeout(timer);
        finish();
      });
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}
