import { test, expect } from '@playwright/test';
import { isSupabaseEnabled } from './setup/test-utils';

const problemName = {
  false: 'Contact book tiny search icon',
  true: 'sdfsdf',
};

test.beforeEach(async () => {
  // Log Supabase status at the start of each test
  const useSupabase = isSupabaseEnabled();
  console.log(`Test running with USE_SUPABASE=${useSupabase}`);
});

test('Should be able to load a problem', async ({ page }) => {
  await page.goto('/problems');
  await page.getByRole('combobox').selectOption('all');

  const problem = problemName[isSupabaseEnabled()];
  await page.getByRole('link', { name: problem }).first().click();
  await page.getByRole('link', { name: 'Load Problem' }).click();
  await expect(page.getByText('Import the "problem" folder')).toBeVisible();
});
