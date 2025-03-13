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
