import { defineConfig, devices } from '@playwright/test';

const port = 5175;
const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;
const baseURL = usePreviewUrl ? process.env.PLAYWRIGHT_TEST_BASE_URL : `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // Increase global timeout to 60 seconds
  use: {
    baseURL,
    trace: 'on',
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
        port,
        timeout: 120000, // 2 minutes
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
