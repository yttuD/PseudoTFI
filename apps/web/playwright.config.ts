import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: 'list',
  globalSetup: require.resolve('./e2e/global.setup.ts'),
  globalTeardown: require.resolve('./e2e/global.teardown.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'off',
  },
  webServer: {
    command: 'node ./e2e/fixtures/test-server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AUTH_ALLOW_DEV_TOKENS: 'true',
      NEXT_PUBLIC_AUTH_ALLOW_DEV_TOKENS: 'true',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001',
      API_URL: 'http://127.0.0.1:3001',
      PLAYWRIGHT_TEST: '1',
      PORT: '3000',
    },
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        storageState: 'e2e/.auth/user.json'
      },
    },
  ],
});
