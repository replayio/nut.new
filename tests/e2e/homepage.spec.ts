import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Check that the page title is correct
    const title = await page.title();
    expect(title).toContain('Nut');

    // Verify some key elements are visible
    await expect(page.locator('header')).toBeVisible();
  });
});
