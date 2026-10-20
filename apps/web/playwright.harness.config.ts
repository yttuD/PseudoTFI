import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: [
    '**/beta-harness-recovery.spec.ts',
    '**/tracking-implementation.spec.ts',
  ],
  timeout: 30000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
  },
  // Sin webServer ni hooks globales
});
