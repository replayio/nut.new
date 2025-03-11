import { test, expect } from '@playwright/test';
import { isSupabaseEnabled } from './setup/test-utils';

test.beforeEach(async () => {
  // Log Supabase status at the start of each test
  const useSupabase = isSupabaseEnabled();
  console.log(`Test running with USE_SUPABASE=${useSupabase}`);
});

test('should load the homepage', async ({ page }) => {
  // Using baseURL from config
  await page.goto('/');

  const title = await page.title();
  expect(title).toContain('Nut');
  await expect(page.locator('header')).toBeVisible();
});

test('Create a project from a preset', async ({ page }) => {
  // Using baseURL from config instead of hardcoded URL
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a todo app in React' }).click();
  await page
    .locator('div')
    .filter({ hasText: /^Build a todo app in React using Tailwind$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
});
