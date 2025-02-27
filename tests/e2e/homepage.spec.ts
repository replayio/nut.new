import { test, expect } from '@playwright/test';

test('should load the homepage', async ({ page }) => {
  await page.goto('/');

  const title = await page.title();
  expect(title).toContain('Nut');
  await expect(page.locator('header')).toBeVisible();
});

test('Create a project from a preset', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('button', { name: 'Build a todo app in React' }).click();
  await page
    .locator('div')
    .filter({ hasText: /^Build a todo app in React using Tailwind$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
});
