import { test, expect } from '@playwright/test';

test('Should be able to load a problem', async ({ page }) => {
  await page.goto('/problems');
  await page.getByRole('link', { name: 'Contact book tiny search icon' }).click();
  await page.getByRole('link', { name: 'Load Problem' }).click();
  await expect(page.getByText('Import the "problem" folder')).toBeVisible();
});
