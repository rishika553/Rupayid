import { test } from '@playwright/test';

test.describe.skip('loan application', () => {
  test('product select → eligibility → submit', async ({ page }) => {
    await page.goto('/loans/apply');
    // TODO: pick product, enter amount + tenure, verify eligibility call, submit, expect state change.
  });
});
