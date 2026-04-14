import { defineConfig, devices, type Project } from '@playwright/test';
import { devices as replayDevices, replayReporter, getExecutablePath } from '@replayio/playwright';
import dotenv from 'dotenv';

// Load env for tests that hit real backends (e.g. feedback → Supabase)
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const port = Number(process.env.PLAYWRIGHT_WEB_SERVER_PORT ?? 5175);
const usePreviewUrl = !!process.env.PLAYWRIGHT_TEST_BASE_URL;
const baseURL = usePreviewUrl ? (process.env.PLAYWRIGHT_TEST_BASE_URL as string) : `http://localhost:${port}`;

/** Replay upload requires a key; GitHub secrets are not env vars until the workflow maps them. */
const replayApiKey = process.env.REPLAY_API_KEY?.trim();
const replayReporters = replayApiKey
  ? [
      replayReporter({
        apiKey: replayApiKey,
        upload: true,
      }),
    ]
  : [];

/**
 * The Replay reporter only treats a project as "Replay browser" when
 * `project.use.launchOptions.executablePath === getRuntimePath()` (see
 * `@replayio/playwright` reporter). Playwright workers receive a serialized
 * config where the stock getter-based `executablePath` can be lost, so
 * `usesReplayBrowser` stays false → no tests or recordings are uploaded (empty
 * dashboard). Force a plain string path + copy `env` so workers match.
 */
function createReplayChromiumProject(): Project {
  const template = replayDevices['Replay Chromium'];
  const launchOptions = template.launchOptions;
  const executablePath = getExecutablePath();
  if (!executablePath) {
    throw new Error('Replay Chromium is not installed. Run: pnpm exec replayio install');
  }
  return {
    name: 'replay-chromium',
    use: {
      ...template,
      launchOptions: {
        env: { ...launchOptions.env },
        executablePath,
      },
    },
  };
}

/**
 * Stock `chromium` does not write Replay recordings. In CI with a key, run only
 * `replay-chromium` so each dashboard row has a recording (after fix above).
 */
const projects: Project[] =
  process.env.CI && replayApiKey
    ? [createReplayChromiumProject()]
    : process.env.CI
      ? [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : [
          {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
          },
          ...(replayApiKey ? [createReplayChromiumProject()] : []),
        ];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker in CI with Replay avoids flaky metadata / upload races.
  workers: process.env.CI && replayApiKey ? 1 : process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI
    ? [...replayReporters, ['line'], ['github'], ['html', { open: 'never' }]]
    : [...replayReporters, ['line'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects,
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
