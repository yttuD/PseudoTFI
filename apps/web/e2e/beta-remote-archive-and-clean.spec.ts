import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import {
  getTrackingFilePath,
  readTrackingFile,
  reconcileTrackingSummary,
  finalizeRunAndCleanupContexts,
  cleanAndVerifyGrupos,
  cleanAndVerifyUnidades,
  cleanAndVerifyInvitacionesYDelegaciones,
  type AttemptRecord,
  type TrackingFile,
} from './remote-tracking';

const BASE_URL = 'https://rendo-beta-web.vercel.app';
const API_URL = process.env.API_URL || 'https://rendo-beta-api.vercel.app';
const TRACKING_FILE = getTrackingFilePath();

test.use({ storageState: { cookies: [], origins: [] } });

test('Reconcile, verify IDs and clean remote beta fixtures', async ({ browser }) => {
  // 1. Validar que el archivo de tracking existe y contiene JSON válido
  const trackingData = readTrackingFile(TRACKING_FILE);

  // 2. Requisito: Exigir credenciales de entorno
  const email = process.env.FIXTURE_A_EMAIL;
  const pass = process.env.FIXTURE_A_PASS;

  if (!email || !pass) {
    throw new Error(
      'BLOCKED: Faltan credenciales de entorno obligatorias (FIXTURE_A_EMAIL y FIXTURE_A_PASS). El auxiliar no puede aprobar sin ejecutar la verificación y limpieza real.'
    );
  }

  // 3. Exigir encontrar el intento correspondiente
  const targetAttempt = trackingData.attempts.find((a: AttemptRecord) =>
    a.account?.email === email ||
    a.accounts?.gestorA?.email === email
  );

  if (!targetAttempt) {
    throw new Error(
      `NO_TARGET_ATTEMPT: No se encontró ningún intento registrado para ${email} en ${TRACKING_FILE}. Exige encontrar el intento correspondiente.`
    );
  }

  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let token = '';
  const errors: string[] = [];

  try {
    context = await browser.newContext();
    page = await context.newPage();

    console.log('[CLEANUP] Autenticando para verificar y archivar entidades remotas...');
    await page.goto(`${BASE_URL}/es/auth/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', email);
    await page.fill('#password', pass);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 20000 });
    await page.waitForLoadState('networkidle');

    // Extraer token
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
        if (parsed.access_token) {
          token = parsed.access_token;
          break;
        }
      } catch {}
    }

    if (!token) {
      token = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('auth-token')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(k) || '{}');
              if (parsed.access_token) return parsed.access_token;
              if (parsed.currentSession?.access_token) return parsed.currentSession.access_token;
            } catch {}
          }
        }
        return '';
      });
    }

    expect(token, 'El token extraído es obligatorio para verificar y limpiar entidades vía API').toBeTruthy();

    // 4. Verificar todos sus recursos conforme a contratos con captura individual de errores
    if (targetAttempt.dataRecords) {
      // 4.1 Grupos: DELETE llama a archive_grupo (archivado lógico)
      const grpErrors = await cleanAndVerifyGrupos(
        API_URL,
        token,
        targetAttempt.dataRecords.grupos || []
      );
      for (const err of grpErrors) {
        errors.push(`[${err.resource}:${err.id}] ${err.error}`);
      }

      // 4.2 Unidades: Distinguir borrado lógico / inaccesibilidad de ausencia física
      const uniErrors = await cleanAndVerifyUnidades(
        API_URL,
        token,
        targetAttempt.dataRecords.unidades || []
      );
      for (const err of uniErrors) {
        errors.push(`[${err.resource}:${err.id}] ${err.error}`);
      }

      // 4.3 Invitaciones y Delegaciones: Procesar y verificar con contratos existentes
      const delErrors = await cleanAndVerifyInvitacionesYDelegaciones(
        API_URL,
        token,
        targetAttempt.dataRecords.invitaciones || [],
        targetAttempt.dataRecords.delegaciones || []
      );
      for (const err of delErrors) {
        errors.push(`[${err.resource}:${err.id}] ${err.error}`);
      }
    }
  } finally {
    // Persistir CLEANUP_FAILED_WITH_ERRORS antes del finalizador
    targetAttempt.cleaned = false;
    if (errors.length > 0) {
      targetAttempt.cleanupStatus = 'CLEANUP_FAILED_WITH_ERRORS';
    } else if (targetAttempt.cleanupStatus !== 'CLEANUP_FAILED_WITH_ERRORS') {
      targetAttempt.cleanupStatus = 'PARTIAL_DATA_CLEANED_AUTH_RESIDUAL';
    }

    await finalizeRunAndCleanupContexts(
      TRACKING_FILE,
      targetAttempt,
      [context],
      errors
    );
  }
});
