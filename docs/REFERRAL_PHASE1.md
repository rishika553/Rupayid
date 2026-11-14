# Phase 1 referral implementation

Implemented 10 November 2026.

## Audit and implementation decisions

The project already had a Nest referral module, unique codes on User, registration attribution, an existing Referral model, and mobile/web sharing screens. Customer APIs use the existing customer JWT/session strategy. The staff portal uses a separate admin JWT audience and active admin sessions under `/api/admin/*`.

This implementation extends those components. It preserves the existing `referrerId` and `code` database names rather than renaming them to `referrerUserId` and `referralCode`. They represent the same requested fields. The existing registration attribution and `/referrals/me` response remain compatible.

Implementation sequence: audit; additive database and authenticated APIs; mobile form/history/stats; staff management; validation, authorization, migration and UI tests; migration application.

## Database

Migration: `backend/prisma/migrations/20261110093000_referral_phase1/migration.sql`.

- Extends the existing `referrals` table; no separate rewards engine or parallel referral table.
- Makes `refereeId` optional because a submitted contact may not have an account.
- Adds `referredName`, `referredPhone`, `consentAttestedAt`, and `consentVersion`. These are nullable for pre-existing signup rows.
- Adds CONTACTED and REJECTED to the existing status enum. New contact submissions receive PENDING; legacy signup attribution retains ACCEPTED and its other existing statuses.
- Adds a unique index on the canonical `+91` phone number and a status/date index. Existing owner/status and code indexes remain.
- Adds a contact-details check constraint; the API requires a valid name, Indian phone number, and literal boolean consent confirmation.
- One submitted contact referral per normalized phone number globally, including rejected entries. Duplicate responses do not disclose the referrer or status.
- No existing customer, KYC, loan, payment, or referral rows were deleted or rewritten.

The entire migration history was tested in an isolated local PostgreSQL 16 instance, with a legacy referral inserted before the new migration. That instance has been stopped. The new migration was then applied to the configured app database through its direct connection. Prisma reports the database schema is up to date.

## API endpoints

Customer routes use the `/api/v1` prefix and existing customer JWT authentication.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/referrals/me` | Existing endpoint: retrieve or generate stable unique code; preserve signup history response |
| POST | `/api/v1/referrals` | Submit `{ referredName, referredPhone, consentConfirmed: true }` |
| GET | `/api/v1/referrals/history?page=1&limit=20` | Paginated contact referrals owned by authenticated customer |
| GET | `/api/v1/referrals/statistics` | Customer's total, pending, contacted, converted, rejected contact counts |
| GET | `/api/admin/referrals?page=1&limit=20&status=PENDING&search=...` | Staff contact-referral list with name/phone search, status filter, referrer, date and consent record |
| PATCH | `/api/admin/referrals/:id/status` | Staff status change: `{ status }` |

All new routes require authentication. Admin routes require an active admin session; customer tokens cannot access them. The existing public, rate-limited `/api/v1/referrals/validate` endpoint remains available to the existing pre-registration flow and returns only code validity. Its public contract was not changed.

The submit API derives both referrer and code from the authenticated customer. Extra request fields such as referrer ID or status are rejected. Status updates and their audit record commit in one transaction, with concurrent-update detection. Audit entries use the existing REFERRAL_APPLIED action with the message `Referral status updated` and previous/new statuses; no contact name or phone is logged. Referral admin search query strings are omitted from HTTP logs.

## Mobile

- Home links directly to submission and tracking.
- Blue-and-white referral page with unique code, native share, total/pending/converted counts, and paginated contact history/status badges.
- Full-name and Indian-phone validation on both client and server; support for ten digits or `+91` format, including spaces/hyphens.
- Mandatory consent checkbox, contact-use explanation, and explicit instruction not to submit Aadhaar or documents.
- Duplicate submission protection while a request is pending; clear success/error messages; form clears only after success.
- Query invalidation refreshes history, counts and dashboard data after a submission.
- Existing email registration gains an optional referral-code input. The existing Google flow receives that same optional code when available; authentication contracts are unchanged.
- Existing signup referrals remain visible in a separate section. New contact statistics and the admin contact queue measure submitted contacts, not legacy signup rows. These flows are not automatically merged because email registration does not establish a verified phone identity.
- Removed the Home reward promise; Phase 1 does not award money or automate conversion.

Consent statement v1: “I confirm this person agreed to share their name and mobile number with RupayAid and be contacted about its services.” The backend stores `referral-contact-v1` and its receipt timestamp with the referrer's identity. This records the customer's attestation, not independent verification of the referred person's consent. Staff are instructed to confirm willingness to continue and mark REJECTED when declined. No calls, SMS, or emails are automatically sent.

## Admin

The existing staff sidebar now includes Referrals at `/admin/referrals`. Staff can search name/phone, filter the four Phase 1 statuses, paginate, view referrer name/email/code and submission/consent dates, and save status changes. Error/loading/empty states are implemented. Status changes refresh the list; failed saves remain visible for retry.

## Files created

- `backend/prisma/migrations/20261110093000_referral_phase1/migration.sql`
- `backend/src/modules/referrals/admin-referrals.controller.ts`
- `backend/src/modules/referrals/referrals-phase1.spec.ts`
- `backend/src/modules/referrals/referrals-http.spec.ts`
- `backend/test/referral-migration.cjs`
- `backend/scripts/referral-migration.cjs`
- `mobile/src/hooks/use-referrals.ts`
- `mobile/src/ui/referral.test.tsx`
- `frontend/src/app/admin/referrals/page.tsx`
- `frontend/src/app/admin/referrals/page.test.tsx`
- `docs/REFERRAL_PHASE1.md`

## Files modified

- `backend/prisma/schema.prisma`
- `backend/src/modules/referrals/dto/referral.dto.ts`
- `backend/src/modules/referrals/referrals.service.ts`
- `backend/src/modules/referrals/referrals.controller.ts`
- `backend/src/modules/referrals/referrals.module.ts`
- `backend/src/common/interceptors/logging.interceptor.ts`
- `mobile/app/(app)/referral.tsx`
- `mobile/app/(app)/dashboard.tsx`
- `mobile/app/(app)/_layout.tsx`
- `mobile/app/(auth)/register.tsx`
- `mobile/src/auth/google-sign-in-button.tsx`
- `mobile/src/auth/google-sign-in-provider.tsx`
- `frontend/src/lib/admin-api-client.ts`
- `frontend/src/app/admin/layout.tsx`
- `frontend/vitest.config.ts`

## Verification

| Check | Result |
| --- | --- |
| Backend Jest suite | 163 tests, 27 suites passed |
| Mobile Jest suite | 51 tests, 7 suites passed |
| Mobile auth-session and Google wrapper regressions | 31 tests passed |
| Frontend Vitest | 23 tests, 3 files passed |
| Backend, mobile, frontend TypeScript | Passed |
| Backend changed-area ESLint, mobile lint, frontend lint | Passed |
| Nest build | Passed |
| Next.js production build | Passed, including `/admin/referrals` |
| Android Expo export with Hermes | Passed; bundle generated in ignored `mobile/dist-android` |
| Isolated database integration | Passed: full migration history, old data preservation, concurrent code generation, duplicate insert race, owner isolation, statistics, admin search/statuses/audit, consent constraint, legacy API |
| Configured app database migration status | Up to date |

HTTP tests use the real JWT strategies and guards with isolated session/user stores, covering anonymous rejection, customer/admin token separation, forged ownership, validation and status updates. Mobile tests exercise form validation/consent, submission payload, clearing, duplicate error, history/counts, and native sharing. Admin component tests exercise listing, search/filtering, save/refetch and error handling.

## Running and remaining verification

Keep the existing backend terminal running. Reload Expo Go and choose Home → Submit or track referrals (also available from Profile → Referrals). Staff use `/admin/referrals` in the existing web portal. If an already-running backend holds the old generated Prisma client, restart it with `npm.cmd run start:dev` from `backend`.

No production contact referrals or test customer accounts were inserted for testing. A physical-phone walkthrough and live Google OAuth referral attribution were not performed in this change. No APK/AAB or public frontend deployment was produced. Consent is attested by the referrer; automated consent verification, rewards, notifications and conversion attribution are outside this Phase 1 implementation.
