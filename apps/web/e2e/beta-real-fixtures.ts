import { Page, expect } from '@playwright/test';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'gestor' | 'delegado';
  accessToken: string;
}

export interface CreateDelegadoOptions {
  permiso?: 'ver' | 'gestionar';
  alcanceTipo?: 'cuenta' | 'grupo' | 'unidades';
  grupoId?: string | null;
  unidadIds?: string[];
  skipAccept?: boolean;
  skipConfigure?: boolean;
  revoke?: boolean;
}

export class BetaRealFixtureManager {
  private apiUrl: string;
  private anonKey: string;
  private serviceRoleKey: string;
  public adminClient: SupabaseClient;

  // Trackers de IDs propios para cleanup garantizado y verificación de ausencia
  public trackedAttemptEmails: string[] = [];
  public trackedUserIds: string[] = [];
  public trackedDelegadoIds: string[] = [];
  public trackedUnidadIds: string[] = [];
  public trackedGrupoIds: string[] = [];
  public trackedInvitacionIds: string[] = [];
  public trackedDelegacionIds: string[] = [];
  public trackedModalidadIds: string[] = [];
  public trackedInquilinoIds: string[] = [];
  public trackedAlquilerIds: string[] = [];

  constructor(adminClientOverride?: SupabaseClient) {
    if (adminClientOverride) {
      this.adminClient = adminClientOverride;
      this.apiUrl = 'http://127.0.0.1:54321';
      this.anonKey = 'stub-anon-key';
      this.serviceRoleKey = 'stub-service-key';
      return;
    }

    this.apiUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!this.apiUrl || !this.anonKey || !this.serviceRoleKey) {
      throw new Error('[BetaRealFixtureManager] Faltan variables de entorno Supabase locales obligatorias.');
    }

    const parsed = new URL(this.apiUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error(`[BetaRealFixtureManager] Seguridad: host Supabase debe ser loopback local, recibido: ${parsed.hostname}`);
    }

    this.adminClient = createClient(this.apiUrl, this.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  public generateEmail(prefix: string): string {
    const uid = crypto.randomBytes(4).toString('hex');
    return `b007b_${prefix}_${Date.now()}_${uid}@local.test`;
  }

  /**
   * Pagina completamente Supabase Auth para encontrar usuarios que coincidan
   * EXCLUSIVAMENTE con los emails exactos provistos.
   * Sin ningún filtro amplio, difuso o global.
   */
  public async findAuthUsersByExactEmails(
    emails: string[]
  ): Promise<{ matched: User[]; error: Error | null }> {
    if (!emails || emails.length === 0) {
      return { matched: [], error: null };
    }
    const targetSet = new Set(emails.map((e) => e.trim().toLowerCase()));
    const matched: User[] = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const { data, error } = await this.adminClient.auth.admin.listUsers({ page, perPage });
      if (error) {
        return {
          matched: [],
          error: new Error(`Error en listUsers página ${page}: ${error.message}`),
        };
      }
      if (!data || !data.users || data.users.length === 0) {
        break;
      }
      for (const u of data.users) {
        if (u.email && targetSet.has(u.email.trim().toLowerCase())) {
          matched.push(u);
        }
      }
      if (data.users.length < perPage) {
        break;
      }
      page++;
    }

    return { matched, error: null };
  }

  /**
   * Busca un usuario Auth por email exacto paginando completamente todas las páginas.
   */
  public async findAuthUserByExactEmail(
    email: string
  ): Promise<{ user: User | null; error: Error | null }> {
    const { matched, error } = await this.findAuthUsersByExactEmails([email]);
    if (error) {
      return { user: null, error };
    }
    return { user: matched[0] || null, error: null };
  }

  /**
   * Crea un usuario Auth registrando previamente la identidad exacta del intento.
   * Ante fallos de transporte/timeout de GoTrue:
   * - Pagina exhaustivamente Auth buscando el email exacto.
   * - Si la cuenta fue creada en background, la adopta directamente.
   * - Si el listado falla, la respuesta sigue siendo ambigua: no reintenta ni borra,
   *   falla explícitamente y preserva la identidad para reconciliación en cleanup.
   * - Si se confirma que la cuenta no existe, falla explícitamente sin reintentos ciegos.
   * - Nunca borra ni declara corrupción ante fallos de login.
   */
  public async createAuthUserWithReconciliation(
    email: string,
    password: string,
    metadata: Record<string, unknown>
  ): Promise<User> {
    this.trackedAttemptEmails.push(email);

    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (!authError && authData?.user) {
      return authData.user;
    }

    const errorMsg = authError?.message || 'Error desconocido al crear usuario Auth';

    // Reconciliar respuesta ambigua / timeout: buscar paginando por el email exacto
    await new Promise((r) => setTimeout(r, 600));
    const { user: existingUser, error: findError } = await this.findAuthUserByExactEmail(email);

    if (findError) {
      // Estado ambiguo no resuelto: fallar explícitamente; el email queda en trackedAttemptEmails para cleanup
      throw new Error(
        `[BetaRealFixtureManager] Creación de ${email} falló (${errorMsg}) y el listado de reconciliación falló (${findError.message}). Respuesta ambigua; fallando explícitamente para reconciliación en cleanup.`
      );
    }

    if (existingUser) {
      // La cuenta sí fue creada por GoTrue en DB a pesar del error de transporte
      return existingUser;
    }

    // Confirmado: la cuenta no fue creada
    throw new Error(`[BetaRealFixtureManager] Creación de usuario Auth para ${email} falló: ${errorMsg}`);
  }

  public async createGestor(name: string): Promise<TestUser> {
    const email = this.generateEmail(name);
    const password = `TestPass!_${crypto.randomBytes(6).toString('hex')}`;

    const authUser = await this.createAuthUserWithReconciliation(email, password, {
      role: 'gestor',
      full_name: `Gestor ${name}`,
    });

    const userId = authUser.id;
    this.trackedUserIds.push(userId);

    const { data: userRow, error: userRowError } = await this.adminClient
      .from('users')
      .select('id, rol')
      .eq('id', userId)
      .single();

    if (userRowError || !userRow) {
      throw new Error(`Trigger public.users falló para ${userId}: ${userRowError?.message}`);
    }

    const authClient = createClient(this.apiUrl, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData?.session?.access_token) {
      throw new Error(`SignIn falló para gestor ${email}: ${signInError?.message}`);
    }

    return {
      id: userId,
      email,
      password,
      role: 'gestor',
      accessToken: signInData.session.access_token,
    };
  }

  public async createDelegado(
    gestor: TestUser,
    name: string,
    options: CreateDelegadoOptions = {}
  ): Promise<TestUser> {
    const {
      permiso = 'ver',
      alcanceTipo = 'cuenta',
      grupoId = null,
      unidadIds = [],
      skipAccept = false,
      skipConfigure = false,
      revoke = false,
    } = options;

    const email = this.generateEmail(`del_${name}`);
    const password = `DelPass!_${crypto.randomBytes(6).toString('hex')}`;

    const authUser = await this.createAuthUserWithReconciliation(email, password, {
      role: 'gestor',
      full_name: `Delegado ${name}`,
    });

    const delegadoId = authUser.id;
    this.trackedDelegadoIds.push(delegadoId);

    const authClientDel = createClient(this.apiUrl, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signDel, error: signDelErr } = await authClientDel.auth.signInWithPassword({
      email,
      password,
    });

    if (signDelErr || !signDel?.session?.access_token) {
      throw new Error(`SignIn delegado falló: ${signDelErr?.message}`);
    }
    const tokenDelegado = signDel.session.access_token;

    const { data: invData, error: invError } = await this.adminClient
      .from('invitaciones_delegados')
      .insert({
        gestor_id: gestor.id,
        delegado_id: delegadoId,
        email,
        email_snapshot: email,
        estado: 'pendiente',
      })
      .select('id')
      .single();

    if (invError || !invData) {
      throw new Error(`Error creando invitacion: ${invError?.message}`);
    }
    this.trackedInvitacionIds.push(invData.id);

    if (skipAccept) {
      return {
        id: delegadoId,
        email,
        password,
        role: 'delegado',
        accessToken: tokenDelegado,
      };
    }

    const clientDel = createClient(this.apiUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${tokenDelegado}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const acceptRes = await clientDel.rpc('accept_delegado_invitation', {
      p_invitation_id: invData.id,
    });

    if (acceptRes.error) {
      throw new Error(`accept_delegado_invitation falló: ${acceptRes.error.message}`);
    }

    const acceptPayload = acceptRes.data as { success?: boolean; delegacion_id?: string } | null;
    if (!acceptPayload || acceptPayload.success !== true || !acceptPayload.delegacion_id) {
      throw new Error(`accept_delegado_invitation no devolvió success=true o delegacion_id obligatorio`);
    }

    const delegacionId = acceptPayload.delegacion_id;
    if (!this.trackedDelegacionIds.includes(delegacionId)) {
      this.trackedDelegacionIds.push(delegacionId);
    }

    // delRow SOLO para tracking adicional de cleanup; error de lookup no da false PASS
    const { data: delRow, error: delLookupErr } = await this.adminClient
      .from('delegaciones')
      .select('id')
      .eq('invitacion_id', invData.id)
      .maybeSingle();

    if (delLookupErr) {
      throw new Error(`Lookup de delegacion por invitacion falló: ${delLookupErr.message}`);
    }

    if (delRow?.id && !this.trackedDelegacionIds.includes(delRow.id)) {
      this.trackedDelegacionIds.push(delRow.id);
    }

    if (skipConfigure) {
      return {
        id: delegadoId,
        email,
        password,
        role: 'delegado',
        accessToken: tokenDelegado,
      };
    }

    const clientGestor = createClient(this.apiUrl, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${gestor.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const configRes = await clientGestor.rpc('configure_delegacion', {
      p_delegacion_id: delegacionId,
      p_permiso: permiso,
      p_alcance_tipo: alcanceTipo,
      p_grupo_id: alcanceTipo === 'grupo' ? grupoId : null,
      p_unidad_ids: alcanceTipo === 'unidades' ? unidadIds : [],
    });

    if (configRes.error) {
      throw new Error(`configure_delegacion falló: ${configRes.error.message}`);
    }
    const configData = configRes.data as { success?: boolean } | null;
    if (!configData || configData.success !== true) {
      throw new Error(`configure_delegacion no devolvió success=true`);
    }

    if (revoke) {
      const revokeRes = await clientGestor.rpc('revoke_delegacion', {
        p_delegacion_id: delegacionId,
      });
      if (revokeRes.error) {
        throw new Error(`revoke_delegacion falló: ${revokeRes.error.message}`);
      }
      const revokeData = revokeRes.data as { success?: boolean } | null;
      if (!revokeData || revokeData.success !== true) {
        throw new Error(`revoke_delegacion no devolvió success=true`);
      }
    }

    return {
      id: delegadoId,
      email,
      password,
      role: 'delegado',
      accessToken: tokenDelegado,
    };
  }

  public async seedGrupo(gestorId: string, nombre: string): Promise<string> {
    const { data, error } = await this.adminClient
      .from('grupos')
      .insert({
        gestor_id: gestorId,
        nombre,
        descripcion: 'Grupo aislado de prueba',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Error insertando grupo: ${error?.message}`);
    }
    this.trackedGrupoIds.push(data.id);
    return data.id;
  }

  public async seedUnidad(
    gestorId: string,
    titulo: string,
    grupoId: string | null = null,
    estado = 'publicada',
    categoria = 'departamento'
  ): Promise<string> {
    const { data, error } = await this.adminClient
      .from('unidades')
      .insert({
        gestor_id: gestorId,
        grupo_id: grupoId,
        titulo_es: titulo,
        estado,
        categoria,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Error insertando unidad: ${error?.message}`);
    }
    this.trackedUnidadIds.push(data.id);
    return data.id;
  }

  public async loginViaUI(
    page: Page,
    user: TestUser,
    options: {
      locale?: string;
      next?: string;
      expectedUrlPattern?: RegExp;
    } = {}
  ): Promise<void> {
    const locale = options.locale || 'es';
    const nextPath = options.next || '/mis-unidades';
    const expectedPattern = options.expectedUrlPattern || new RegExp(`/${locale}/mis-unidades`);

    const targetUrl = `/${locale}/auth/login?portal=gestor&next=${encodeURIComponent(nextPath)}`;
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');

    const emailMethodBtn = page.locator('button:has-text("Email")');
    if (await emailMethodBtn.isVisible()) {
      await emailMethodBtn.click();
    }

    await page.fill('input#email, input[name="email"]', user.email);
    await page.fill('input#password, input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(expectedPattern, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
  }

  public async cleanup(): Promise<void> {
    const cleanupErrors: string[] = [];
    const recordErr = (tag: string, err: { code?: string; message?: string } | null | undefined) => {
      if (err) cleanupErrors.push(`${tag}: ${err.code || err.message || 'ERR'}`);
    };

    // Reconciliar cualquier identidad intentada en esta ejecución exacta (trackedAttemptEmails)
    if (this.trackedAttemptEmails.length > 0) {
      const { matched, error: reconcileErr } = await this.findAuthUsersByExactEmails(
        this.trackedAttemptEmails
      );
      if (reconcileErr) {
        cleanupErrors.push(`reconcile listUsers: ${reconcileErr.message}`);
      } else {
        for (const matching of matched) {
          if (
            !this.trackedUserIds.includes(matching.id) &&
            !this.trackedDelegadoIds.includes(matching.id)
          ) {
            this.trackedDelegadoIds.push(matching.id);
          }
        }
      }
    }

    const allUserIds = [...this.trackedDelegadoIds, ...this.trackedUserIds];

    // 1. Eliminar email_delivery_outbox de invitaciones o usuarios creados
    if (this.trackedInvitacionIds.length > 0 || allUserIds.length > 0) {
      try {
        if (this.trackedInvitacionIds.length > 0) {
          const { error: outboxErr } = await this.adminClient
            .from('email_delivery_outbox')
            .delete()
            .in('reference_id', this.trackedInvitacionIds);
          recordErr('email_delivery_outbox delete by ref', outboxErr);
        }
        if (allUserIds.length > 0) {
          const { error: outboxUserErr } = await this.adminClient
            .from('email_delivery_outbox')
            .delete()
            .in('recipient_user_id', allUserIds);
          recordErr('email_delivery_outbox delete by user', outboxUserErr);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        cleanupErrors.push(`email_delivery_outbox threw: ${msg}`);
      }
    }

    // 2. Eliminar notificaciones
    if (allUserIds.length > 0) {
      const { error } = await this.adminClient
        .from('notificaciones')
        .delete()
        .in('usuario_id', allUserIds);
      recordErr('notificaciones delete', error);
    }

    // 3. Eliminar log_acciones
    if (allUserIds.length > 0) {
      const { error } = await this.adminClient
        .from('log_acciones')
        .delete()
        .in('gestor_id', allUserIds);
      recordErr('log_acciones delete', error);
    }

    // 4. Eliminar delegacion_unidades
    if (this.trackedDelegacionIds.length > 0) {
      const { error } = await this.adminClient
        .from('delegacion_unidades')
        .delete()
        .in('delegacion_id', this.trackedDelegacionIds);
      recordErr('delegacion_unidades delete', error);
    }

    // 5. Eliminar delegaciones
    if (this.trackedDelegacionIds.length > 0) {
      const { error } = await this.adminClient
        .from('delegaciones')
        .delete()
        .in('id', this.trackedDelegacionIds);
      recordErr('delegaciones delete', error);
    }

    // 6. Eliminar invitaciones_delegados
    if (this.trackedInvitacionIds.length > 0) {
      const { error } = await this.adminClient
        .from('invitaciones_delegados')
        .delete()
        .in('id', this.trackedInvitacionIds);
      recordErr('invitaciones delete', error);
    }

    // 7. Eliminar unidades
    if (this.trackedUnidadIds.length > 0) {
      const { error } = await this.adminClient
        .from('unidades')
        .delete()
        .in('id', this.trackedUnidadIds);
      recordErr('unidades delete', error);
    }

    // 8. Eliminar grupos
    if (this.trackedGrupoIds.length > 0) {
      const { error } = await this.adminClient
        .from('grupos')
        .delete()
        .in('id', this.trackedGrupoIds);
      recordErr('grupos delete', error);
    }

    // 9. Eliminar users: Delegados PRIMERO, luego Gestores
    for (const uid of this.trackedDelegadoIds) {
      const { error: userErr } = await this.adminClient.from('users').delete().eq('id', uid);
      recordErr(`users delete delegado ${uid}`, userErr);
      const { error: authErr } = await this.adminClient.auth.admin.deleteUser(uid);
      recordErr(`auth delete delegado ${uid}`, authErr);
    }

    for (const uid of this.trackedUserIds) {
      const { error: userErr } = await this.adminClient.from('users').delete().eq('id', uid);
      recordErr(`users delete gestor ${uid}`, userErr);
      const { error: authErr } = await this.adminClient.auth.admin.deleteUser(uid);
      recordErr(`auth delete gestor ${uid}`, authErr);
    }

    // 10. VERIFICACIÓN EXHAUSTIVA DE AUSENCIA (NO hacer clear antes de verificar)
    if (this.trackedInvitacionIds.length > 0) {
      const { data, error } = await this.adminClient
        .from('email_delivery_outbox')
        .select('id')
        .in('reference_id', this.trackedInvitacionIds);
      if (error) cleanupErrors.push(`check email_delivery_outbox ref: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo email_delivery_outbox ref: ${data.length}`);
    }

    if (allUserIds.length > 0) {
      const { data, error } = await this.adminClient
        .from('email_delivery_outbox')
        .select('id')
        .in('recipient_user_id', allUserIds);
      if (error) cleanupErrors.push(`check email_delivery_outbox user: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo email_delivery_outbox user: ${data.length}`);
    }

    if (allUserIds.length > 0) {
      const { data, error } = await this.adminClient
        .from('notificaciones')
        .select('id')
        .in('usuario_id', allUserIds);
      if (error) cleanupErrors.push(`check notificaciones: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo notificaciones: ${data.length}`);
    }

    if (allUserIds.length > 0) {
      const { data, error } = await this.adminClient
        .from('log_acciones')
        .select('id')
        .in('gestor_id', allUserIds);
      if (error) cleanupErrors.push(`check log_acciones: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo log_acciones: ${data.length}`);
    }

    if (this.trackedDelegacionIds.length > 0) {
      const { data, error } = await this.adminClient
        .from('delegacion_unidades')
        .select('delegacion_id')
        .in('delegacion_id', this.trackedDelegacionIds);
      if (error) cleanupErrors.push(`check delegacion_unidades: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo delegacion_unidades: ${data.length}`);
    }

    if (this.trackedUnidadIds.length > 0) {
      const { data, error } = await this.adminClient.from('unidades').select('id').in('id', this.trackedUnidadIds);
      if (error) cleanupErrors.push(`check unidades: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo unidades: ${data.length}`);
    }

    if (this.trackedGrupoIds.length > 0) {
      const { data, error } = await this.adminClient.from('grupos').select('id').in('id', this.trackedGrupoIds);
      if (error) cleanupErrors.push(`check grupos: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo grupos: ${data.length}`);
    }

    if (this.trackedDelegacionIds.length > 0) {
      const { data, error } = await this.adminClient.from('delegaciones').select('id').in('id', this.trackedDelegacionIds);
      if (error) cleanupErrors.push(`check delegaciones: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo delegaciones: ${data.length}`);
    }

    if (this.trackedInvitacionIds.length > 0) {
      const { data, error } = await this.adminClient.from('invitaciones_delegados').select('id').in('id', this.trackedInvitacionIds);
      if (error) cleanupErrors.push(`check invitaciones: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo invitaciones: ${data.length}`);
    }

    if (allUserIds.length > 0) {
      const { data, error } = await this.adminClient.from('users').select('id').in('id', allUserIds);
      if (error) cleanupErrors.push(`check users: ${error.message}`);
      else if (data && data.length > 0) cleanupErrors.push(`residuo users: ${data.length}`);

      // Comprobar Auth 404 estricto para cada usuario
      for (const uid of allUserIds) {
        try {
          const { data: authData, error: authErr } = await this.adminClient.auth.admin.getUserById(uid);
          if (authData?.user) {
            cleanupErrors.push(`residuo auth user: ${uid}`);
          } else if (authErr) {
            if (authErr.status === 404) {
              // Ausencia confirmada con status 404 estricto
            } else {
              cleanupErrors.push(`check auth user unexpected status ${authErr.status}: ${authErr.message}`);
            }
          } else {
            // Usuario nulo sin error 404: ambiguo
            cleanupErrors.push(`check auth user ambiguous result for ${uid}: user=null without 404 auth error`);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          cleanupErrors.push(`check auth user threw: ${msg}`);
        }
      }
    }

    // Comprobar ausencia final de cualquier email intentado en Auth (paginado exhaustivo exacto)
    if (this.trackedAttemptEmails.length > 0) {
      const { matched: survivingUsers, error: finalAuthErr } = await this.findAuthUsersByExactEmails(
        this.trackedAttemptEmails
      );
      if (finalAuthErr) {
        cleanupErrors.push(`check auth listUsers final: ${finalAuthErr.message}`);
      } else {
        for (const surviving of survivingUsers) {
          cleanupErrors.push(
            `residuo auth user por email intentado: ${surviving.email} (${surviving.id})`
          );
        }
      }
    }

    // Conservar trackers si hubo fallas
    if (cleanupErrors.length > 0) {
      throw new Error(`[BetaRealFixtureManager] Fallos en cleanup de DB/Auth:\n${cleanupErrors.join('\n')}`);
    }

    // Limpiar arrays SOLO si no hubo errores
    this.trackedUnidadIds = [];
    this.trackedGrupoIds = [];
    this.trackedDelegacionIds = [];
    this.trackedInvitacionIds = [];
    this.trackedDelegadoIds = [];
    this.trackedUserIds = [];
    this.trackedAttemptEmails = [];
  }
}
