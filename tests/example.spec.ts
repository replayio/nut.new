import { test, expect } from '@playwright/test';

test('test homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Get unstuck' }).click();
});

test('go to load problems', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('div')
    .filter({ hasText: /^Feedback$/ })
    .locator('div')
    .click();
  await page.getByRole('link', { name: 'Problems' }).click();
  await page.getByRole('combobox').selectOption('Pending');
  await page.getByRole('link', { name: 'sdfsdf sdf Status: Pending' }).click();
  await page.getByRole('link', { name: 'Load Problem' });
});

test.skip('load problem', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('div')
    .filter({ hasText: /^Feedback$/ })
    .locator('div')
    .click();
  await page.getByRole('link', { name: 'Problems' }).click();
  await page.getByRole('combobox').selectOption('Pending');
  await page.getByRole('link', { name: 'test 1 sdsdfsdf Status:' }).click();
  await page.getByRole('link', { name: 'Load Problem' }).click();
  await page
    .locator('div')
    .filter({ hasText: /^Import the "problem" folder$/ })
    .first()
    .click();
});
