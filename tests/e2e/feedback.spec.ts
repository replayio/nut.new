import { test, expect } from '@playwright/test';

test('should submit feedback', async ({ page }) => {
  await page.goto('/');

  // Click on the Feedback button
  await page.getByRole('button', { name: 'Feedback' }).click();

  // Verify the feedback modal is open
  await expect(page.getByText('Share Your Feedback')).toBeVisible();

  // Prepare feedback message
  const feedbackMessage = '[test] This is a test feedback message with Supabase';

  await page.locator('textarea[name="description"]').fill(feedbackMessage);

  // If email field is required (when not using Supabase), fill it
  const emailField = page.locator('input[type="email"][name="email"]');

  await expect(emailField).toBeHidden();

  await page.locator('input[type="checkbox"][name="share"]').check();

  // Submit the feedback
  await page.getByRole('button', { name: 'Submit Feedback' }).click();

  // Wait for the success message in the modal
  await expect(page.locator('div.text-center.mb-2').filter({ hasText: 'Feedback Submitted' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
});
