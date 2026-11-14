# Project status — RupayAid

Snapshot date: 2026-11-09. Source: inspection of code, Prisma schema, Git history. **Not verified by running the app.** "Present in code" means the module / route / migration exists; it does not mean it has been tested end-to-end in this session.

## Verification legend

- **[code]** Code and routes/migrations exist in the repo.
- **[verified]** Exercised in a running app in this session (none yet — fresh memory system).
- **[partial]** Code present but a dependency, flag, or UI piece is missing or disabled.
- **[pending]** Not started or only stubbed.
- **[bug]** Known issue — see "Known issues".

## Backend (NestJS, `backend/src/modules`)

| Module | Status | Notes |
|---|---|---|
| `auth` | [code] | Email/password + Google; JWT access + refresh via `Session`. OTP flow present per migrations + `OtpRequest` model. |
| `admin-auth` | [code] | Separate admin login at `/api/admin/auth`. |
| `customers` | [code] | `/customers/me`. |
| `dashboard` | [code] | Customer dashboard aggregation. |
| `kyc` | [code] | KYC application, details, documents. Uses R2 via `files`. |
| `admin-kyc` | [code] | Staff KYC review, decisions, audit records (see migration `20260911140000_admin_kyc_audit_actions`). |
| `files` | [code] | Cloudflare R2 presigned uploads/downloads. |
| `eligibility` | [code] | Rule-based eligibility (versioned rules in schema). |
| `loan-products` | [code] | Catalogue. |
| `loans` | [code] | Application → state events → approval. |
| `disbursements` | [code] | `LoanDisbursement` model + admin route. |
| `repayments` | [code] | Repayment schedule, repayments. |
| `payments` | [code] | Razorpay integration + `PaymentWebhookEvent`, `PaymentTransaction`. |
| `admin-ops` | [code] | Admin operations endpoints. |
| `admin` | [code] | Admin shell module. |
| `ledger` | [code] | Double-entry models `Ledger` + `LedgerEntry`. |
| `notifications` | [code] | Templates, deliveries, attempts. |
| `referrals` | [code] | `Referral` model. |
| `roles` | [code] | RBAC: `Role`, `Permission`, `RolePermission`, `UsersOnRoles`. |
| `audit` | [code] | `AuditLog` writes. |
| `health` | [code] | `GET /health`. |
| `user`, `config`, `prisma` | [code] | Infra. |

### Prisma — 10 migrations applied to the init baseline

`20250101000000_init` → through `20260914143000_user_google_id`. Covers: customer portal, profile audit, loan application flow, payments/repayments, notifications, admin KYC review, KYC document-view audit, admin KYC audit actions, Google ID on `User`.

## Frontend (`frontend/src/app`)

Customer portal routes present: `login`, `forgot-password`, `reset-password`, `dashboard`, `(app)/kyc`, `(app)/loans`, `(app)/repayments`, `(app)/payments`, `(app)/notifications`, `(app)/profile`, `(app)/referral`, `legal`. All **[code]**.

Admin portal routes present (`/admin`): `dashboard`, `kyc`, `loans`, `disbursements`, `repayments`. **[code]**.

## Mobile (`mobile/app`, Expo Router)

Auth group: `login`, `register`, `forgot-password`, `reset-password`. **[code]**.
App group: `dashboard`, `kyc/`, `loans/`, `payments`, `repayments`, `notifications`, `profile`, `referral`, `legal`. **[code]**.
Android build added in commit `c88958f`. **[code]**.

## Landing site (`landing_pagee`)

Standalone Next.js project, deployed independently on Vercel. **[code]**. Not part of pnpm workspace.

## Deployment

| Surface | Host | Status |
|---|---|---|
| Landing | Vercel | [code] — `vercel.json` present |
| Frontend | Vercel | [code] — `vercel.json` present; recent fixes `75a1ae3`, `d25ba23` |
| Backend | Render | [code] — per README; Node pinned (`2fc64fc`) |
| Database | Neon (PostgreSQL) | [code] |
| Object storage | Cloudflare R2 | [code] |
| Redis | Upstash | optional; falls back to in-memory |

## CI/CD (`.github/workflows/ci.yml`)

- Runs on push/PR to `main`, `develop`.
- Jobs: lint + typecheck, then build (web + api). **[verified: workflow file present]**.
- Test job is **commented out** — no CI test gate today. **[partial]**.

## Health audit — 2026-11-09 (read-only)

### Commands executed

| # | Command | Result |
|---|---|---|
| 1 | `git status --short` + `git branch --show-current` | Branch `fix/ci-vercel-build`. Untracked: `CLAUDE.md`, `docs/`. Modified: `mobile/.gitignore`. |
| 2 | `node_modules` check | All workspaces have `node_modules`; install skipped. |
| 3 | `pnpm --filter @rupayaid/api typecheck` | **PASS** — no errors. |
| 4 | `pnpm --filter @rupayaid/web typecheck` | **PASS** — no errors. |
| 5 | `pnpm --filter @rupayaid/mobile typecheck` | **PASS** — no errors. |
| 6 | `pnpm --filter @rupayaid/api lint` | **PASS** — 0 problems. |
| 7 | `pnpm --filter @rupayaid/web lint` | **PASS** — 0 errors, 7 warnings (see below). |
| 8 | `pnpm --filter @rupayaid/mobile lint` | **PASS** — 0 errors, 16 warnings. |
| 9 | `pnpm --filter @rupayaid/api test` | **PASS** — 25 suites, 129/129 tests. |
| 10 | `pnpm --filter @rupayaid/web test` | **NOT EXECUTED** — no `test` script defined in `frontend/package.json`. |
| 11 | `pnpm --filter @rupayaid/mobile test` | **NOT EXECUTED** — no `test` script defined in `mobile/package.json`. |
| 12 | `pnpm --filter @rupayaid/api build` | **PASS** — `nest build` succeeded. |
| 13 | `pnpm --filter @rupayaid/web build` | **FAIL** — see below. |

### Failed check — frontend build

`pnpm --filter @rupayaid/web build` exits non-zero. Static-page export for `/404` and `/500` throws:

```
TypeError: Cannot read properties of null (reading 'useRef')
  at exports.useRef (node_modules/next/node_modules/react/cjs/react.production.min.js:25:337)
Error occurred prerendering page "/404".
Export encountered errors on following paths:
  /_error: /404
  /_error: /500
```

**Cause** — pnpm's default hoisted node-linker is placing two React instances in play (the hoisted one and the nested `next/node_modules/react`). Next.js server renderer sees a `null` dispatcher and dies in `useRef`. This is precisely why `.github/workflows/ci.yml` sets `npm_config_node_linker: isolated` in the build job. Locally the default linker was used, so the build fails.

**Impact** — local build is broken; CI build should still pass because CI forces isolated node-linker; Vercel deploy status is unknown from this audit.

### Lint warnings (non-blocking)

Frontend (7 warnings):
- `src/components/kyc/kyc-documents-panel.tsx` — 2× `<img>` instead of `next/image`.
- `src/components/kyc/kyc-wizard.tsx` — `useMemo` unnecessary dep.
- `src/components/landing/landing-page.tsx` — 2× `<img>` instead of `next/image`.
- `src/components/loans/loan-apply-form.tsx` — 3× `react-hooks/exhaustive-deps` / `useMemo` pitfalls.

Mobile (16 warnings): 10× `@typescript-eslint/no-explicit-any`, 6× `react-hooks/exhaustive-deps`.

### CI test-gate analysis

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml): the `test` job (lines 82–106) is fully commented out. CI runs only `lint-and-typecheck` and `build`. Tests exist (backend: 129 passing) but are **not enforced on push/PR**. No comment explains why — likely a temporary disable while another issue was being fixed; never re-enabled.

### Known issues (consolidated)

- **[Critical] — RESOLVED 2026-11-09 Stage 1.** Root `.npmrc` now sets `node-linker=isolated` so local installs match CI/Vercel. Frontend build verified green.
- **[High] — RESOLVED 2026-11-09 Stage 1.** Backend test job restored in `.github/workflows/ci.yml` as `Backend tests` (needs `lint-and-typecheck`), runs `pnpm --filter @rupayaid/api test`.
- **[High] — RESOLVED 2026-11-09 Stage 2.** Frontend `test` script added (Vitest); 20 unit tests pass. Playwright scaffolded with 5 skipped journey specs awaiting fixtures. `web-tests` CI job added.
- **[High] — RESOLVED 2026-11-09 Stage 2.** Mobile Jest harness landed (jest@30 + jest-expo@58 + @testing-library/react-native@14). 39 unit tests across SecureStore, ApiClient (401→refresh→retry, invalid refresh→unauthorized), KYC schema + patch body, loan apply schema, payment return parsing. `mobile-tests` CI job added. Maestro scaffolded with 5 Android flows; flow 01 (launch + login screen) is runnable today — flows 02-05 are marked `TODO_CREDENTIALS` and parked until a seeded mobile QA account exists.
- **[Medium] — RESOLVED 2026-11-09 Stage 2 slice 3.** All 10 mobile `@typescript-eslint/no-explicit-any` warnings fixed (shared `errorMessage(e: unknown, fallback)` helper for `catch` blocks; `router.push('/referral')` + `/legal` using expo typed routes). All hook-dep warnings on both platforms fixed or explicitly disabled with a one-line rationale.
- **[Medium]** Render free tier sleeps — ~60s cold start on first request.
- **[Low] — RESOLVED 2026-11-09 Stage 2 slice 4.** Landing page's two `<img>` (stories carousel + community-lending background) migrated to `next/image` with `fill` + responsive `sizes`. Two KYC `<img>` kept on purpose (local `blob:` preview + signed private R2 URL) with inline ESLint disables and a short privacy rationale — see slice 4 entry in DEVELOPMENT_LOG.
- **[Low] — RESOLVED 2026-11-09 Stage 2 slice 3.** Hook-dep warnings addressed across `loan-apply-form.tsx`, `kyc-wizard.tsx` (unnecessary dep removed), mobile `kyc/index.tsx`, `profile.tsx`, `loans/apply/index.tsx`.
- **[Low]** `mobile/.gitignore` has uncommitted modifications.

## Pending / not confirmed

These are items that **I could not confirm by code inspection** and need to be verified against the product plan:

- End-to-end disbursement to a real bank rail (NEFT/IMPS/UPI payout provider). `LoanDisbursement` table exists; no integration code module was located in this pass.
- Production SMS via Digimiles — module reads env vars; live DLT approval status unknown.
- Razorpay production keys and webhook signature verification in the live environment.
- Admin RBAC — tables exist; whether all admin routes enforce the right permissions needs an audit.
- Observability — Sentry env vars documented but wiring not inspected in this pass.
- Test coverage — no CI gate; coverage unknown.

**Do not treat the "Pending" list as exhaustive.** It is the honest gap after one inspection pass.
