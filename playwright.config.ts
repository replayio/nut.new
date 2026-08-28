import { defineConfig, devices } from '@playwright/test';
import { devices as replayDevices, replayReporter } from '@replayio/playwright';
import dotenv from 'dotenv';

if (!process.env.CI) {
  dotenv.config({ path: '.env.local' });
  dotenv.config({ path: '.env' });
}

const port = 5175;
const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;
const baseURL = usePreviewUrl ? process.env.PLAYWRIGHT_TEST_BASE_URL : `http://localhost:${port}`;

const replayApiKey = process.env.REPLAY_API_KEY?.trim();
const replayReporters = replayApiKey
  ? [
      replayReporter({
        apiKey: replayApiKey,
        upload: true,
      }),
    ]
  : [];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [...replayReporters, ['line'], ['html', { open: 'never' }]],
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
    ...(replayApiKey
      ? [
          {
            name: 'replay-chromium',
            use: { ...replayDevices['Replay Chromium'] },
          },
        ]
      : []),
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
