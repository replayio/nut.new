import { test, expect } from '@playwright/test';

test('should submit feedback with [test] prefix', async ({ page }) => {
  // Navigate to the homepage
  await page.goto('/');

  // Click on the Feedback button
  await page.getByRole('button', { name: 'Feedback' }).click();

  // Verify the feedback modal is open
  await expect(page.getByText('Share Your Feedback')).toBeVisible();

  /*
   * Fill in the feedback form with a message that doesn't have [test] prefix
   * The component should automatically add it
   */
  const feedbackMessage = 'This is a test feedback message';
  await page.locator('textarea[name="description"]').fill(feedbackMessage);

  // If email field is required (when not using Supabase), fill it
  const emailField = page.locator('input[type="email"][name="email"]');

  if (await emailField.isVisible()) {
    await emailField.fill('test@example.com');
  }

  // Submit the feedback
  await page.getByRole('button', { name: 'Submit Feedback' }).click();

  // Wait for the success message in the modal
  await expect(page.locator('div.text-center.mb-2').filter({ hasText: 'Feedback Submitted' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
});

// Test feedback flow with Supabase enabled
test('should submit feedback with Supabase enabled', async ({ page }) => {
  // Navigate to the homepage with Supabase enabled
  await page.goto('/?supabase=true');

  // Click on the Feedback button
  await page.getByRole('button', { name: 'Feedback' }).click();

  // Verify the feedback modal is open
  await expect(page.getByText('Share Your Feedback')).toBeVisible();

  // Fill in the feedback form with [test] prefix
  const feedbackMessage = '[test] This is a test feedback message with Supabase';
  await page.locator('textarea[name="description"]').fill(feedbackMessage);

  // Email field should not be visible when using Supabase
  const emailField = page.locator('input[type="email"][name="email"]');
  await expect(emailField).not.toBeVisible();

  // Check the share project checkbox
  await page.locator('input[type="checkbox"][name="share"]').check();

  // Submit the feedback
  await page.getByRole('button', { name: 'Submit Feedback' }).click();

  // Wait for the success message in the modal
  await expect(page.locator('div.text-center.mb-2').filter({ hasText: 'Feedback Submitted' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
});
