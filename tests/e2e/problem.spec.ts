import { test, expect } from '@playwright/test';
import { isSupabaseEnabled } from './setup/test-utils';

const problemName = {
  false: 'Contact book tiny search icon',
  true: 'sdfsdf',
};

test('Should be able to load a problem', async ({ page }) => {
  await page.goto('/problems');

  const combobox = page.getByRole('combobox');
  await expect(combobox).toBeVisible({ timeout: 30000 });
  await combobox.selectOption('all');

  const useSupabase = await isSupabaseEnabled(page);
  const problem = problemName[useSupabase ? 'true' : 'false'];

  const problemLink = page.getByRole('link', { name: problem }).first();
  await expect(problemLink).toBeVisible({ timeout: 30000 });
  await problemLink.click();

  const loadProblemLink = page.getByRole('link', { name: 'Load Problem' });
  await expect(loadProblemLink).toBeVisible({ timeout: 30000 });
  await loadProblemLink.click();

  await expect(page.getByText('Import the "problem" folder')).toBeVisible({ timeout: 30000 });
});
