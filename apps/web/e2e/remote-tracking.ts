import * as fs from 'fs';
import * as path from 'path';

export function getRepoRoot(): string {
  let curr = process.cwd();
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

export function getTrackingFilePath(): string {
  return path.join(getRepoRoot(), 'specs/008-beta-observaciones-2026-10-02/evidence/N01/remote-fixtures-tracking.json');
}

export type AccountStatus = 'intentado' | 'creado_confirmado' | 'incierto' | 'fallido';

export interface ConfirmedAccount {
  email: string;
  id?: string;
  authResidual: boolean;
  status: AccountStatus;
  timestamp?: string;
  confirmedAt?: string;
  note?: string;
}

export type GroupStatus = 'activo' | 'archivado' | 'eliminado' | 'archivado_logico';

export interface GroupRecord {
  id: string;
  nombre: string;
  status: GroupStatus;
  owner: string;
  verifiedArchived?: boolean;
}

export type UnitStatus = 'activo' | 'eliminado' | 'borrado_logico_api';

export interface UnitRecord {
  id: string;
  titulo: string;
  status: UnitStatus;
  owner: string;
  inaccessibleContractual?: boolean;
  verifiedAbsence?: boolean;
  physicalAbsence?: 'PENDING_ADMIN_ACCESS' | 'VERIFIED_PHYSICAL_ABSENCE';
}

export type InviteStatus = 'creada' | 'pendiente' | 'aceptada' | 'cancelada' | 'rechazada' | 'eliminada';

export interface InviteRecord {
  id: string;
  status: InviteStatus;
  delegacionId?: string;
  verifiedContractual?: boolean;
  physicalAbsence?: 'PENDING_ADMIN_ACCESS' | 'VERIFIED_PHYSICAL_ABSENCE';
  note?: string;
  [key: string]: unknown;
}

export type DelegationStatus = 'activa' | 'revocada' | 'eliminada';

export interface DelegationRecord {
  id: string;
  status: DelegationStatus;
  verifiedContractual?: boolean;
  physicalAbsence?: 'PENDING_ADMIN_ACCESS' | 'VERIFIED_PHYSICAL_ABSENCE';
  [key: string]: unknown;
}

export interface RemoteAttempt {
  attempt: string;
  testFile: string;
  batchId?: string;
  timestamp: string;
  account?: {
    email: string;
    id?: string;
    rol?: string;
    authResidual?: boolean;
    note?: string;
  };
  accounts?: {
    gestorA?: ConfirmedAccount;
    gestorB?: ConfirmedAccount;
    delegado?: ConfirmedAccount;
  };
  dataRecords: {
    grupos: GroupRecord[];
    unidades: UnitRecord[];
    invitaciones: InviteRecord[];
    delegaciones: DelegationRecord[];
  };
  cleaned: boolean;
  cleanupStatus: string;
  reconciledAt?: string;
}

export type AttemptRecord = RemoteAttempt;

export interface TrackingSummary {
  authAccountsCreated: string[];
  authAccountsDeleted: number;
  authAccountsResidual: string[];
  accountsPendingReconciliation: string[];
  gruposActivosResidual: number;
  gruposArchivados: string[];
  gruposEliminados: string[];
  unidadesCreadas: number;
  unidadesResidual: number;
  unverifiedDataResiduals: number;
  cleaned: boolean;
  cleanupStatus: 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL' | 'CLEANUP_FAILED_WITH_ERRORS' | 'IN_PROGRESS';
  physicalAbsenceVerification: 'PENDING_ADMIN_ACCESS' | 'VERIFIED';
  blockerNote: string;
  [key: string]: unknown;
}

export interface TrackingFile {
  trackingVersion: string;
  reconciledAt?: string;
  attempts: RemoteAttempt[];
  summary: TrackingSummary;
}

export function extractJwtSub(token: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return payload.sub;
    }
  } catch {}
  return undefined;
}

export function reconcileTrackingSummary(attempts: RemoteAttempt[]): TrackingSummary {
  const allAccountsCreated = new Set<string>();
  const allAccountsResidual = new Set<string>();
  const unconfirmedPending = new Set<string>();

  const gruposArchivadosSet = new Set<string>();
  const gruposEliminadosSet = new Set<string>();

  let activeUnitsCount = 0;
  let activeGroupsCount = 0;
  let totalUnitsCreated = 0;
  let unverifiedDataResiduals = 0;
  let hasCleanupFailure = false;

  for (const att of attempts) {
    if (att.cleanupStatus === 'CLEANUP_FAILED_WITH_ERRORS') {
      hasCleanupFailure = true;
    }

    // 1. Formato histórico singular `account`
    if (att.account?.email) {
      allAccountsCreated.add(att.account.email);
      if (att.account.authResidual) {
        allAccountsResidual.add(att.account.id || att.account.email);
      }
    }

    // 2. Formato plural `accounts`
    if (att.accounts) {
      for (const roleKey of ['gestorA', 'gestorB', 'delegado'] as const) {
        const acc = att.accounts[roleKey];
        if (acc?.email) {
          if (acc.status === 'creado_confirmado') {
            allAccountsCreated.add(acc.email);
            if (acc.authResidual) {
              allAccountsResidual.add(acc.id || acc.email);
            }
          } else if (acc.status === 'intentado' || acc.status === 'incierto') {
            // Cuenta intentada sin confirmación queda pendiente de reconciliación
            unconfirmedPending.add(acc.email);
          }
        }
      }
    }

    // Unidades
    if (att.dataRecords?.unidades) {
      totalUnitsCreated += att.dataRecords.unidades.length;
      for (const u of att.dataRecords.unidades) {
        if (u.status === 'activo') {
          activeUnitsCount++;
          unverifiedDataResiduals++;
        } else if (!u.verifiedAbsence && !u.inaccessibleContractual) {
          unverifiedDataResiduals++;
        }
      }
    }

    // Grupos
    if (att.dataRecords?.grupos) {
      for (const g of att.dataRecords.grupos) {
        if (g.status === 'activo') {
          activeGroupsCount++;
          unverifiedDataResiduals++;
        } else if (g.status === 'archivado' || g.status === 'archivado_logico') {
          if (!g.verifiedArchived) {
            unverifiedDataResiduals++;
          }
          gruposArchivadosSet.add(g.id);
        } else if (g.status === 'eliminado') {
          gruposEliminadosSet.add(g.id);
        }
      }
    }

    // Invitaciones
    if (att.dataRecords?.invitaciones) {
      for (const inv of att.dataRecords.invitaciones) {
        if (!inv.verifiedContractual) {
          unverifiedDataResiduals++;
        }
      }
    }

    // Delegaciones
    if (att.dataRecords?.delegaciones) {
      for (const d of att.dataRecords.delegaciones) {
        if (d.status === 'activa') {
          unverifiedDataResiduals++;
        } else if ((d.status === 'revocada' || d.status === 'eliminada') && !d.verifiedContractual) {
          unverifiedDataResiduals++;
        }
      }
    }
  }

  // Si hubo cualquier fallo de limpieza o residuos no verificados, NUNCA sobrescribir con PARTIAL_DATA_CLEANED_AUTH_RESIDUAL
  const cleanupStatus: 'CLEANUP_FAILED_WITH_ERRORS' | 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL' =
    hasCleanupFailure || unverifiedDataResiduals > 0
      ? 'CLEANUP_FAILED_WITH_ERRORS'
      : 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL';

  return {
    authAccountsCreated: Array.from(allAccountsCreated),
    authAccountsDeleted: 0,
    authAccountsResidual: Array.from(allAccountsResidual),
    accountsPendingReconciliation: Array.from(unconfirmedPending),
    gruposActivosResidual: activeGroupsCount,
    gruposArchivados: Array.from(gruposArchivadosSet),
    gruposEliminados: Array.from(gruposEliminadosSet),
    unidadesCreadas: totalUnitsCreated,
    unidadesResidual: activeUnitsCount,
    unverifiedDataResiduals,
    cleaned: false,
    cleanupStatus,
    physicalAbsenceVerification: 'PENDING_ADMIN_ACCESS',
    blockerNote:
      'El cliente de pruebas HTTP no posee la clave service_role para auth.admin.deleteUser(); las identidades de Auth persisten como residuo conocido.',
  };
}

export function readTrackingFile(trackingFilePath: string): TrackingFile {
  if (!fs.existsSync(trackingFilePath)) {
    return {
      trackingVersion: '2.0.0-reconciled',
      attempts: [],
      summary: reconcileTrackingSummary([]),
    };
  }
  const raw = fs.readFileSync(trackingFilePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `CORRUPTED_TRACKING_FILE: ${trackingFilePath} contiene JSON inválido (${(err as Error).message}). Se aborta para no destruir el tracking histórico.`
    );
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { attempts?: unknown }).attempts)) {
    throw new Error(
      `CORRUPTED_TRACKING_FILE: ${trackingFilePath} no contiene un arreglo 'attempts' válido. Se aborta para no destruir el tracking histórico.`
    );
  }
  return parsed as TrackingFile;
}

export function saveTracking(trackingFilePath: string, currentAttempt: RemoteAttempt): TrackingFile {
  fs.mkdirSync(path.dirname(trackingFilePath), { recursive: true });
  const existingData = readTrackingFile(trackingFilePath);

  const idx = existingData.attempts.findIndex(
    a =>
      (currentAttempt.batchId && a.batchId === currentAttempt.batchId) ||
      a.attempt === currentAttempt.attempt
  );

  if (idx >= 0) {
    existingData.attempts[idx] = currentAttempt;
  } else {
    existingData.attempts.push(currentAttempt);
  }

  existingData.summary = reconcileTrackingSummary(existingData.attempts);
  existingData.reconciledAt = new Date().toISOString();

  fs.writeFileSync(trackingFilePath, JSON.stringify(existingData, null, 2), 'utf8');
  return existingData;
}

export type ClosableContext = {
  close: () => Promise<void>;
};

export async function finalizeRunAndCleanupContexts(
  trackingFilePath: string,
  attempt: RemoteAttempt,
  contexts: Array<ClosableContext | null | undefined>,
  errors: string[] = [],
  saveFn: (filePath: string, currentAttempt: RemoteAttempt) => TrackingFile = saveTracking,
  testError?: unknown
): Promise<TrackingFile> {
  const accumulatedErrors = [...errors];
  let result: TrackingFile | undefined;

  try {
    result = saveFn(trackingFilePath, attempt);
  } catch (err) {
    accumulatedErrors.push(`SAVE_TRACKING_FAILED: ${(err as Error).message}`);
  } finally {
    for (const ctx of contexts) {
      if (ctx) {
        try {
          await ctx.close();
        } catch (closeErr) {
          accumulatedErrors.push(`CONTEXT_CLOSE_FAILED: ${(closeErr as Error).message}`);
        }
      }
    }
  }

  if (testError && accumulatedErrors.length > 0) {
    const origMsg = testError instanceof Error ? `${testError.name}: ${testError.message}` : String(testError);
    const origStack = testError instanceof Error && testError.stack ? `\n${testError.stack}` : '';
    const cleanupMsg = `FINALIZE_SUITE_RUN_FAILED: ${accumulatedErrors.join(' | ')}`;
    const combined = new Error(`TEST_AND_CLEANUP_FAILED:\n[ORIGINAL_TEST_ERROR]: ${origMsg}${origStack}\n[CLEANUP_ERRORS]: ${cleanupMsg}`);
    throw combined;
  }

  if (accumulatedErrors.length > 0) {
    throw new Error(`FINALIZE_SUITE_RUN_FAILED: ${accumulatedErrors.join(' | ')}`);
  }

  if (testError) {
    throw testError;
  }

  return result!;
}

export interface ResourceCleanupError {
  resource: 'invitaciones' | 'delegaciones' | 'grupos' | 'unidades' | 'auth' | 'general';
  id: string;
  error: string;
}

export type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export function isValidContractItem(item: unknown): item is { id: string; estado: string } {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.trim().length > 0 &&
    typeof obj.estado === 'string' &&
    obj.estado.trim().length > 0
  );
}

export function isValidGrupoItem(item: unknown): item is { id: string } {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === 'string' && obj.id.trim().length > 0;
}

export async function cleanAndVerifyGrupos(
  apiUrl: string,
  token: string,
  grupos: GroupRecord[],
  customFetch: FetchFunction = fetch
): Promise<ResourceCleanupError[]> {
  const errors: ResourceCleanupError[] = [];

  if (!token) {
    for (const g of grupos) {
      g.verifiedArchived = false;
      errors.push({
        resource: 'grupos',
        id: g.id,
        error: 'Sin token de autorización para archivar/verificar grupo',
      });
    }
    return errors;
  }

  for (const g of grupos) {
    // Reiniciar verifiedArchived antes de comprobar cada recurso
    g.verifiedArchived = false;

    if (g.status === 'activo') {
      try {
        const resDelG = await customFetch(`${apiUrl}/grupos/${g.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if ([200, 204].includes(resDelG.status)) {
          g.status = 'archivado_logico';
        } else {
          errors.push({
            resource: 'grupos',
            id: g.id,
            error: `DELETE /grupos/${g.id} falló con HTTP ${resDelG.status}`,
          });
        }
      } catch (delErr) {
        errors.push({
          resource: 'grupos',
          id: g.id,
          error: `Error de red al archivar grupo ${g.id}: ${(delErr as Error).message}`,
        });
      }
    }

    // Comprobar ausencia lógica en lista activa
    try {
      const resCheckG = await customFetch(`${apiUrl}/grupos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resCheckG.status === 200) {
        const list = (await resCheckG.json()) as unknown;
        if (!Array.isArray(list)) {
          errors.push({
            resource: 'grupos',
            id: g.id,
            error: 'GET /grupos no retornó un arreglo JSON contractual',
          });
        } else if (!list.every(isValidGrupoItem)) {
          errors.push({
            resource: 'grupos',
            id: g.id,
            error: 'Estructura inválida en GET /grupos: se exigía un array con objetos que contengan id de tipo string no vacío',
          });
        } else {
          const isActive = list.some(item => item.id === g.id);
          if (!isActive) {
            g.verifiedArchived = true;
          } else {
            errors.push({
              resource: 'grupos',
              id: g.id,
              error: `Grupo ${g.id} sigue activo en catálogo tras archivado`,
            });
          }
        }
      } else {
        errors.push({
          resource: 'grupos',
          id: g.id,
          error: `GET /grupos respondió con HTTP ${resCheckG.status}`,
        });
      }
    } catch (checkErr) {
      errors.push({
        resource: 'grupos',
        id: g.id,
        error: `Error de red al comprobar grupo ${g.id}: ${(checkErr as Error).message}`,
      });
    }
  }

  return errors;
}

export async function cleanAndVerifyUnidades(
  apiUrl: string,
  token: string,
  unidades: UnitRecord[],
  customFetch: FetchFunction = fetch
): Promise<ResourceCleanupError[]> {
  const errors: ResourceCleanupError[] = [];

  if (!token) {
    for (const u of unidades) {
      errors.push({
        resource: 'unidades',
        id: u.id,
        error: 'Sin token de autorización para eliminar/verificar unidad',
      });
    }
    return errors;
  }

  for (const u of unidades) {
    if (u.status === 'activo') {
      try {
        const resDelU = await customFetch(`${apiUrl}/unidades/${u.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if ([200, 204].includes(resDelU.status)) {
          u.status = 'borrado_logico_api';
        } else {
          errors.push({
            resource: 'unidades',
            id: u.id,
            error: `DELETE /unidades/${u.id} falló con HTTP ${resDelU.status}`,
          });
        }
      } catch (delErr) {
        errors.push({
          resource: 'unidades',
          id: u.id,
          error: `Error de red al borrar unidad ${u.id}: ${(delErr as Error).message}`,
        });
      }
    }

    // Comprobar lectura contractual
    try {
      const resCheckU = await customFetch(`${apiUrl}/unidades/${u.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if ([403, 404].includes(resCheckU.status)) {
        u.inaccessibleContractual = true;
        u.verifiedAbsence = true;
        u.physicalAbsence = 'PENDING_ADMIN_ACCESS';
      } else if (resCheckU.status === 200) {
        errors.push({
          resource: 'unidades',
          id: u.id,
          error: `Unidad ${u.id} sigue accesible con HTTP 200 (no borrada)`,
        });
      } else {
        errors.push({
          resource: 'unidades',
          id: u.id,
          error: `Unidad ${u.id} respondió con HTTP inesperado ${resCheckU.status}`,
        });
      }
    } catch (checkErr) {
      errors.push({
        resource: 'unidades',
        id: u.id,
        error: `Error de red al comprobar unidad ${u.id}: ${(checkErr as Error).message}`,
      });
    }
  }

  return errors;
}

export async function cleanAndVerifyInvitacionesYDelegaciones(
  apiUrl: string,
  token: string,
  invitaciones: InviteRecord[],
  delegaciones: DelegationRecord[],
  customFetch: FetchFunction = fetch
): Promise<ResourceCleanupError[]> {
  const errors: ResourceCleanupError[] = [];

  if (!token) {
    for (const inv of invitaciones) {
      inv.verifiedContractual = false;
      errors.push({
        resource: 'invitaciones',
        id: inv.id,
        error: 'Sin token de autorización para verificar/cancelar invitación',
      });
    }
    for (const d of delegaciones) {
      d.verifiedContractual = false;
      errors.push({
        resource: 'delegaciones',
        id: d.id,
        error: 'Sin token de autorización para verificar/revocar delegación',
      });
    }
    return errors;
  }

  // 1. Cancelar ÚNICAMENTE las invitaciones pendientes
  for (const inv of invitaciones) {
    if (inv.status === 'creada' || inv.status === 'pendiente') {
      try {
        const resDelInv = await customFetch(`${apiUrl}/delegados/invitaciones/${inv.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (![200, 204].includes(resDelInv.status)) {
          errors.push({
            resource: 'invitaciones',
            id: inv.id,
            error: `DELETE /delegados/invitaciones/${inv.id} retornó HTTP ${resDelInv.status}`,
          });
        }
      } catch (err) {
        errors.push({
          resource: 'invitaciones',
          id: inv.id,
          error: `Error de red al cancelar invitación ${inv.id}: ${(err as Error).message}`,
        });
      }
    }
  }

  // 2. Revocar delegaciones activas
  for (const d of delegaciones) {
    if (d.status === 'activa') {
      try {
        const resDelD = await customFetch(`${apiUrl}/delegados/${d.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (![200, 204].includes(resDelD.status)) {
          errors.push({
            resource: 'delegaciones',
            id: d.id,
            error: `DELETE /delegados/${d.id} retornó HTTP ${resDelD.status}`,
          });
        }
      } catch (err) {
        errors.push({
          resource: 'delegaciones',
          id: d.id,
          error: `Error de red al revocar delegación ${d.id}: ${(err as Error).message}`,
        });
      }
    }
  }

  // 3. Consultar GET /delegados y validar estructura real y de sus elementos
  let delData: {
    invitaciones?: Array<{ id: string; estado: string }>;
    delegaciones?: Array<{ id: string; estado: string }>;
  } | null = null;

  try {
    const resGet = await customFetch(`${apiUrl}/delegados`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (resGet.status !== 200) {
      const msg = `GET /delegados respondió HTTP inesperado: ${resGet.status}`;
      for (const inv of invitaciones) {
        inv.verifiedContractual = false;
        errors.push({ resource: 'invitaciones', id: inv.id, error: msg });
      }
      for (const d of delegaciones) {
        d.verifiedContractual = false;
        errors.push({ resource: 'delegaciones', id: d.id, error: msg });
      }
      return errors;
    }

    const json = (await resGet.json()) as {
      invitaciones?: unknown;
      delegaciones?: unknown;
    };

    if (
      !json ||
      typeof json !== 'object' ||
      !Array.isArray(json.invitaciones) ||
      !Array.isArray(json.delegaciones) ||
      !json.invitaciones.every(isValidContractItem) ||
      !json.delegaciones.every(isValidContractItem)
    ) {
      const formatErr =
        'Estructura inválida en GET /delegados: se exigían arreglos invitaciones y delegaciones con objetos que contengan id y estado válidos conforme al contrato';
      for (const inv of invitaciones) {
        inv.verifiedContractual = false;
        errors.push({ resource: 'invitaciones', id: inv.id, error: formatErr });
      }
      for (const d of delegaciones) {
        d.verifiedContractual = false;
        errors.push({ resource: 'delegaciones', id: d.id, error: formatErr });
      }
      return errors;
    }

    delData = {
      invitaciones: json.invitaciones as Array<{ id: string; estado: string }>,
      delegaciones: json.delegaciones as Array<{ id: string; estado: string }>,
    };
  } catch (netErr) {
    const netMsg = `Fallo de red al consultar GET /delegados: ${(netErr as Error).message}`;
    for (const inv of invitaciones) {
      inv.verifiedContractual = false;
      errors.push({ resource: 'invitaciones', id: inv.id, error: netMsg });
    }
    for (const d of delegaciones) {
      d.verifiedContractual = false;
      errors.push({ resource: 'delegaciones', id: d.id, error: netMsg });
    }
    return errors;
  }

  // 4. Comprobaciones de contrato con la respuesta validada
  // 4.1 Invitaciones
  for (const inv of invitaciones) {
    if (inv.status === 'creada' || inv.status === 'pendiente' || inv.status === 'cancelada') {
      const remoteInv = delData.invitaciones?.find(i => i.id === inv.id);
      if (remoteInv && remoteInv.estado === 'cancelada') {
        inv.status = 'cancelada';
        inv.verifiedContractual = true;
        inv.physicalAbsence = 'PENDING_ADMIN_ACCESS';
      } else {
        inv.verifiedContractual = false;
        errors.push({
          resource: 'invitaciones',
          id: inv.id,
          error: `Invitación no figura en estado «cancelada» en GET /delegados (estado: ${remoteInv?.estado || 'no encontrada'})`,
        });
      }
    } else if (inv.status === 'aceptada') {
      // 1. Exigir delegacionId válido
      if (!inv.delegacionId || typeof inv.delegacionId !== 'string' || inv.delegacionId.trim().length === 0) {
        inv.verifiedContractual = false;
        errors.push({
          resource: 'invitaciones',
          id: inv.id,
          error: `Invitación aceptada ${inv.id} no posee delegacionId válido para comprobar desvinculación/revocación`,
        });
        continue;
      }

      // 2. Presencia del ID exacto de invitación en GET /delegados con estado 'aceptada'
      const remoteInv = delData.invitaciones?.find(i => i.id === inv.id);
      if (!remoteInv || remoteInv.estado !== 'aceptada') {
        inv.verifiedContractual = false;
        errors.push({
          resource: 'invitaciones',
          id: inv.id,
          error: `Invitación aceptada ${inv.id} no figura en historial comprobable de GET /delegados con estado «aceptada» (estado: ${remoteInv?.estado || 'no encontrada'})`,
        });
        continue;
      }

      // 3. Ausencia de su delegación asociada en GET /delegados
      const associatedDelId = inv.delegacionId.trim();
      const isDelPresent = delData.delegaciones?.some(d => d.id === associatedDelId);

      if (!isDelPresent) {
        inv.verifiedContractual = true;
        inv.physicalAbsence = 'PENDING_ADMIN_ACCESS';
      } else {
        inv.verifiedContractual = false;
        errors.push({
          resource: 'invitaciones',
          id: inv.id,
          error: `Delegación asociada ${associatedDelId} a invitación aceptada sigue activa/presente en GET /delegados`,
        });
      }
    }
  }

  // 4.2 Delegaciones: Comprobar ausencia (el servicio actual excluye las revocadas)
  for (const d of delegaciones) {
    const isStillActive = delData.delegaciones?.some(del => del.id === d.id);
    if (!isStillActive) {
      d.status = 'revocada';
      d.verifiedContractual = true;
      d.physicalAbsence = 'PENDING_ADMIN_ACCESS';
    } else {
      d.verifiedContractual = false;
      errors.push({
        resource: 'delegaciones',
        id: d.id,
        error: `Delegación ${d.id} sigue presente/activa en GET /delegados tras revocación`,
      });
    }
  }

  return errors;
}
