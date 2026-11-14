import { expect, test } from '@playwright/test';

test.describe.skip('customer login', () => {
  test('renders email, password and Google sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('rejects an unknown account with a visible error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('nobody@example.com');
    await page.getByLabel(/password/i).fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|unauthor/i)).toBeVisible();
  });
});
