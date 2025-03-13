import { defineConfig, devices } from '@playwright/test';

const port = 5175;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // Increase global timeout to 60 seconds
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    port,
    timeout: 120000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
