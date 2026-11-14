import { test } from '@playwright/test';

test.describe.skip('repayment via Razorpay', () => {
  test('checkout button opens Razorpay with the right order id', async ({ page }) => {
    await page.goto('/payments');
    // TODO: stub window.Razorpay, trigger checkout, assert order id passed in.
  });
});
