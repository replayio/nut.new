import { test, expect } from '@playwright/test';

test('Should be able to load a problem', async ({ page }) => {
  await page.goto('/problems');

  const combobox = page.getByRole('combobox');
  await expect(combobox).toBeVisible({ timeout: 30000 });
  await combobox.selectOption('all');

  const problem = 'Contact book tiny search icon';

  const problemLink = page.getByRole('link', { name: problem }).first();
  await expect(problemLink).toBeVisible({ timeout: 30000 });
  await problemLink.click();

  const loadProblemLink = page.getByRole('link', { name: 'Load Problem' });
  await expect(loadProblemLink).toBeVisible({ timeout: 30000 });
  await loadProblemLink.click();

  await expect(page.getByText('Import the "problem" folder')).toBeVisible({ timeout: 30000 });
});
