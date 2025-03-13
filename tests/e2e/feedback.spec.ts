import { test, expect } from '@playwright/test';
import { isSupabaseEnabled } from './setup/test-utils';

test('should submit feedback', async ({ page }) => {
  await page.goto('/');

  // Get Supabase status from environment variable
  const useSupabase = await isSupabaseEnabled(page);

  // Click on the Feedback button
  await page.getByRole('button', { name: 'Feedback' }).click();

  // Verify the feedback modal is open
  await expect(page.getByText('Share Your Feedback')).toBeVisible();

  // Prepare feedback message
  const feedbackMessage = useSupabase
    ? '[test] This is a test feedback message with Supabase'
    : 'This is a test feedback message';

  await page.locator('textarea[name="description"]').fill(feedbackMessage);

  // If email field is required (when not using Supabase), fill it
  const emailField = page.locator('input[type="email"][name="email"]');

  if (useSupabase) {
    await expect(emailField).toBeHidden();
  } else {
    await emailField.fill('test@example.com');
  }

  await page.locator('input[type="checkbox"][name="share"]').check();

  // Submit the feedback
  await page.getByRole('button', { name: 'Submit Feedback' }).click();

  // Wait for the success message in the modal
  await expect(page.locator('div.text-center.mb-2').filter({ hasText: 'Feedback Submitted' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
});
