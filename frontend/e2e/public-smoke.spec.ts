import { expect, test } from '@playwright/test';

// These checks render the real application without calling configured external services.
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === new URL(baseURL!).origin ? route.continue() : route.abort();
  });
});

for (const width of [360, 412, 1440]) {
  test(`public pages and protected redirects at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['/login', '/admin', '/forgot-password', '/reset-password', '/legal/privacy', '/legal/terms']) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    for (const path of ['/dashboard', '/profile', '/kyc', '/loans', '/referral', '/payments', '/notifications']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin$/);
    await page.screenshot({ path: `test-results/admin-${width}.png`, fullPage: true });
    await page.goto('/login');
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/login-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
