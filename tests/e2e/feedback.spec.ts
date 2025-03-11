import { test, expect } from '@playwright/test';
import { isSupabaseEnabled } from './setup/test-utils';

test.beforeEach(async () => {
  // Log Supabase status at the start of each test
  const useSupabase = isSupabaseEnabled();
  console.log(`Test running with USE_SUPABASE=${useSupabase}`);
});

test('should submit feedback', async ({ page }) => {
  // Navigate to the homepage
  // The URL will automatically use the baseURL from the config
  await page.goto('/');

  // Get Supabase status from environment variable
  const useSupabase = isSupabaseEnabled();

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

  if (await emailField.isVisible()) {
    // We expect email field to be visible when NOT using Supabase
    expect(useSupabase).toBe(false);
    await emailField.fill('test@example.com');
  } else {
    // We expect email field to NOT be visible when using Supabase
    expect(useSupabase).toBe(true);
  }

  // Check the share project checkbox if Supabase is enabled
  if (useSupabase) {
    await page.locator('input[type="checkbox"][name="share"]').check();
  }

  // Submit the feedback
  await page.getByRole('button', { name: 'Submit Feedback' }).click();

  // Wait for the success message in the modal
  await expect(page.locator('div.text-center.mb-2').filter({ hasText: 'Feedback Submitted' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Thank you for your feedback!')).toBeVisible();
});
