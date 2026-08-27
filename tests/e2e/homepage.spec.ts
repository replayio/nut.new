import { test, expect } from '@playwright/test';

test('should show Builder shutdown announcement', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/shut down/i);
  await expect(page.getByTestId('shutdown-announcement')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Replay QA' })).toHaveAttribute('href', 'https://www.replay.io/');
  await expect(page.getByRole('link', { name: 'let us know' })).toHaveAttribute(
    'href',
    'https://www.replay.io/contact',
  );
});

test('app deep links also show shutdown announcement', async ({ page }) => {
  await page.goto('/app/33a33c71-c5b4-4fa1-9286-333fefc49803');

  await expect(page.getByTestId('shutdown-announcement')).toBeVisible();
});
