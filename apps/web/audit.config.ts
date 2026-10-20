import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'ux_audit.spec.ts',
  fullyParallel: true,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
      },
    }
  ],
});
