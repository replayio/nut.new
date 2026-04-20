import { test, expect } from '@playwright/test';

test('should load the homepage', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Replay Builder/);

  // Desktop landing uses IntroSection (no `<header>` until small viewport)
  await expect(page.getByRole('heading', { name: /Own your tools/i })).toBeVisible();
});

test('shows the landing chat prompt', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByPlaceholder('What would you like Replay Builder to build?'),
  ).toBeVisible();
});
