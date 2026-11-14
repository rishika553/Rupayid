# Development log — RupayAid

Append-only. Newest entries at the top. One entry per substantial task.

Template:

```
## YYYY-MM-DD — <short title>
**Did:** what changed, in one or two sentences.
**Files:** key files touched.
**Tests:** what was run (lint / typecheck / unit / e2e / manual). Note failures honestly.
**Remaining:** follow-ups.
**Verified by:** code read / app run / test output.
```

---

## 2026-11-09 — Stage 2 (slice 4): image optimisation + config cleanup
**Did:**
- `frontend/src/components/landing/landing-page.tsx`: two `<img>` (stories carousel line 167, community-lending background line 751) → `next/image` with `fill` + `sizes` (`"(min-width: 1024px) 60vw, 100vw"` and `"(min-width: 1024px) 50vw, 100vw"`). Both containers already provide the positioned ancestor `next/image fill` needs (motion.div `absolute inset-0` and `.lending-visual` has `position: relative` in globals.css). Carousel first slide gets `priority` for LCP. Class-based `object-cover` + opacity/mix-blend/transition classes retained.
- `frontend/src/components/kyc/kyc-documents-panel.tsx`: two `<img>` INTENTIONALLY kept with inline `eslint-disable-next-line @next/next/no-img-element` comments explaining why. Line 152 — pre-upload `blob:` object URL preview (never public). Line 193 — short-lived signed R2 URL for a private KYC document that must not be proxied through the next/image optimiser (would cache behind a public path on Vercel).
- `next.config.js` remotePatterns **unchanged** (`*.cloudflare.com`, `*.r2.cloudflarestorage.com`). Not needed by the two landing images (local), and we deliberately do NOT widen it to cover R2 signed URLs — see above.
- `.github/workflows/ci.yml` build job: removed the redundant `npm_config_node_linker: isolated` env override (root `.npmrc` sets it; install runs from repo root).
- `frontend/vercel.json`: retained the identical override in `installCommand`. Rationale in `docs/TECHNICAL_DECISIONS.md`.

**Files:** `frontend/src/components/landing/landing-page.tsx`, `frontend/src/components/kyc/kyc-documents-panel.tsx`, `.github/workflows/ci.yml`, `docs/PROJECT_STATUS.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`.

**Tests:**
- Backend typecheck ✅ / lint ✅ (0 warnings) / tests ✅ 129/129 / build ✅
- Frontend typecheck ✅ / lint ✅ (**0 warnings**, was 4) / tests ✅ 20/20 / build ✅
- Mobile typecheck ✅ / lint ✅ (0 warnings) / tests ✅ 39/39
- Image privacy: confirmed only public local assets went to next/image.
- Linker consistency: `.npmrc=isolated` governs local, CI (after override removal), and Vercel (where `cd ..` lands on the same file).

**Remaining:** none from the Stage 2 baseline. All 23 lint warnings cleared across slices 3 + 4.
**Verified by:** Command output in this session. No commit, no push.

## 2026-11-09 — Stage 2 (slice 3): type safety + hook-dep cleanup
**Did:** Cleared every `@typescript-eslint/no-explicit-any` and every `react-hooks/exhaustive-deps` warning identified in the Stage 2 audit baseline. Behaviour preserved.

**`any` → typed (10 sites):**
Introduced `mobile/src/lib/error-message.ts` — `errorMessage(e: unknown, fallback: string)` that narrows via `instanceof Error`. Replaced 8× `catch (e: any) { ...e.message... }` with `catch (e) { ...errorMessage(e, fallback)... }` in `kyc/documents.tsx`, `kyc/index.tsx` (2), `kyc/review.tsx` (2), `profile.tsx`, `referral.tsx`, `repayments.tsx`. Replaced 2× `router.push('…' as any)` in `profile.tsx` with typed `router.push('/referral')` / `/legal` — the generated expo-router types already carry both routes.

**Hook deps (6 sites):**
- `frontend/src/components/loans/loan-apply-form.tsx`:
  - `products` now wrapped in `useMemo` keyed off `productsQuery.data`, so the `selectedProduct` useMemo and the eligibility useEffect no longer see a fresh array every render.
  - Draft-reset `useEffect` keeps its scalar-field deps (id + amountRequested + tenureMonths) with a one-line `eslint-disable-next-line` and a comment explaining why depending on the whole `existingDraft` object would wipe in-progress edits on every refetch.
  - Debounced eligibility `useEffect` similarly keeps `[selectedProduct?.id, watchedIncome, watchedEmployment]` with a comment — `evaluateEligibility` is a mutation hook whose ref is unstable, including it would hammer the API.
- `frontend/src/components/kyc/kyc-wizard.tsx`: dropped the unused `application.contact?.phoneNumber` dep from the summary-rows useMemo.
- `mobile/app/(app)/kyc/index.tsx`: added `router` to the `handleSaveStep` useCallback deps (expo-router's router is stable; safe addition). `form.reset` effect keeps `[application?.id]` with a comment.
- `mobile/app/(app)/profile.tsx`: `form.reset` effect keeps `[profile]` with a comment.
- `mobile/app/(app)/loans/apply/index.tsx`: `products` wrapped in `useMemo` — same fix as the web form.

**Files:** mobile — `src/lib/error-message.ts` (new), `app/(app)/{kyc/documents,kyc/index,kyc/review,profile,referral,repayments}.tsx`, `app/(app)/loans/apply/index.tsx`. Frontend — `src/components/loans/loan-apply-form.tsx`, `src/components/kyc/kyc-wizard.tsx`. Docs — `docs/PROJECT_STATUS.md`, `docs/DEVELOPMENT_LOG.md`.

**Warning count:** mobile 16 → **0**; web 7 → **4** (remaining are `<img>` suggestions — Stage 2 slice 4). Backend 0 → 0.

**Tests:** typecheck api ✅ / web ✅ / mobile ✅. lint api ✅ / web ✅ (4 warnings, all `<img>`) / mobile ✅ (0 warnings). Backend tests ✅ 129/129. Frontend tests ✅ 20/20. Mobile tests ✅ 39/39. Frontend build ✅. Backend build ✅.
**Verified by:** Command output in this session.

## 2026-11-09 — Stage 2 (slice 2): mobile test infra
**Did:** Installed Jest-based mobile test infra and wrote real unit tests against mobile's logic seams. Scaffolded Maestro flows for Android E2E. Added `mobile-tests` CI job.
- **Deps (dev):** `jest@^30`, `jest-expo@^58`, `@testing-library/react-native@^14`, `@types/jest@^30`.
- **Configs:** `mobile/jest.config.js` (pnpm-aware `transformIgnorePatterns`; `moduleNameMapper` pins `react`/`react/jsx-runtime` to real runtime because tsconfig `paths` re-points them at `@types/react` for TS types — fine for `tsc`, broken for Jest resolution), `mobile/jest.setup.js` (in-memory mocks for `expo-secure-store`, `expo-router`, `expo-linking`, `expo-web-browser`, `expo-document-picker`, `expo-image-picker`, `expo-file-system`, `@react-native-async-storage/async-storage`; sets `global.__DEV__`).
- **Scripts:** `test`, `test:watch`, `test:coverage`.
- **Real tests (39):**
  - `src/auth/secure-storage.test.ts` — readAuth returns null on partial store, clears on partial-write failure, handles SecureStore throwing.
  - `src/api/client.test.ts` — bearer header applied/omitted, 401 → refresh → retry with new token, invalid refresh → unauthorized() + no persist, missing refresh token → unauthorized without refresh attempt, error payload surfacing.
  - `src/lib/kyc-schema.test.ts` — phone regex, DOB adult check, pincode, PAN+Aadhaar, bank IFSC conditional, `kycPatchBody` trim/uppercase + last-four extraction.
  - `src/lib/loan-apply.test.ts` — product min/max enforcement, tenure clamp, `indicativeMonthly` math, `tenureChoices` fallback.
  - `src/lib/payment.test.ts` — Razorpay success/failure/dismissed/missing-signature parsing, throws when checkout details missing.
- **Maestro:** `mobile/maestro/flows/01-launch-and-login-screen.yaml` runnable; 02–05 marked `TODO_CREDENTIALS` with a README blocker note (no seeded Android QA account).
- **CI:** added `mobile-tests` job (`needs: lint-and-typecheck`) running `pnpm --filter @rupayaid/mobile test`. Maestro device E2E intentionally kept out until an emulator step is in place.

**Files:** `mobile/jest.config.js`, `mobile/jest.setup.js`, `mobile/package.json`, `mobile/src/{auth,api,lib}/*.test.ts` (5 files), `mobile/maestro/README.md` + 5 flow yamls, `.github/workflows/ci.yml`, `docs/PROJECT_STATUS.md`, `docs/DEVELOPMENT_LOG.md`, `pnpm-lock.yaml`.
**Tests:** api typecheck ✅, web typecheck ✅, mobile typecheck ✅. api lint ✅, web lint ✅ (7 pre-existing warnings), mobile lint ✅ (16 pre-existing warnings). Backend tests ✅ 129/129. Frontend tests ✅ 20/20. **Mobile tests ✅ 39/39 (new).** Frontend build ✅.
**Remaining blockers for full E2E:**
- Mobile QA account + backend fixture for Maestro flows 02–05.
- Android emulator + APK build step in CI before Maestro flows can run there.
**Verified by:** Command output in this session.

## 2026-11-09 — Stage 2 (slice 1): frontend test infra
**Did:** Added Vitest + Testing Library + Playwright scaffolding to the `frontend` workspace. Vitest config is pure-TS (no React plugin yet — none needed for current tests; plugin can be re-added when JSX enters the test suite). Two real unit-test files landed (`src/lib/format.test.ts`, `src/lib/kyc-schema.test.ts`, 20 tests). Playwright configured with 5 journey specs under `frontend/e2e/` (login, kyc-wizard, loan-apply, payments, admin-kyc) — all `test.describe.skip` with TODOs, awaiting seeded fixtures. `e2e/README.md` explains the gating.
**Files:**
- `frontend/package.json` — added `test`, `test:watch`, `test:e2e`, `test:e2e:install`; dev-deps: `vitest@^2`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`.
- `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/playwright.config.ts`.
- `frontend/src/lib/format.test.ts`, `frontend/src/lib/kyc-schema.test.ts`.
- `frontend/e2e/{README.md,login.spec.ts,kyc-wizard.spec.ts,loan-apply.spec.ts,payments.spec.ts,admin-kyc.spec.ts}`.
- `frontend/tsconfig.json` — excluded `e2e/` from the Next typecheck (different runtime).
- `.github/workflows/ci.yml` — added `web-tests` job (`needs: lint-and-typecheck`) running `pnpm --filter @rupayaid/web test`.
**Tests:** Backend typecheck ✅, frontend typecheck ✅, mobile typecheck ✅. Backend lint ✅, frontend lint ✅ (7 pre-existing warnings), mobile lint ✅ (16 pre-existing warnings). Backend tests ✅ 129/129. **Frontend tests ✅ 20/20 (new).** Frontend build ✅. Backend build ✅.
**Remaining Stage 2 slices (not run):** mobile test infra; lint cleanup (no-explicit-any + exhaustive-deps); image + redundant-override cleanup.
**Verified by:** Command output in this session.

## 2026-11-09 — Stage 1: build and CI stability
**Did:**
1. Root `.npmrc` `node-linker=hoisted` → `isolated`. Aligns local installs with CI build job (which sets `npm_config_node_linker: isolated` in env) and Vercel install command (same override). Removes the duplicate-React useRef null on frontend static export.
2. `pnpm install` re-run with the new linker — 1330 packages resolved, no errors.
3. `.github/workflows/ci.yml`: uncommented the `test` job, renamed to `Backend tests`, changed `needs: build` → `needs: lint-and-typecheck` (tests don't depend on a build artefact), added an explicit `prisma:generate` step before tests, scoped command to `pnpm --filter @rupayaid/api test` (frontend/mobile have no `test` script yet, so `pnpm -r test` would be a no-op there — explicit is safer).
4. Inspected `mobile/.gitignore` diff — single-byte change: trailing newline added. No `.gitignore` rule changed. Retaining it; a terminal newline is good hygiene.
**Files:** `.npmrc`, `.github/workflows/ci.yml`, `docs/PROJECT_STATUS.md`, `docs/DEVELOPMENT_LOG.md`.
**Tests:** Typecheck × 3 ✅. Lint × 3 ✅. Backend tests 129/129 ✅. Backend build ✅. Frontend build ✅ (was failing before this change). CI YAML inspected via diff; GitHub Actions config valid shape.
**Remaining:** Frontend/mobile have no test infra yet (see Stage 2).
**Verified by:** Command output in this session.

## 2026-11-09 — Read-only technical health audit
**Did:** Ran typecheck / lint / test / build across all workspaces. Recorded commands and results in `docs/PROJECT_STATUS.md` under "Health audit — 2026-11-09". No code changed.
**Files:** `docs/PROJECT_STATUS.md`, `docs/DEVELOPMENT_LOG.md`.
**Tests:** Backend typecheck ✅, frontend typecheck ✅, mobile typecheck ✅, backend lint ✅, frontend lint ✅ (7 warnings), mobile lint ✅ (16 warnings), backend tests ✅ 129/129, backend build ✅, frontend build ❌ (duplicate-React useRef null on `/404` + `/500`). Frontend/mobile have no `test` script.
**Remaining:** Do not fix in this pass. Prioritized list delivered in chat (Critical/High/Medium/Low).
**Verified by:** Command output in this session.

## 2026-11-09 — Set up long-term project memory
**Did:** Created `CLAUDE.md`, `docs/PROJECT_STATUS.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`. Inspected backend modules (`backend/src/modules/*`), Prisma schema (36 models), frontend routes under `frontend/src/app`, mobile routes under `mobile/app`, CI workflow, `README.md`, and `packages/docs/*`.
**Files:** `CLAUDE.md`, `docs/PROJECT_STATUS.md`, `docs/TECHNICAL_DECISIONS.md`, `docs/DEVELOPMENT_LOG.md`.
**Tests:** None run. No application code modified.
**Remaining:**
- Run `pnpm typecheck` and `pnpm test` to produce a real baseline for `PROJECT_STATUS.md`.
- Verify admin RBAC coverage across admin routes.
- Confirm disbursement rail integration (looks absent from code).
- Confirm Razorpay webhook signature verification in production config.
**Verified by:** Code read only. Nothing exercised in a running app.
```
