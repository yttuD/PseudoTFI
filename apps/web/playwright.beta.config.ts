import { defineConfig, devices } from '@playwright/test';

const apiOrigin = 'https://api.rendo.example';
const webOrigin = 'https://beta.rendo.example';
const dataOrigin = 'https://beta-data.example.test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'closed_beta_public.spec.ts',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    storageState: { cookies: [], origins: [] },
    trace: 'off',
    video: 'off',
  },
  projects: [{ name: 'Desktop Chrome', use: { ...devices['Desktop Edge'], channel: 'msedge' } }],
  webServer: {
    command: 'node ./node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1',
    url: 'http://127.0.0.1:3000/es',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NODE_ENV: 'production',
      RENDO_BETA_MODE: 'true',
      RENDO_BUILD_DIR: '.next-beta-check',
      API_ORIGIN: apiOrigin,
      NEXT_PUBLIC_API_URL: apiOrigin,
      WEB_PUBLIC_URL: webOrigin,
      NEXT_PUBLIC_SUPABASE_URL: dataOrigin,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-smoke-placeholder',
      NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'false',
      NODE_OPTIONS: '--max-old-space-size=1024',
    },
  },
});
