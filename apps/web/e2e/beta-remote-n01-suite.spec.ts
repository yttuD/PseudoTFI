import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  getRepoRoot,
  getTrackingFilePath,
  extractJwtSub,
  saveTracking as persistTracking,
  finalizeRunAndCleanupContexts,
  cleanAndVerifyGrupos,
  cleanAndVerifyInvitacionesYDelegaciones,
  type RemoteAttempt,
  type ConfirmedAccount,
} from './remote-tracking';

const BASE_URL = 'https://rendo-beta-web.vercel.app';
const API_URL = process.env.API_URL || 'https://rendo-beta-api.vercel.app';

const EVIDENCE_DIR = path.join(getRepoRoot(), 'specs/008-beta-observaciones-2026-10-02/evidence/N01/captures-remote');
const TRACKING_FILE = getTrackingFilePath();

interface SuiteAttempt extends RemoteAttempt {
  accounts: {
    gestorA?: ConfirmedAccount;
    gestorB?: ConfirmedAccount;
    delegado?: ConfirmedAccount;
  };
}

const batchId = `b008_${Date.now()}`;
const currentAttempt: SuiteAttempt = {
  attempt: `suite-${batchId}`,
  testFile: 'apps/web/e2e/beta-remote-n01-suite.spec.ts',
  batchId,
  timestamp: new Date().toISOString(),
  accounts: {},
  dataRecords: {
    grupos: [],
    unidades: [],
    invitaciones: [],
    delegaciones: [],
  },
  cleaned: false,
  cleanupStatus: 'IN_PROGRESS',
};

function saveCurrentTracking(statusUpdate?: Partial<RemoteAttempt>): void {
  if (statusUpdate) {
    Object.assign(currentAttempt, statusUpdate);
  }
  persistTracking(TRACKING_FILE, currentAttempt);
}

async function extractToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const chunked: Record<string, string[]> = {};
  for (const c of cookies) {
    const match = c.name.match(/^(sb-.*-auth-token)(?:\.(\d+))?$/);
    if (match) {
      const baseName = match[1];
      const index = match[2] ? parseInt(match[2], 10) : 0;
      if (!chunked[baseName]) chunked[baseName] = [];
      chunked[baseName][index] = c.value;
    }
  }

  for (const baseName in chunked) {
    let fullVal = chunked[baseName].join('');
    if (fullVal.startsWith('base64-')) {
      try {
        fullVal = Buffer.from(fullVal.slice(7), 'base64').toString('utf8');
      } catch {}
    }
    try {
      const parsed = JSON.parse(fullVal);
      if (parsed.access_token) return parsed.access_token;
    } catch {}
  }

  const tokenFromStorage = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('auth-token')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed.access_token) return parsed.access_token;
          if (parsed.currentSession?.access_token) return parsed.currentSession.access_token;
        } catch {}
      }
    }
    return '';
  });

  return tokenFromStorage;
}

test.describe('Beta Remote End-to-End N01 Suite', () => {
  test.setTimeout(240000);

  test('Execute complete authenticated remote verification for N01', async ({ browser }) => {
    const batchEvidenceDir = path.join(EVIDENCE_DIR, batchId);
    fs.mkdirSync(batchEvidenceDir, { recursive: true });
    saveCurrentTracking();

    // Credenciales aleatorias en memoria únicamente
    const passA = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const passB = `${crypto.randomBytes(16).toString('hex')}!Aa1`;
    const passDel = `${crypto.randomBytes(16).toString('hex')}!Aa1`;

    const emailA = `${batchId}_ga@example.com`;
    const emailB = `${batchId}_gb@example.com`;
    const emailDel = `${batchId}_del@example.com`;

    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;
    let contextDel: BrowserContext | null = null;

    let tokenA = '';
    let tokenB = '';
    let tokenDel = '';
    let testError: unknown = null;

    try {
      // -------------------------------------------------------------
      // 1. REGISTRAR Y CONFIGURAR GESTOR A
      // -------------------------------------------------------------
      currentAttempt.accounts.gestorA = {
        email: emailA,
        authResidual: false,
        status: 'intentado',
        timestamp: new Date().toISOString(),
      };
      saveCurrentTracking();

      contextA = await browser.newContext();
      const pageA = await contextA.newPage();

      await pageA.goto(`${BASE_URL}/es/auth/registro?portal=gestor`, { waitUntil: 'networkidle' });
      await pageA.fill('#fullName', `Gestor A ${batchId}`);
      await pageA.fill('#email', emailA);
      await pageA.fill('#password', passA);
      await pageA.click('button[type="submit"]');

      await pageA.waitForURL(url => !url.href.includes('/registro'), { timeout: 20000 });
      await pageA.waitForLoadState('networkidle').catch(() => {});

      await pageA.goto(`${BASE_URL}/es/mis-unidades`, { waitUntil: 'networkidle' });
      tokenA = await extractToken(pageA);
      expect(tokenA, 'El token de sesion de Gestor A es obligatorio').toBeTruthy();
      const idA = extractJwtSub(tokenA);

      currentAttempt.accounts.gestorA = {
        email: emailA,
        id: idA,
        authResidual: true,
        status: 'creado_confirmado',
        confirmedAt: new Date().toISOString(),
      };
      saveCurrentTracking();

      // -------------------------------------------------------------
      // 2. CREAR FIXTURES PARA GESTOR A (Grupos y 3 Unidades Obligatorias)
      // -------------------------------------------------------------
      const resG1 = await fetch(`${API_URL}/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ nombre: `Grupo_Archivar_${batchId}`, descripcion: 'Temporal para prueba de archivo' }),
      });
      expect(resG1.status, 'Creacion de Grupo 1 debe retornar 201 Created').toBe(201);
      const dataG1 = (await resG1.json()) as { id: string; nombre: string };
      expect(dataG1?.id, 'Grupo 1 debe retornar ID valido').toBeTruthy();
      currentAttempt.dataRecords.grupos.push({ id: dataG1.id, nombre: dataG1.nombre, status: 'activo', owner: 'Gestor A' });
      saveCurrentTracking();

      const resG2 = await fetch(`${API_URL}/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ nombre: `Grupo_Paginacion_${batchId}`, descripcion: 'Para paginacion y delegado' }),
      });
      expect(resG2.status, 'Creacion de Grupo 2 debe retornar 201 Created').toBe(201);
      const dataG2 = (await resG2.json()) as { id: string; nombre: string };
      expect(dataG2?.id, 'Grupo 2 debe retornar ID valido').toBeTruthy();
      currentAttempt.dataRecords.grupos.push({ id: dataG2.id, nombre: dataG2.nombre, status: 'activo', owner: 'Gestor A' });
      saveCurrentTracking();

      for (let i = 1; i <= 3; i++) {
        const resU = await fetch(`${API_URL}/unidades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
          body: JSON.stringify({
            categoria: 'departamento',
            grupo_id: dataG2.id,
            titulo_es: `Depto A_${i}_${batchId}`,
            descripcion_es: `Unidad de prueba paginacion ${i}`,
            auto_traducir: false,
          }),
        });
        expect(resU.status, `Creacion de unidad obligatoria ${i} debe retornar 201 Created`).toBe(201);
        const dataU = (await resU.json()) as { id: string; titulo_es: string };
        expect(dataU?.id, `Unidad ${i} debe retornar ID valido`).toBeTruthy();
        currentAttempt.dataRecords.unidades.push({ id: dataU.id, titulo: dataU.titulo_es, status: 'activo', owner: 'Gestor A' });
        saveCurrentTracking();
      }
      expect(currentAttempt.dataRecords.unidades.length, 'Deben existir exactamente 3 unidades creadas').toBe(3);

      // -------------------------------------------------------------
      // 3. VERIFICAR INVENTARIO GESTOR A Y PAGINACIÓN A 768px (limit=2)
      // Contrato existente: ORDER BY created_at DESC, id ASC
      // Depto A_3 (más reciente) y Depto A_2 en pág 1; Depto A_1 (más antiguo) en pág 2.
      // -------------------------------------------------------------
      await pageA.setViewportSize({ width: 1280, height: 800 });
      await pageA.goto(`${BASE_URL}/es/mis-unidades?limit=2`, { waitUntil: 'networkidle' });
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-mis-unidades-desktop.png'), fullPage: true });

      const page1Content = await pageA.innerText('body');
      expect(page1Content).toContain(`Depto A_3_${batchId}`);
      expect(page1Content).toContain(`Depto A_2_${batchId}`);
      expect(page1Content).not.toContain(`Depto A_1_${batchId}`);

      await pageA.setViewportSize({ width: 375, height: 667 });
      await pageA.reload({ waitUntil: 'networkidle' });
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-mis-unidades-mobile.png'), fullPage: true });

      await pageA.setViewportSize({ width: 768, height: 1024 });
      await pageA.reload({ waitUntil: 'networkidle' });

      const nextBtn = pageA.locator('a:has-text("Siguiente"), button:has-text("Siguiente"), [aria-label="Página siguiente"], [aria-label="Next page"]').first();
      await expect(nextBtn, 'El botón Siguiente debe estar visible a 768px con 3 unidades y limit=2').toBeVisible({ timeout: 10000 });
      await nextBtn.click({ force: false });
      await pageA.waitForLoadState('networkidle').catch(() => {});

      await expect(pageA, 'Al hacer click en Siguiente la URL debe contener page=2').toHaveURL(/page=2/);
      const page2Content = await pageA.innerText('body');
      expect(page2Content).toContain(`Depto A_1_${batchId}`);
      expect(page2Content).not.toContain(`Depto A_3_${batchId}`);
      expect(page2Content).not.toContain(`Depto A_2_${batchId}`);
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-paginacion-768-page2.png'), fullPage: true });

      await pageA.goto(`${BASE_URL}/es/mis-unidades?page=999&limit=2`, { waitUntil: 'networkidle' });
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-out-of-range-desktop.png'), fullPage: true });
      const outOfRangeContent = await pageA.innerText('body');
      expect(outOfRangeContent).not.toContain('500');
      expect(outOfRangeContent).not.toContain('Internal Server Error');
      expect(outOfRangeContent).not.toContain(`Depto A_1_${batchId}`);
      expect(outOfRangeContent).not.toContain(`Depto A_2_${batchId}`);
      expect(outOfRangeContent).not.toContain(`Depto A_3_${batchId}`);

      await pageA.goto(`${BASE_URL}/es/mis-unidades?page=1&limit=2`, { waitUntil: 'networkidle' });
      const recoveredContent = await pageA.innerText('body');
      expect(recoveredContent).toContain(`Depto A_3_${batchId}`);
      expect(recoveredContent).toContain(`Depto A_2_${batchId}`);
      expect(recoveredContent).not.toContain(`Depto A_1_${batchId}`);

      // -------------------------------------------------------------
      // 4. REGISTRAR GESTOR B Y VERIFICAR AISLAMIENTO ESTRICTO
      // -------------------------------------------------------------
      currentAttempt.accounts.gestorB = {
        email: emailB,
        authResidual: false,
        status: 'intentado',
        timestamp: new Date().toISOString(),
      };
      saveCurrentTracking();

      contextB = await browser.newContext();
      const pageB = await contextB.newPage();

      await pageB.goto(`${BASE_URL}/es/auth/registro?portal=gestor`, { waitUntil: 'networkidle' });
      await pageB.fill('#fullName', `Gestor B ${batchId}`);
      await pageB.fill('#email', emailB);
      await pageB.fill('#password', passB);
      await pageB.click('button[type="submit"]');
      await pageB.waitForURL(url => !url.href.includes('/registro'), { timeout: 20000 });
      await pageB.waitForLoadState('networkidle').catch(() => {});

      await pageB.goto(`${BASE_URL}/es/mis-unidades`, { waitUntil: 'networkidle' });
      tokenB = await extractToken(pageB);
      expect(tokenB, 'El token de Gestor B es obligatorio').toBeTruthy();
      const idB = extractJwtSub(tokenB);

      currentAttempt.accounts.gestorB = {
        email: emailB,
        id: idB,
        authResidual: true,
        status: 'creado_confirmado',
        confirmedAt: new Date().toISOString(),
      };
      saveCurrentTracking();

      const contentB = await pageB.innerText('body');
      expect(contentB).not.toContain(`Depto A_1_${batchId}`);
      expect(contentB).not.toContain(`Grupo_Paginacion_${batchId}`);

      const targetUnitId = currentAttempt.dataRecords.unidades[0].id;

      const resOrigOwner = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resOrigOwner.status, 'La lectura previa del propietario debe retornar 200 OK').toBe(200);
      const origData = (await resOrigOwner.json()) as { titulo_es: string; descripcion_es: string };
      const origTitle = origData.titulo_es;
      const origDesc = origData.descripcion_es;

      const resCrossRead = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect([403, 404]).toContain(resCrossRead.status);

      const resCrossWrite = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({ titulo_es: 'Ataque cruzado por Gestor B' }),
      });
      expect([403, 404]).toContain(resCrossWrite.status);

      const resVerifyCross = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resVerifyCross.status, 'La lectura post-ataque del propietario debe ser 200 OK').toBe(200);
      const verifyDataCross = (await resVerifyCross.json()) as { titulo_es: string; descripcion_es: string };
      expect(verifyDataCross.titulo_es, 'El titulo original debe permanecer intacto tras denegacion').toBe(origTitle);
      expect(verifyDataCross.descripcion_es, 'La descripcion original debe permanecer intacta tras denegacion').toBe(origDesc);

      // -------------------------------------------------------------
      // 5. REGISTRAR DELEGADO, INVITAR Y VERIFICAR PERMISOS
      // -------------------------------------------------------------
      const resInvite = await fetch(`${API_URL}/delegados/invitaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ email: emailDel }),
      });
      expect(resInvite.status, 'Creacion de invitacion para delegado debe retornar 201 Created').toBe(201);
      const dataInvite = (await resInvite.json()) as { id: string };
      expect(dataInvite?.id, 'Invitacion debe retornar ID valido').toBeTruthy();
      currentAttempt.dataRecords.invitaciones.push({ id: dataInvite.id, status: 'creada' });
      saveCurrentTracking();

      currentAttempt.accounts.delegado = {
        email: emailDel,
        authResidual: false,
        status: 'intentado',
        timestamp: new Date().toISOString(),
      };
      saveCurrentTracking();

      contextDel = await browser.newContext();
      const pageDel = await contextDel.newPage();

      await pageDel.goto(`${BASE_URL}/es/auth/registro`, { waitUntil: 'networkidle' });
      await pageDel.fill('#fullName', `Delegado ${batchId}`);
      await pageDel.fill('#email', emailDel);
      await pageDel.fill('#password', passDel);
      await pageDel.click('button[type="submit"]');
      await pageDel.waitForURL(url => !url.href.includes('/registro'), { timeout: 20000 });
      await pageDel.waitForLoadState('networkidle').catch(() => {});

      await pageDel.goto(`${BASE_URL}/es/cuenta`, { waitUntil: 'networkidle' });
      tokenDel = await extractToken(pageDel);
      expect(tokenDel, 'El token del delegado registrado es obligatorio').toBeTruthy();
      const idDel = extractJwtSub(tokenDel);

      currentAttempt.accounts.delegado = {
        email: emailDel,
        id: idDel,
        authResidual: true,
        status: 'creado_confirmado',
        confirmedAt: new Date().toISOString(),
      };
      saveCurrentTracking();

      const resAccept = await fetch(`${API_URL}/delegados/invitaciones/${dataInvite.id}/aceptar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenDel}` },
      });
      expect(resAccept.status, 'Aceptacion de invitacion debe retornar 200 OK').toBe(200);
      const dataDelegation = (await resAccept.json()) as { id: string };
      expect(dataDelegation?.id, 'Delegacion debe retornar ID valido').toBeTruthy();

      const invRecord = currentAttempt.dataRecords.invitaciones.find(i => i.id === dataInvite.id);
      if (invRecord) {
        invRecord.status = 'aceptada';
        invRecord.delegacionId = dataDelegation.id;
      }
      currentAttempt.dataRecords.delegaciones.push({ id: dataDelegation.id, status: 'activa' });
      saveCurrentTracking();

      const resConfVer = await fetch(`${API_URL}/delegados/${dataDelegation.id}/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ permiso: 'ver', alcanceTipo: 'grupo', grupoId: dataG2.id }),
      });
      expect(resConfVer.status, 'Configuracion de permiso ver debe retornar 200 OK').toBe(200);

      const resPreRO = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resPreRO.status).toBe(200);
      const preROData = (await resPreRO.json()) as { titulo_es: string; descripcion_es: string };

      const resDelWriteDenied = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDel}` },
        body: JSON.stringify({ titulo_es: 'Modificacion no autorizada por ReadOnly' }),
      });
      expect([403, 404]).toContain(resDelWriteDenied.status);

      const resVerifyDelRO = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resVerifyDelRO.status).toBe(200);
      const verifyDelROData = (await resVerifyDelRO.json()) as { titulo_es: string; descripcion_es: string };
      expect(verifyDelROData.titulo_es, 'El titulo no debe cambiar por intento en solo lectura').toBe(preROData.titulo_es);
      expect(verifyDelROData.descripcion_es, 'La descripcion no debe cambiar por intento en solo lectura').toBe(preROData.descripcion_es);

      const resConfGestionar = await fetch(`${API_URL}/delegados/${dataDelegation.id}/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ permiso: 'gestionar', alcanceTipo: 'grupo', grupoId: dataG2.id }),
      });
      expect(resConfGestionar.status, 'Configuracion de permiso gestionar debe retornar 200 OK').toBe(200);

      const newDescription = `Modificada por Delegado autorizado ${Date.now()}`;
      const resDelWriteAllowed = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenDel}` },
        body: JSON.stringify({ descripcion_es: newDescription }),
      });
      expect(resDelWriteAllowed.status, 'Escritura por delegado autorizado debe retornar 200 OK').toBe(200);

      const resVerifyAuthWrite = await fetch(`${API_URL}/unidades/${targetUnitId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect(resVerifyAuthWrite.status).toBe(200);
      const verifyAuthData = (await resVerifyAuthWrite.json()) as { descripcion_es: string };
      expect(verifyAuthData.descripcion_es, 'La descripcion modificada por el delegado debe persistir').toBe(newDescription);

      // -------------------------------------------------------------
      // 6. ARCHIVADO LÓGICO DE GRUPO FICTICIO (GRUPO 1)
      // -------------------------------------------------------------
      const resArchive = await fetch(`${API_URL}/grupos/${dataG1.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      expect([200, 204]).toContain(resArchive.status);

      const g1Record = currentAttempt.dataRecords.grupos.find(g => g.id === dataG1.id);
      if (g1Record) {
        g1Record.status = 'archivado_logico';
        const grpVerifyErrors = await cleanAndVerifyGrupos(API_URL, tokenA, [g1Record]);
        expect(grpVerifyErrors).toHaveLength(0);
        expect(g1Record.verifiedArchived).toBe(true);
      }
      saveCurrentTracking();

      await pageA.setViewportSize({ width: 1280, height: 800 });
      await pageA.goto(`${BASE_URL}/es/mis-unidades`, { waitUntil: 'networkidle' });
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-grupo-archivado-desktop.png'), fullPage: true });

      await pageA.setViewportSize({ width: 375, height: 667 });
      await pageA.reload({ waitUntil: 'networkidle' });
      await pageA.screenshot({ path: path.join(batchEvidenceDir, 'remote-gestorA-grupo-archivado-mobile.png'), fullPage: true });

      const contentAAfterArchive = await pageA.innerText('body');
      expect(contentAAfterArchive).not.toContain(`Grupo_Archivar_${batchId}`);
    } catch (err) {
      testError = err;
    } finally {
      console.log('[FINALLY] Ejecutando limpieza remota y cierre garantizado de contextos...');
      const cleanupErrors: Array<{ resource: string; id: string; error: string }> = [];

      try {
        if (!tokenA && currentAttempt.accounts.gestorA?.status === 'creado_confirmado') {
          cleanupErrors.push({ resource: 'auth', id: 'gestorA', error: 'Token faltante para Gestor A; limpieza no puede proceder' });
        }
        if (!tokenB && currentAttempt.accounts.gestorB?.status === 'creado_confirmado') {
          cleanupErrors.push({ resource: 'auth', id: 'gestorB', error: 'Token faltante para Gestor B; limpieza no puede proceder' });
        }

        // 1. Limpieza y comprobación de TODAS las unidades registradas
        for (const u of currentAttempt.dataRecords.unidades) {
          const auth = u.owner === 'Gestor B' ? tokenB : tokenA;
          if (!auth) {
            cleanupErrors.push({ resource: 'unidades', id: u.id, error: `Sin token de autorización (${u.owner}) para verificar/eliminar` });
            continue;
          }

          if (u.status === 'activo') {
            try {
              const resDelU = await fetch(`${API_URL}/unidades/${u.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${auth}` },
              });
              if ([200, 204].includes(resDelU.status)) {
                u.status = 'borrado_logico_api';
              } else {
                cleanupErrors.push({ resource: 'unidades', id: u.id, error: `DELETE retornó HTTP ${resDelU.status}` });
              }
            } catch (delErr) {
              cleanupErrors.push({ resource: 'unidades', id: u.id, error: (delErr as Error).message });
            }
          }

          try {
            const resCheckU = await fetch(`${API_URL}/unidades/${u.id}`, {
              headers: { Authorization: `Bearer ${auth}` },
            });
            if ([403, 404].includes(resCheckU.status)) {
              u.inaccessibleContractual = true;
              u.verifiedAbsence = true;
              u.physicalAbsence = 'PENDING_ADMIN_ACCESS';
            } else if (resCheckU.status === 200) {
              cleanupErrors.push({ resource: 'unidades', id: u.id, error: 'Unidad sigue respondiendo HTTP 200 OK (no borrada)' });
            } else {
              cleanupErrors.push({ resource: 'unidades', id: u.id, error: `Respuesta inesperada al verificar unidad: HTTP ${resCheckU.status}` });
            }
          } catch (checkErr) {
            cleanupErrors.push({ resource: 'unidades', id: u.id, error: (checkErr as Error).message });
          }
        }

        // 2 y 3. Limpieza y comprobación contractual de invitaciones y delegaciones
        const delErrors = await cleanAndVerifyInvitacionesYDelegaciones(
          API_URL,
          tokenA,
          currentAttempt.dataRecords.invitaciones,
          currentAttempt.dataRecords.delegaciones
        );
        cleanupErrors.push(...delErrors);

        // 4. Limpieza y comprobación de grupos (archive_grupo)
        if (tokenA) {
          const grpErrors = await cleanAndVerifyGrupos(
            API_URL,
            tokenA,
            currentAttempt.dataRecords.grupos
          );
          cleanupErrors.push(...grpErrors);
        }
      } catch (unhandledErr) {
        cleanupErrors.push({ resource: 'general_cleanup', id: 'unhandled', error: (unhandledErr as Error).message });
      }

      currentAttempt.cleaned = false;
      if (cleanupErrors.length > 0) {
        currentAttempt.cleanupStatus = 'CLEANUP_FAILED_WITH_ERRORS';
      } else {
        currentAttempt.cleanupStatus = 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL';
      }

      const stringErrors = cleanupErrors.map(e => `[${e.resource}:${e.id}] ${e.error}`);
      await finalizeRunAndCleanupContexts(
        TRACKING_FILE,
        currentAttempt,
        [contextDel, contextB, contextA],
        stringErrors,
        persistTracking,
        testError
      );
    }
  });
});
