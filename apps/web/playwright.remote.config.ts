import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/beta-remote-n01-suite.spec.ts',
    '**/beta-remote-archive-and-clean.spec.ts'
  ],
  timeout: 180000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://rendo-beta-web.vercel.app',
    storageState: undefined,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Remote Single Run',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],
  // Sin webServer: prueba exclusivamente contra entorno beta remoto desplegado
  // Sin hooks globales ni sesiones prefabricadas locales
});
