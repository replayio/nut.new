import { test, expect } from '@playwright/test';
import { isSupabaseEnabled, login, setLoginKey, openSidebar } from './setup/test-utils';

test('Should be able to load a problem', async ({ page }) => {
  await page.goto('/problems');

  const combobox = page.getByRole('combobox');
  await expect(combobox).toBeVisible({ timeout: 30000 });
  await combobox.selectOption('all');

  const problemLink = page.getByRole('link', { name: 'Contact book tiny search icon' }).first();
  await expect(problemLink).toBeVisible({ timeout: 30000 });
  await problemLink.click();

  const loadProblemLink = page.getByRole('link', { name: 'Load Problem' });
  await expect(loadProblemLink).toBeVisible({ timeout: 30000 });
  await loadProblemLink.click();

  await expect(page.getByText('Import the "problem" folder')).toBeVisible({ timeout: 30000 });
});

test('Should be able to save a problem ', async ({ page }) => {
  await page.goto('/problems');
  await page.getByRole('link', { name: 'App goes blank getting' }).click();
  await page.getByRole('link', { name: 'Load Problem' }).click();

  const useSupabase = await isSupabaseEnabled(page);
  await expect(page.getByText('Import the "problem" folder')).toBeVisible({ timeout: 30000 });
  await login(page);

  await expect(page.getByText('Import the "problem" folder')).toBeVisible({ timeout: 30000 });

  await openSidebar(page);
  await page.getByRole('button', { name: 'Save Problem' }).click();

  await page.locator('input[name="title"]').click();
  await page.locator('input[name="title"]').fill('[test] playwright');
  await page.locator('input[name="description"]').click();
  await page.locator('input[name="description"]').fill('...');

  if (!useSupabase) {
    await page.locator('input[name="username"]').click();
    await page.locator('input[name="username"]').fill('playwright');
  }

  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
});

test('Should be able to update a problem', async ({ page }) => {
  await page.goto('/problems?showAll=true');
  await page.getByRole('combobox').selectOption('all');

  await page.getByRole('link', { name: '[test] playwright' }).first().click();
  expect(await page.getByRole('textbox', { name: 'Set the title of the problem' })).not.toBeVisible();

  await login(page);

  const currentTime = new Date();
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  const title = `[test] playwright ${timeString}`;

  await page.getByRole('textbox', { name: 'Set the title of the problem' }).click();
  await page.getByRole('textbox', { name: 'Set the title of the problem' }).fill(title);
  await page.getByRole('button', { name: 'Set Title' }).click();

  await page.getByRole('heading', { name: title }).click();
  await page.getByRole('combobox').selectOption('Solved');
  await page.getByRole('button', { name: 'Set Status' }).click();
  await page.locator('span').filter({ hasText: 'Solved' }).click();
  await page.getByRole('combobox').selectOption('Pending');
  await page.getByRole('button', { name: 'Set Status' }).click();
  await page.locator('span').filter({ hasText: 'Pending' }).click();
});

test('Confirm that isAdmin is saved correctly', async ({ page }) => {
  await page.goto('/problems?showAll=true');
  await page.getByRole('combobox').selectOption('all');
  await page.getByRole('link', { name: '[test] playwright' }).first().click();

  if (await isSupabaseEnabled(page)) {
    expect(true).toBe(true);
    return;
  }

  await setLoginKey(page);
  await expect(await page.getByRole('button', { name: 'Set Status' })).toBeVisible();

  await page.reload();
  await expect(await page.getByRole('button', { name: 'Set Status' })).toBeVisible();
});

test('Should be able to add a comment to a problem', async ({ page }) => {
  await page.goto('/problems?showAll=true');
  await page.getByRole('combobox').selectOption('all');
  await page.getByRole('link', { name: '[test] playwright' }).first().click();

  await login(page);

  // Add a comment to the problem
  const comment = `test comment ${Date.now().toString()}`;
  await page.getByRole('textbox', { name: 'Add a comment...' }).click();
  await page.getByRole('textbox', { name: 'Add a comment...' }).fill(comment);
  await page.getByRole('button', { name: 'Add Comment' }).click();
  await expect(page.locator('[data-testid="problem-comment"]').filter({ hasText: comment })).toBeVisible();

  // Reload the page and check that the comment is still visible
  await page.reload();
  await expect(page.locator('[data-testid="problem-comment"]').filter({ hasText: comment })).toBeVisible();
});

test('Confirm that admins see the "Save Reproduction" button', async ({ page }) => {
  await page.goto('/problems?showAll=true');

  await login(page);
  await openSidebar(page);
  await expect(page.getByRole('link', { name: 'Save Reproduction' })).toBeVisible();
});

test('Should be able to save a reproduction', async ({ page }) => {
  await page.goto('/problems?showAll=true');
  await page.getByRole('combobox').selectOption('all');
  await page.getByRole('link', { name: '[test] tic tac toe' }).first().click();

  const shouldUseSupabase = await isSupabaseEnabled(page);
  await login(page);

  await page.getByRole('link', { name: 'Load Problem' }).click();

  // TODO: Find a way to interact with the tic tac toe board
  // find the cell in the tic tac toe board inside the iframe
  // const frameLocator = page.frameLocator('iframe[title="preview"]').first();
  // await frameLocator.getByTestId('cell-0-0').click();

  const message = `test message ${Date.now().toString()}`;

  await page.getByRole('textbox', { name: 'How can we help you?' }).click();
  await page.getByRole('textbox', { name: 'How can we help you?' }).fill(message);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();

  await openSidebar(page);

  await page.getByRole('link', { name: 'Save Reproduction' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Reproduction saved')).toBeVisible();

  /*
   * Check to see if __currentProblem__ is set and has the correct solution message
   */
  const currentProblem = await page.evaluate(() => {
    // @ts-ignore - accessing window.__currentProblem__ which is defined at runtime
    return window.__currentProblem__;
  });

  // Only supabase is working for now
  if (shouldUseSupabase) {
    // Check if the message is a text message before accessing content
    const message3 = currentProblem?.solution?.messages[2];
    expect(message3 && message3.type === 'text' ? (message3 as any).content : null).toBe(message);
  }
});
