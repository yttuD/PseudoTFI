import { defineConfig } from '@playwright/test';
import path from 'node:path';

/**
 * Playwright Config para B007b — Runtime Real con Aislamiento y Seguridad.
 * - Browser local instalado Edge (channel: 'msedge').
 * - Proyectos segregados: auth-matrix (ejecuta @auth con budget extendido)
 *   y proyectos visuales (ejecutan @visual en matriz 1440/1024/768/375 light/dark).
 * - Sin global.setup ni storageState .auth prefabricado.
 * - Sin traces, sin video, y screenshot automático en 'off' (previene captura de credenciales).
 * - 1 worker para evitar colisiones en DB y Auth local.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/beta_isolation_real.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 75000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT
          ? path.resolve(process.env.PLAYWRIGHT_JSON_OUTPUT)
          : path.resolve(
              __dirname,
              '../../specs/008-beta-observaciones-2026-10-02/evidence/N01/playwright-real-results.json'
            ),
      },
    ],
  ],
  use: {
    channel: 'msedge',
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3200',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    ignoreHTTPSErrors: true,
  },
  projects: [
    // 1. Proyecto dedicado para matriz completa de autenticación y alcances de delegado
    {
      name: 'auth-matrix-1440-light',
      grep: /@auth/,
      timeout: 90000,
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    // 2. Matriz de proyectos visuales para capturas e inspección de responsividad
    {
      name: 'visual-1440-light',
      grep: /@visual/,
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      },
    },
    {
      name: 'visual-1440-dark',
      grep: /@visual/,
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'visual-1024-light',
      grep: /@visual/,
      use: {
        viewport: { width: 1024, height: 768 },
        colorScheme: 'light',
      },
    },
    {
      name: 'visual-1024-dark',
      grep: /@visual/,
      use: {
        viewport: { width: 1024, height: 768 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'visual-768-light',
      grep: /@visual/,
      use: {
        viewport: { width: 768, height: 1024 },
        colorScheme: 'light',
      },
    },
    {
      name: 'visual-375-light',
      grep: /@visual/,
      use: {
        viewport: { width: 375, height: 667 },
        colorScheme: 'light',
      },
    },
    {
      name: 'visual-375-dark',
      grep: /@visual/,
      use: {
        viewport: { width: 375, height: 667 },
        colorScheme: 'dark',
      },
    },
  ],
});
