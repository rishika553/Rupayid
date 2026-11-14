import { test } from '@playwright/test';

test.describe.skip('kyc wizard happy path', () => {
  test('personal → address → identity → documents → review', async ({ page }) => {
    await page.goto('/kyc');
    // Step 1: personal details
    // Step 2: address
    // Step 3: identity
    // Step 4: document upload (requires a signed R2 presign)
    // Step 5: review + submit
    // TODO: enable once a seeded "fresh customer" fixture exists.
  });
});
