import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Checks if Supabase is enabled based on the environment variable
 */
export async function isSupabaseEnabled(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const checkEnv = () => {
        if (window.ENV) {
          resolve(window.ENV.USE_SUPABASE === 'true');
        } else {
          setTimeout(checkEnv, 50);
        }
      };
      checkEnv();
    });
  });
}

/**
 * Waits for the page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Checks if an element is visible on the page
 */
export async function expectElementVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Fills an input field with text
 */
export async function fillInput(page: Page, selector: string, text: string): Promise<void> {
  await page.locator(selector).fill(text);
}

/**
 * Clicks a button on the page
 */
export async function clickButton(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click();
}

/**
 * Gets the text content of an element
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
  return page.locator(selector).textContent() as Promise<string>;
}

export async function openSidebar(page: Page): Promise<void> {
  await page.locator('[data-testid="sidebar-icon"]').click();
}

export async function login(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.SUPABASE_TEST_USER_EMAIL || '');
  await page.getByRole('textbox', { name: 'Email' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.SUPABASE_TEST_USER_PASSWORD || '');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
}

export async function setLoginKey(page: Page): Promise<void> {
  await openSidebar(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'User Info' }).click();
  await page.getByRole('textbox').nth(1).click();

  await page.getByRole('textbox', { name: 'Enter your username' }).click();
  await page.getByRole('textbox', { name: 'Enter your login key' }).click();
  await page.getByRole('textbox', { name: 'Enter your login key' }).fill(process.env.NUT_LOGIN_KEY || '');

  await page.getByRole('textbox', { name: 'Enter your username' }).click();
  await page.getByRole('textbox', { name: 'Enter your username' }).fill(process.env.NUT_USERNAME || '');

  await page.getByTestId('dialog-close').click();
}
