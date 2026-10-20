import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'observaciones_regression.spec.ts',
  workers: 1,
  reporter: 'list',
  timeout: 90000,
  use: { baseURL: 'http://localhost:3100', storageState: { cookies: [], origins: [] }, trace: 'off', video: 'off' },
  webServer: {
    command: 'node ./node_modules/next/dist/bin/next dev -p 3100 -H 127.0.0.1',
    url: 'http://localhost:3100/es/auth/login',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AUTH_ALLOW_DEV_TOKENS: 'true',
      NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'true',
      RENDO_BETA_MODE: 'false',
      NEXT_PUBLIC_RENDO_BETA_MODE: 'false',
      NODE_OPTIONS: '--max-old-space-size=1024',
    },
  },
  projects: [
    { name: 'Desktop Edge', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1365, height: 900 } } },
    { name: 'Mobile Edge', use: { ...devices['Pixel 7'], channel: 'msedge' } },
  ],
});
