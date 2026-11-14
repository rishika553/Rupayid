# Frontend E2E tests (Playwright)

Prerequisites:
- `pnpm --filter @rupayaid/web exec playwright install --with-deps chromium` (once)
- Backend API reachable at `NEXT_PUBLIC_API_URL`
- Frontend dev server (`pnpm dev:web`) running at `PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`)

Run: `pnpm --filter @rupayaid/web test:e2e`

## Local public smoke checks

`public-smoke.spec.ts` runs without seeded accounts. It checks public page rendering,
horizontal overflow at 360/412/1440 px, uncaught page errors, and unauthenticated
customer/admin redirects. External requests are aborted: this is not evidence of
Google sign-in or backend integration. Start the built frontend locally, set
`PLAYWRIGHT_BASE_URL`, and run `pnpm test:e2e -- public-smoke.spec.ts --workers=1`.

## Why the original journey specs are `test.describe.skip`

They cover the 5 critical journeys but each needs a seeded database state (a signed-up customer, admin account, loan product, KYC application, Razorpay test order). The scaffolds are in place so they can be enabled one at a time as fixtures land.

Journeys:
1. `login.spec.ts` — email/password + Google button
2. `kyc-wizard.spec.ts` — personal → address → identity → documents → review
3. `loan-apply.spec.ts` — product select → eligibility → submit
4. `payments.spec.ts` — Razorpay checkout button renders with the right order id
5. `admin-kyc.spec.ts` — admin login + KYC list + decision submission
