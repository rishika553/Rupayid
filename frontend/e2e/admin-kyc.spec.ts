import { test } from '@playwright/test';

test.describe.skip('admin KYC review', () => {
  test('admin login → KYC list → approve', async ({ page }) => {
    await page.goto('/admin');
    // TODO: log in as seeded admin, open KYC list, open a pending item, submit decision.
  });
});
