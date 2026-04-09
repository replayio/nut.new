import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load env for tests that hit real backends (e.g. feedback → Supabase)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const port = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? 5175);
const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;
const baseURL = usePreviewUrl ? (process.env.PLAYWRIGHT_TEST_BASE_URL as string) : `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: usePreviewUrl
    ? undefined
    : {
        command: `pnpm dev --port ${port}`,
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
