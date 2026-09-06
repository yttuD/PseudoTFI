import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  globalSetup: require.resolve('./e2e/global.setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on',
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
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        channel: 'msedge',
        storageState: 'e2e/.auth/user.json'
      },
    },
  ],
});
