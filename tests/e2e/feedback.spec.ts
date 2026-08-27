import { test, expect } from '@playwright/test';

test('retired Builder APIs return 410', async ({ request }) => {
  const endpoints = [
    '/api/stripe/create-checkout',
    '/api/stripe/manage-subscription',
    '/api/intercom',
    '/api/intercom/jwt',
  ];

  for (const path of endpoints) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(410);
  }
});
