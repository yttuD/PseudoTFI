import { defineConfig, devices } from '@playwright/test';

// Real Supabase Auth + Nest/PostgREST on loopback only.
// Do NOT import the default Playwright config: it injects mock cookies.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'beta_isolation_real.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  timeout: 150_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
  },
  projects: [{ name: 'real-auth-local-chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
});
