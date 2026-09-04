# RupayAid customer portal audit

**Date:** 4 September 2026  
**Scope:** Customer-facing Next.js app (`frontend/`), NestJS API (`backend/`), Prisma/PostgreSQL schema. Admin UX is noted only where it leaks into the customer surface.  
**Constraint:** This document is an audit only. No application code was changed.

API global prefix is `api/v1` (so `POST /api/kyc` in product language is `POST /api/v1/kyc`). Frontend `NEXT_PUBLIC_API_URL` defaults to `http://localhost:3001/api/v1`.

---

## Current architecture

### Monorepo

pnpm workspace: `@rupayaid/web` (Next.js 14 App Router, port 3000), `@rupayaid/api` (NestJS 10, port 3001), shared `@rupayaid/ui`, `@rupayaid/types`, `@rupayaid/config`.

### Frontend

- Root layout wraps all pages in `AppProviders`: TanStack Query, toasts, `AuthProvider`, client `RouteGuard`.
- Authenticated chrome lives under `src/app/(app)/` with `AppShell` (desktop nav + mobile bottom bar).
- Auth tokens live in **sessionStorage** (`rupayaid.auth`). There is **no Next.js `middleware.ts`**; protection is client-only.
- Data access is mostly `src/hooks/use-customer-data.ts` + `src/lib/api-client.ts` (Bearer JWT, unwraps `{ success, data }`).
- Styling: Tailwind + shared UI kit (Button, Card, Input), teal fintech tokens in `globals.css`.

### Backend

- Nest global: JWT guard, roles guard, validation pipe (whitelist), transform interceptor (`{ success, data }`), exception filters, Helmet, CORS, in-memory throttle (100 req/min/IP).
- Modules: auth (OTP + staff password), user, kyc, files (R2), referrals, loans, loan-products, eligibility, payments, repayments, disbursements, ledger, notifications, audit, roles, admin, config, health, prisma, redis.
- Prisma/PostgreSQL is the system of record. Redis is used for OTP rate limits when `REDIS_URL` is set; otherwise an in-process limiter (or a no-op Redis stub if URL is missing but code still injects the client).
- **BullMQ is a dependency and env prefix exists; no queue processors are wired.**

### Database (customer-relevant)

| Area | Models |
| --- | --- |
| Identity | `User`, `UsersOnRoles` / `Role`, `CustomerProfile`, `AdminUser` |
| Auth | `Session`, `OtpRequest`, `MfaSetup` |
| KYC | `KycApplication`, `KycDetails`, `KycDocument`, `KycVerificationDecisionRecord` |
| Referrals | `User.referralCode`, `Referral` (one row per referee) |
| Lending | `LoanProduct`, `LoanApplication`, state events, approvals, disbursements, schedules, repayments, payments |
| Other | `Notification`, `AuditLog`, ledger |

---

## Implemented features

### Correct / production-shaped (customer)

**Authentication (OTP)**  
- `POST /auth/request-otp`, `verify-otp`, `refresh`, `logout`, `GET /auth/me`.  
- Hashed OTPs, attempt lock, resend cooldown, HMAC pepper, session hash + family rotation, blocked statuses.  
- Frontend: `/login`, `/verify-otp`, route guard, dashboard redirect when already signed in.  
- Unit tests: OTP success/expiry/lock/rate-limit.

**KYC (customer path)**  
- Create / get / patch / submit / status.  
- Personal, address, identity last-four, optional bank last-four + IFSC.  
- Statuses used in the wizard: Draft, Submitted, Under Review, Approved, Rejected, Resubmission Required.  
- R2 signed upload/download; DB stores object key + metadata, not public URLs. MIME + 5 MB checks; user-scoped keys.  
- Ownership on `GET /kyc/applications/:id` and document URLs.  
- Audit: created, updated, document uploaded, submitted.  
- Guided 7-step UI with progress, draft save, resume step, confirmation, status page with reviewer reason.  
- Unit tests: ownership, MIME/size, object-key safety.

**Referrals (no rewards)**  
- Unique `User.referralCode` on account create.  
- Relationship only on **first** OTP verification.  
- Self-referral blocked; one inbound referral per user; cap 50; validate rate-limited.  
- `POST /referrals/validate` (public), `GET /referrals/me`.  
- Login `?ref=` + optional code; dashboard invite card; `/referral` copy/share.  
- Unit tests for validate/apply/cap/self.

**Customer shell**  
- Dashboard snapshot (KYC, application, outstanding, referrals).  
- Loans list/apply/detail UI, payments list + initiate form, repayments schedule UI, notifications list, profile name form.

**Shared hygiene**  
- Money as Prisma `Decimal`.  
- Transform interceptor matches frontend `ApiResponse`.  
- CI: prisma generate, lint, typecheck, build (tests job still commented out).

---

## Partially implemented

| Area | What works | What is incomplete |
| --- | --- | --- |
| Profile | First/last name PATCH | City/occupation/income stored in **localStorage**, not `CustomerProfile`. No customer GET profile API. |
| Loans | Create + list mine | No KYC gate, no eligibility call, no DTO validation, no ownership on get-by-id, no customer state machine (offer accept, agreement). |
| Payments | Insert `INITIATED` row | No gateway, no webhook, no schedule allocation, IDOR on get-by-id/txRef. UI says gateway is not connected. |
| Repayments | Read schedule if rows exist | No ownership check; schedules are not generated on approve/disburse in a customer-visible way. |
| Notifications | List mine | Mark-read has no owner check; no real send pipeline (status stays `QUEUED` unless admin send). |
| Eligibility | `POST /eligibility/evaluate` exists | Not used by apply UI; rules are staff-only to list. |
| Files | KYC uses signed URLs | Generic `POST /files/upload-url` still issues keys under `kyc/{userId}/{folder}/`. |
| KYC backend | New customer API | Legacy `applications/*` duplicates; confirm does not HeadObject R2; leftover enums `NOT_SUBMITTED`, `MORE_INFO_REQUIRED`. |
| Staff JWT | Email/password login | No session `sid`; RolesGuard uses `roles[]` from DB. Customer JWT **does** bind sessions. Two auth models. |
| Redis | OTP limiter when URL set | Missing URL → mock Redis `incr` always `1` **or** memory fallback only in OTP service if URL empty. Easy to misconfigure. |
| Prisma | Rich schema | Init migration is stale vs current schema (`KycDetails`, referral columns). Team is on `db push`, not versioned migrations. |

---

## Missing features (customer portal)

- Next.js middleware / server-side auth (tokens are JS-visible sessionStorage only).
- Automatic access-token refresh in the API client (401 clears session; refresh endpoint unused by UI).
- Customer profile API (`GET/PATCH /users/me` or `/profile/me`) backed by `CustomerProfile`.
- Loan apply gated on KYC `APPROVED` (or documented exception).
- Eligibility check in the apply flow.
- Payment gateway (UPI/NEFT) + webhook + EMI allocation.
- Disbursement visibility for the borrower (controller is staff-only).
- Agreement / e-sign / offer accept.
- Device/session list and logout-all in UI.
- MFA for customers (schema exists, unused).
- Notification delivery (SMS/email/push workers).
- Frontend tests (Playwright/Jest/RTL): **none**.
- E2E API tests: **none**.
- Queues/workers for OTP, KYC OCR, payments, notifications.
- Admin customer portal is out of scope here; there is also **no separate admin Next app**.

---

## Bugs / problems

1. **`GET /users/:id` returns the full User row including `passwordHash`.** Any authenticated customer who knows/guesses a UUID can read hashes and PII. `PATCH /users/:id` has **no ownership check** (profile page patches `user.id` but the API does not enforce it).
2. **`GET /loans/applications/:id`** has no owner/staff check. Frontend loan detail uses this.
3. **`GET /payments`, `GET /payments/:id`, `GET /payments/ref/:txRef`** lack owner/role checks. `GET /payments` is a cross-customer listing by status.
4. **`GET /repayments/schedule/:loanApplicationId`** and **`GET /repayments/loan/:loanApplicationId`** have no owner check.
5. **`PATCH /notifications/:id/read`** has no owner check.
6. **`withFallback` in customer hooks** treats API errors as empty/mock data (loans, products, KYC 404, referrals). Users can see a healthy empty dashboard while the API is down or unauthorized.
7. **Loan products mock** (`MOCK_PRODUCTS`) can be submitted; apply then 404s on unknown product IDs if API was down during catalog load.
8. **KYC confirm** trusts client `objectKey` after prefix checks; object need not exist in R2.
9. **OTP user emails** are synthetic (`otp.{digits}@users.rupayaid.internal`); `GET /users/:id` leaks them.
10. **Duplicate KYC routes** (`POST /kyc` vs `POST /kyc/applications`) invite clients to use the old contract.
11. **JwtStrategy `findById`** throws `NotFoundException` (404) for missing users instead of 401.
12. **Audit `POST /audit`** (admin) allows arbitrary log injection.
13. **ThrottleGuard** is process-local; useless across multiple API instances.
14. **Mobile nav** omits KYC, apply, repayments, referral (only Home/Loans/Pay/Alerts/Me).

---

## Duplicate functionality

| Duplicate | Notes |
| --- | --- |
| KYC customer API vs `applications/*` | Same service methods; old paths still live. |
| `KycDetails` vs `CustomerProfile` | KYC patch upserts a subset of profile; profile page ignores the API. |
| `use-api.ts` vs `use-customer-data.ts` | Generic hooks appear unused by current pages. |
| Two JWT guards | `common/guards/jwt-auth.guard.ts` (used) and `auth/guards/jwt-auth.guard.ts`. |
| UserRole enum vs `Role` table | Schema enum unused; runtime roles are `UsersOnRoles`. |
| KYC status enums | Prisma still has `NOT_SUBMITTED` / `MORE_INFO_REQUIRED`; shared types and UI dropped them. |
| Referral `rewardAmount` / `CONVERTED` | Schema leftover; product deferred rewards. |

---

## Security problems (priority)

**P0 — IDOR / data leak**  
Users, loans-by-id, payments list/by-id/by-ref, repayment schedules, notification mark-read.

**P0 — Auth token storage**  
sessionStorage XSS = full account. No httpOnly cookies. No middleware.

**P1 — Authorization holes**  
RolesGuard allows any authenticated user when `@Roles` is absent (correct) but many “should be mine only” GETs never check `userId`. Staff routes that set `@Roles` are relatively safer **if** JWT includes `roles` (OTP strategy does).

**P1 — Rate limit / Redis**  
Without `REDIS_URL`, OTP uses memory (single instance). The Redis factory mock `incr` always returns `1` if something called Redis with a missing URL instead of the OTP memory path.

**P1 — Files**  
Generic upload URL endpoint; delete by encoded key; KYC confirm without storage existence check.

**P2**  
Public `POST /auth/register` (email/password) still creates customers without OTP.  
Default JWT secret fallback `dev-secret`.  
Health endpoint is public (low risk).  
Referral validate is public (intentional) but in-memory rate limit is per process.

---

## Database problems

- **No migration covering KYC details / referral code / new audit enums.** `prisma/migrations/20250101000000_init` will not match `schema.prisma`. Risk of drift and unrepeatable deploys.
- **`KycApplicationStatus` leftover values** complicate reporting and unique “one live application” queries.
- **`CustomerProfile.panNumber`** can store more than last-four (`XXXX` + last four from KYC patch). Inconsistent with KYC “never store full PAN”.
- **`Referral.code` is not unique** (correct for many referees sharing one user code); uniqueness is on `User.referralCode` and `Referral.refereeId`. Old unique-on-`referrals.code` data would fail `db push`.
- **`LoanApplication.applicationNumber`** from `count()+1` races under concurrency.
- **No DB-level “one editable KYC per user”** unique constraint; enforced in service only.
- Ledger “append-only triggers” are mentioned in schema comments; confirm they exist in the init migration before treating as a control.

---

## API inconsistencies

| Topic | Issue |
| --- | --- |
| Prefix | Product docs say `/api/...`; runtime is `/api/v1/...`. |
| KYC | New resource-style `/kyc/me` plus nested `/kyc/applications/:id`. |
| Referrals | `/referrals/me` object vs old `/referrals/my` list (old routes removed from controller; frontend updated). |
| Errors | Mix of `NotFoundException`, raw `throw new Error('Payment not found')` (likely 500). |
| List vs get | `/loans/applications/my` is owner-scoped; `/loans/applications/:id` is not. |
| Payments | Create is owner-scoped; list-all-by-status is not. |
| Validation | KYC/OTP/referrals use class-validator DTOs; loans/payments/users use inline untyped bodies. |
| Pagination | Notifications `my` is paginated; frontend sometimes treats payload as a bare array. |

---

## Frontend / backend mismatches

- Profile extras vs `CustomerProfile` (see above).
- Apply flow does not call `/eligibility/evaluate` or check `/kyc/status`.
- Payments UI allows `CARD`; may not match Prisma `PaymentMethod` enum (verify before adding methods).
- Loan catalog fallback mocks vs real products.
- `GET /kyc/me` 404 → UI shows “no KYC” via `withFallback`, which is OK for 404 but also hides 401/500.
- Shared `@rupayaid/types` KYC statuses omit Prisma leftovers (good for UI, bad if anything still sends `NOT_SUBMITTED`).
- No UI for `/auth/refresh` or session expiry other than hard logout on 401.
- Staff-only disbursement API has no customer “your money is on the way” screen.

---

## Missing tests

**Present (backend unit only)**  
- `otp-auth.service.spec.ts`  
- `otp-rate-limit.service.spec.ts`  
- `kyc.service.spec.ts` (ownership)  
- `files.service.spec.ts` (MIME/size/keys)  
- `referrals.service.spec.ts`

**Absent**  
- Controllers / e2e (`test:e2e` config unused).  
- Loans, payments, repayments, notifications, users IDOR tests.  
- KYC confirm + R2 HeadObject.  
- Referral + OTP integration (apply on first verify).  
- Entire frontend.  
- CI `test` job commented out in `.github/workflows/ci.yml`.

---

## Recommended implementation order

Do not rewrite modules. Harden and complete in this order:

1. **P0 authorization** — owner checks (or 404) on users, loans-by-id, payments, repayments, notifications; strip `passwordHash` from all user reads; add `GET/PATCH /users/me`.  
2. **Prisma migrations** — baseline current schema (`KycDetails`, referral columns, audit enums); drop or freeze leftover KYC statuses.  
3. **Auth client** — refresh-token rotation in `api-client`; stop using `withFallback` for authenticated resources (keep it only for truly optional empty states like KYC 404).  
4. **KYC cleanup** — deprecate duplicate `applications` customer routes (keep staff review); HeadObject on confirm; align enums.  
5. **Loan apply integrity** — DTOs, KYC gate, eligibility evaluate, unique application numbers, owner on get-by-id.  
6. **Profile** — persist city/occupation/income to `CustomerProfile`; remove localStorage extras.  
7. **Payments** — gateway + webhooks + EMI allocation; lock down list/get; stop fake INITIATED-as-success UX.  
8. **Repayments / disbursement customer views** — generate schedule on disburse; owner-scoped GETs.  
9. **Files** — remove or tightly constrain generic `/files/upload-url`.  
10. **Tests + CI** — IDOR tests first, then enable CI `pnpm test`; add Playwright for login → KYC draft → referral me.  
11. **Defer** — rewards/gamification, MFA, BullMQ workers, admin portal, until the IDOR and KYC/loan gates are closed.

---

## API gaps (customer)

Needed, not present (or not owner-safe):

- `GET/PATCH /users/me` (safe profile).  
- `POST /auth/refresh` used by the SPA.  
- Owner-safe loan get (same path, new check).  
- `GET /payments/me` already exists; remove or `@Roles` the unscoped `GET /payments`.  
- Customer disbursement/status by loan.  
- Eligibility invoked from apply (`POST /eligibility/evaluate` exists).  
- Optional: `DELETE /kyc/documents/:id` for resubmission.

---

## Database gaps

- Versioned migration for post-init models/columns.  
- Unique constraint for “at most one non-terminal KYC application per user” if that is the rule.  
- `CustomerProfile` actually used as source of truth for profile UI.  
- Race-safe loan application numbers (`serial` / advisory lock).  
- Drop or ignore unused reward columns until the rewards phase.

---

## Security gaps (checklist)

- [ ] IDOR on users, loans, payments, repayments, notifications  
- [ ] Password hashes never leave the API  
- [ ] Cookie or BFF session instead of (or in addition to) sessionStorage JWT  
- [ ] API-client refresh + reuse detection already on backend for OTP sessions  
- [ ] Redis required in production for OTP limits (already partly enforced)  
- [ ] Distributed rate limit (replace in-memory ThrottleGuard)  
- [ ] R2 object existence + content-type verification on KYC confirm  
- [ ] Restrict or remove generic file upload URLs  
- [ ] Disable or tightly control public `/auth/register` for customers  
- [ ] Enable tests in CI  

---

## Wait

No code changes were made beyond adding this file. Ready for implementation instructions (likely starting with P0 IDOR / `/users/me`).
