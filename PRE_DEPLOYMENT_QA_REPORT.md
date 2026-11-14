# RupayAid pre-deployment QA report

**Date:** 12 November 2026 (Asia/Calcutta)  
**Decision: NOT READY FOR DEPLOYMENT**

Local builds and tests pass after the fixes described below. This is not a production sign-off: the dependency audit reports critical/high advisories, the original end-to-end journeys remain skipped, and real database/storage/payment/device integrations have not been exercised. No application was deployed and no external database was modified.

## Scope and evidence limits

Inspection preceded testing and production-code changes. Reviewed the workspace structure, manifests, API bootstrap and guards, schema and migration inventory, authentication/session code, KYC storage/confirmation, loan/product/payment paths, client authentication/storage, deployment documentation, CI, and existing tests. Used targeted source review and searches; this does not assert that every line, screen, button, endpoint, or abnormal scenario has been tested.

The configured backend database points to an external host. A disposable staging environment was requested but was not identified during this run. The API was not started against that database, migrations/seeds were not applied, and provider credentials were not used. No production security probes, payments, SMS, email, or document uploads were sent. Environment inventory printed names only.

Most backend service tests substitute Prisma/provider dependencies. The referral HTTP suite starts a real local HTTP server and exercises guards/validation with substituted identity/domain services. Neither is proof of successful PostgreSQL or provider integration. Browser smoke tests abort external requests rather than supply fake successful API responses.

## 1. Architecture

| Component | Observed implementation |
| --- | --- |
| Workspace | pnpm 8.15.0 root workspace: backend, frontend, mobile, shared config/types/UI/docs; Node 22.17.0 used for this audit |
| Web | Next.js 14.1.0 App Router, React 18, TypeScript, Tailwind/Radix, React Hook Form/Zod, TanStack Query/Table; customer and `/admin` portals |
| Mobile | Expo 58, React Native 0.88, React 19.3, Expo Router, TanStack Query; native tokens stored using Expo SecureStore |
| Marketing | Independent `landing_pagee` project, Next.js 16.3.3, React 19.2.4 from its lockfile; now pinned to pnpm 10.11.0 to read its v9 lockfile |
| API | NestJS 10 modular monolith, REST, global DTO validation, JWT/Passport, roles guards, Helmet, CORS, exception/response interceptors |
| Data | PostgreSQL through Prisma 5; UUID identities, Decimal monetary fields, foreign keys, unique constraints and indexes; 11 migration directories |
| Storage | Cloudflare R2 signed URLs, 15-minute expiry, user/application-scoped keys; development-only local storage fallback; nominal 5 MB limit and MIME allowlist |
| Integrations | Google identity, Razorpay orders/checkout/webhooks, Digimiles SMS, Resend email, Redis/BullMQ notification jobs and rate limiting |
| Hosting | Documented Vercel web/marketing, Render API, external PostgreSQL/Neon; deployed settings were not inspected |

Principal relationships: User has profile, roles, sessions, KYC applications, referrals, eligibility evaluations, loan applications, payments and notifications. KYC has details/documents/decisions/history. LoanApplication relates to product, approval, state history, disbursement, repayment schedule, repayments and payments. Payments have transactions/webhook deduplication and ledger entries. Migration SQL includes append-only financial/audit triggers; their installation and behavior remain unverified against a database.

Customer authentication supports email/password and Google, access JWTs plus rotating refresh tokens and hashed session tokens. Staff authentication uses a separate admin audience/type and persisted admin-session validation. Global guards select the customer/admin strategy by API path. Legacy role-protected staff endpoints also exist under the customer API namespace.

API inventory includes `/api/v1/auth`, `customers`, `dashboard`, `kyc`, `files`, `eligibility`, `loan-products`, `loans`, `repayments`, `payments`, `referrals`, `notifications`, plus role-protected user/role/audit/ledger/config operations. Staff portal APIs use `/api/admin/auth`, dashboard, KYC, loans, disbursements, repayments, payments and referrals. Health routes receive the global prefix: the usual probe is `/api/v1/health/ready`, not the README's bare `/health`.

## 2. Executed checks

| Check | Final outcome | Qualification |
| --- | --- | --- |
| Backend Jest | **181 passed, 33 suites** | Baseline: 163 tests/27 suites; 18 regression cases added |
| Web Vitest | **23 passed, 3 suites** | Repeated after changes; Vite CJS and React `act` deprecation warnings remain |
| Mobile Jest | **51 passed, 7 suites** | Repeated after changes; native dependencies use the test environment |
| Mobile Node tests | **34 passed** | `node --test test/*.test.cjs`; session switching, logout/cache, Google configuration and secure storage |
| Browser smoke | **3 passed** | Actual local production web build, widths 360/412/1440; six public pages and eight protected redirects at each width |
| Original Playwright journeys | **6 skipped, zero executed** | Login, KYC, loan application, admin KYC, payment |
| Workspace TypeScript | **Passed** | `corepack pnpm -r --if-present typecheck`, including shared packages |
| Lint | **Per-package checks passed** | Backend, web, mobile, shared UI/types; shared config passed via direct ESLint invocation. Recursive lint stalled and was interrupted, not recorded as a successful aggregate run |
| Backend build | **Passed** | `npm run build` after final source fixes |
| Web build | **Passed** | Next.js 14.1.0; 32 static pages generated, dynamic routes compiled |
| Marketing build | **Passed after fixes** | Correct locked dependencies installed; actual TypeScript validation enabled |
| Android JS/Hermes export | **Passed** | 1,378 modules; approximately 3.7 MB Hermes bundle; not a signed APK/AAB or device test |
| Prisma schema validation | **Passed** | `prisma validate` only; does not validate deployed schema/migration execution |
| Dependency audit | **Failed security gate** | 108 advisory findings: 7 critical, 36 high, 53 moderate, 12 low |
| Live database/API/provider tests | **Not executed** | No confirmed disposable environment |
| Native small/large Android devices | **Not executed** | No available `adb`/emulator established; web viewport checks do not substitute for native testing |

Final executed automated cases: 289 unit/service/component/session cases plus 3 browser smoke cases. Keep their different evidence levels separate.

Sandbox failures were retried with approved access: Vitest/esbuild configuration access, npm advisory requests, font downloads, Playwright browser access and Hermes execution. These were environment restrictions, not silently converted into application passes. The root convenience command `corepack pnpm typecheck` could not invoke its nested `pnpm` executable because no pnpm shim was on PATH; the equivalent recursive command above passed. Git was unavailable on PATH, so no clean-working-tree/commit claim is made.

## 3. Feature coverage

| Feature | Evidence obtained | Still required |
| --- | --- | --- |
| Customer registration/login | Form/source inspection, real login rendering; JWT session regression tests | Real registration, valid/invalid/missing-credential requests, duplicate account handling, Google OAuth |
| Session/logout | Service tests; mobile account switching/cache/storage tests; unauthenticated browser redirects | Real token expiry/reuse, concurrent refresh, restart persistence, revocation across devices |
| Customer profile | Customer service tests; profile route redirects unauthenticated users | Persist/reload profile with database, cross-user access through real HTTP |
| KYC details/application | Backend service and web/mobile schema tests | Complete wizard, validation/status persistence, submission/re-submission after restart |
| KYC documents | MIME/size/key ownership tests; actual local filesystem upload/replay regression | Real R2 PUT/GET, bucket privacy, CORS, expired URL behavior, malware/content checks, immutable confirmed documents |
| Loans/amount/tenure | Loan service/controller, state-machine, eligibility, repayment-calculation and mobile selection tests | Real draft/submit/retry, concurrent duplicate applications, backend/customer display reconciliation |
| Loan status | Service tests and protected-route checks | Approved/disbursed/rejected customer screens with real records |
| Referrals/tracking | Service, local HTTP guard/validation, admin component and mobile tests | Persisted referral ownership/status, duplicate/concurrent submissions, real tracking history |
| Admin dashboard | Dashboard service tests; actual anonymous redirect | Authenticated dashboard totals reconciled to database |
| Admin KYC decisions | Admin auth and KYC service tests | Real staff login, document review, approve/reject/notes and audit history |
| Loan management/interest | Loan/product tests; approval DTO and client source inspection | Staff approval/disbursement round trip; product configuration access and validation |
| Repayments/payments | Allocation, provider-signature and payment service tests | Razorpay test-mode order, checkout, webhook replay/out-of-order delivery and ledger reconciliation |
| Notifications | Service/provider tests; queue source inspection | Delivery/retry/restart with Redis, verified email/SMS sender and test recipients |
| Mobile API communication | API-client/session tests and Android bundle export | Device networking, backend integration, offline/retry, background/foreground behavior |

Browser-tested public pages: `/login`, `/admin`, `/forgot-password`, `/reset-password`, `/legal/privacy`, `/legal/terms`. Protected redirects: `/dashboard`, `/profile`, `/kyc`, `/loans`, `/referral`, `/payments`, `/notifications`, `/admin/dashboard`. No horizontal overflow or uncaught page errors was observed in this sample. Login/admin screenshots were saved under `frontend/test-results`; small-screen login and desktop admin screenshots were visually inspected. Google scripts were blocked intentionally, so button/provider rendering was not verified. Keyboard overlap, native scroll/focus, authenticated empty/loading/error states and every-screen visual consistency are still unverified.

## 4. Bugs fixed

Severity reflects potential impact before the fix. Regression tests invoke real application logic; substituted data stores are not represented as live integrations.

| ID | Severity | Root cause and fix | Validation |
| --- | --- | --- | --- |
| F01 | Critical when misconfigured | Environment validator skipped absent production secrets/database/CORS, permitting development JWT fallbacks. Production now requires these fields and signing secrets of at least 32 characters; validation errors list field names only. | Missing/weak setting tests failed before fix and pass after |
| F02 | High | Customer JWT strategy accepted sessionless/untyped tokens, bypassing persisted revocation checks for such signed tokens. Require `typ=access`, subject and session ID. | Two rejecting cases failed before fix; valid session case and existing auth tests pass |
| F03 | Medium | Unexpected exceptions exposed internal messages in JSON. Return generic 500 text; Prisma fallback messages also made generic; response paths omit query strings. | Exception privacy regression failed before fix and passes after; full suite/typecheck |
| F04 | Medium | HTTP request logging retained signed-file tokens and customer query values except for referrals. All HTTP log URLs now omit query strings. | Logging regression checks token exclusion |
| F05 | Medium | Readiness returned HTTP 200 with `not ready` on DB failure. Throw ServiceUnavailableException for HTTP 503. | Failure/success readiness tests; failure case reproduced before fix |
| F06 | Medium | Production CORS silently included localhost and hardcoded preview origins beyond configured values. Production now uses only explicit origins; development defaults retained. | Production/development origin tests |
| F07 | High | Fractional positive tenure step below 1 was floored to zero, creating an infinite product-formatting loop. Clamp the computed step to at least 1. | Regression returns `[6,7,8]` for step 0.5; existing product tests pass |
| F08 | Medium | Failed exclusive local upload (`wx`, existing file) unconditionally deleted the existing KYC file. Cleanup now only deletes a file created by that upload attempt. | Actual filesystem replay test failed with missing original before fix, passes after |
| F09 | High | Marketing pinned pnpm 8 against a v9 lockfile. Its isolated dependencies were absent, so builds used root Next.js 14 and lacked analytics. Pin compatible pnpm 10.11.0 and install the frozen marketing lockfile. | Old frozen install failed; compatible frozen install and Next.js 16.3.3 build pass |
| F10 | Medium | Marketing suppressed TypeScript build failures; mixed step tuples inferred strings/icons interchangeably. Remove suppression and preserve tuple types with `as const`. | Build exposed four TS2322 errors, then passed with checking enabled |
| F11 | High deployment risk | `.gitignore` excluded Prisma migration directories, risking omission of new migrations. Remove that ignore rule. Ignore generated browser/export artifacts instead. | Source inspection; tracked migration inventory still requires Git verification |

No API response shapes, database schema, interest calculations or approval workflows were redesigned. Existing sessionless legacy tokens will now be rejected deliberately. Deployment must supply the production configuration required by F01 and the complete origin allowlist required by F06.

## 5. Remaining issues and release blockers

| ID | Severity/status | Evidence and required action |
| --- | --- | --- |
| R01 | Critical / open | Full workspace dependency audit reports 108 advisories. Includes old web Next.js 14.1.0 and development/test tooling (Vitest/tinypool), plus transitive packages. Save and review `qa-dependency-audit.json`; distinguish runtime reachability from dev-only exposure. Upgrade supported framework/tool versions and refresh lockfiles, then repeat builds, auth/KYC/payment regression and audit. No broad forced dependency upgrade was applied because the required fixes include major-version compatibility work. |
| R02 | High / blocked verification | Six original E2E cases are disabled. No evidence for live signup, KYC-to-loan-to-payment, staff approval, restart persistence or two-customer isolation. Supply an isolated seeded database, test bucket and provider sandbox; activate substantive journeys. |
| R03 | Remediated locally; staging verification pending | Confirmations now validate actual size, format signatures and SHA-256 and store a create-only final snapshot outside the signed-upload namespace. Local overwrite/expiry/failure tests and R2 SDK contract tests pass. Live R2 expiry, bucket privacy, legacy-object transition and orphan reconciliation remain operational checks; see Phase 2 evidence below. |
| R04 | Remediated locally; real-DB concurrency verification pending | Session issuance, rotation and logout serialize on the user row inside a transaction. Rotation retains the family; verified revoked-token replay revokes active descendants in that family. Concurrency/replay/rollback regression tests pass using a transaction harness. |
| R05 | Remediated locally | Replaced inline mutation bodies across 12 controllers with validated DTO classes. Added product boundaries and locked merged-range validation, setting type/size checks, unknown-field rejection and HTTP authorization/malformed-body regressions. |
| R06 | Remediated locally | Web refresh distinguishes unavailable from invalid sessions, preserves credentials on transient failures, prevents stale refresh persistence after logout and exposes a retry state during session restoration. Client/provider regressions pass. |
| R07 | Remediated locally; provider reconciliation remains operational | Added 15-second fetch/body deadlines, 60-second web upload deadline and R2 operation aborts. No automatic transport retries; ambiguous notification sends stop, email requests carry stable idempotency keys, and ambiguous payment orders remain reserved awaiting confirmation. Stall/failure/duplicate-order regressions pass. |
| R08 | Medium / source-review finding | Public contact API logs submitted names/email/message and returns a success acknowledgement without a delivery integration. Unexpected exception/provider error logs can also retain sensitive details. Establish redaction and actual contact routing; do not claim delivery from the acknowledgement. |
| R09 | Medium / source-review finding | Local download streams are piped without an error handler in `FilesController`; missing/unreadable files need a non-crashing 404/500 regression. Local upload token parsing also needs malformed/missing token HTTP tests. This is development storage, disabled in production. |
| R10 | Medium / verification gap | Web tokens use localStorage, so an XSS can access tokens. CSP still permits inline scripts. Native SecureStore unit tests pass but physical-device persistence/keychain behavior is untested. Evaluate cookie/session architecture separately and test XSS controls; no blanket claim of secure storage. |
| R11 | Medium / operations | Without Redis, rate limiting is per instance and notifications use in-process fallback. Validate distributed limits, retry/recovery and deployment restarts with actual Redis before scaling. |
| R12 | Medium / CI coverage | Marketing is outside workspace CI; 34 mobile Node tests are outside the current Jest test script. Add explicit CI jobs for both and real E2E gates. A green current CI run is insufficient for release approval. |
| R13 | Low / warnings and UX | Vite CJS/React act warnings remain. Google button script failure has no tested user-facing recovery. Marketing copy says the digital app is still in development; confirm launch messaging rather than changing business claims during QA. |

Dependency details are registry findings, not 108 demonstrated application exploits. The maintainer confirms App Router DoS exposure for the old 14.x line in its [December 2025 security update](https://nextjs.org/blog/security-update-2025-12-11). The current audit also lists [middleware authorization bypass](https://github.com/advisories/GHSA-f82v-jwr5-mffw), [Windows-hosted RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36), and image-optimizer advisories. Reachability depends on hosting/features; Nest API guards are separate from Next middleware. A patch that addressed only the older advisory must not be assumed to resolve the full current audit. The standalone marketing dependency tree was not included in the root audit and needs its own audit.

## 6. Security findings and boundaries

- Positive code evidence: separate admin JWT type/audience, persisted-session checks, role guards, user-scoped KYC keys, ownership checks before issuing document download URLs, MIME/size metadata validation, password hashing, payment signature checking and parameterized Prisma queries. These controls were not all verified through live APIs.
- No actual secrets were printed. A targeted source-pattern search for AWS-style access keys, private-key blocks and live payment-key prefixes returned no matches in the searched application directories. This is not a full repository/history secret scan; environment files contain private configuration and remain ignored.
- Signed download URLs are bearer capabilities valid until expiry. Database ownership checks do not prove that the R2 bucket itself is private. Verify unauthenticated direct GET, cross-user document requests and expiry in the test bucket.
- Do not expose Swagger in production unless deliberately configured. Validate proxy hop count, HTTPS, provider webhook signature handling, request sizes and external-service rate limits in staging.
- No SQL injection exploit was attempted. Parameterized raw-query usage was observed in payment row locks; every possible dynamic query path was not proven safe.

## 7. Performance

Observed local web production server startup: approximately 869 ms. This excludes API/database cold start and is not a production SLA. Web build reports roughly 84.2 kB shared first-load JS; KYC routes reach approximately 164 kB. Android export bundled 1,378 modules in approximately 10 seconds; Hermes output is about 3.7 MB, plus assets including a 1.7 MB referral image and multiple icon-font families.

Priorities: compress the referral asset and audit unused icon/font inclusion; bound provider/network waits; paginate growing history endpoints; check database plans and indexes with realistic volumes. Every authenticated customer request currently validates and updates session last-use state, adding database work. Consider measured throttling of last-use updates after correctness tests. The fractional-tenure infinite-loop defect was fixed.

No backend latency percentiles, load/concurrency throughput, heap profiles, slow-query EXPLAIN plans, native startup time or crash-free device measurements were collected. These are untested, not passed. Run representative cold/warm API and device benchmarks against isolated staging before choosing limits or scaling settings.

## 8. Deployment and environment checklist

Presence in a local file is not proof of correct deployed configuration. Do not copy secrets into this report or source control.

| Area | Required verification |
| --- | --- |
| API basics | `NODE_ENV=production`, `PORT`, `API_PREFIX`; `API_PUBLIC_URL` points to the API base used for local signed URLs if relevant; `TRUST_PROXY_HOPS` matches host topology |
| Database | `DATABASE_URL` has correct database, TLS and deployment credentials; isolated migration/test connections; pooling/limits verified |
| Authentication | `JWT_SECRET`, `REFRESH_TOKEN_SECRET` independently generated and at least 32 characters; explicit `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`; rotation/revocation plan |
| Origins | `CORS_ORIGIN` includes exact customer/admin production origins; preview environments added deliberately; HTTPS API base URLs |
| Web | `NEXT_PUBLIC_API_URL` includes `/api/v1`; `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; Google authorized origins match actual host |
| Mobile | `EXPO_PUBLIC_API_URL` is reachable HTTPS, not device localhost; Google web/Android/iOS client IDs, signing fingerprints and scheme match release build; debug API logging disabled |
| KYC | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; private bucket, allowed PUT origins/headers, least-privilege credentials, lifecycle rules; local fallback disabled in production |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`; test/live environment consistency; correct webhook URL and replay/reconciliation checks |
| Email/SMS | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; Digimiles username/password/base URL/sender/entity and approved template IDs; verify notification payload encryption secret and delivery without logging secrets |
| Queue/rate limits | `REDIS_URL` reachable with suitable TLS/access control; BullMQ recovery and multi-instance throttling verified |
| Operations | `ENABLE_SWAGGER` deliberately false unless needed, error monitoring actually wired, log retention/redaction and alert ownership verified; merely defining a DSN does not prove monitoring |

Render production start is `node dist/src/main.js`. Use `prisma migrate deploy` in the controlled release process, not `db push` or `migrate dev`. Configure health checks against the actual prefix. Marketing remains a separate install/build with its own pnpm version. Font downloads are a build-time network dependency. The root build does not cover marketing or native binaries; run their gates separately.

## 9. Database migration and recovery readiness

Prisma schema syntax passes; 11 migration directories exist. SQL includes constraints/indexes and append-only triggers. No migration was applied, no schema drift query was run, and no fresh-database/upgrade-path test was performed. Verify migration files are committed now that the ignore rule is removed. Apply all migrations to an empty disposable database and to a sanitized representative predecessor snapshot; validate enums, defaults, foreign keys, unique constraints, trigger compatibility and concurrency behavior. Inspect seed behavior before any use: documented seeds include demo users and staff setup and must not be run blindly in production.

Backups/restores were not inspected or executed. Before release, establish PostgreSQL point-in-time recovery/retention and a verified export; separately protect R2 objects and private configuration. Restore database plus referenced documents into an isolated environment and reconcile loan balances, payment transactions, schedules, ledger entries and audit history. Document business-approved RPO/RTO, retention, access owners and restore procedures. Prefer forward-compatible schema changes and application rollback; never assume reversing migrations can safely undo financial writes. Reconcile provider events received during outages/restores.

## 10. Reproduction and next release gate

Commands used (from the corresponding directory; `npm run` executes existing scripts, not a package-manager migration):

```text
backend: npm test -- --runInBand
backend: npm run typecheck; npm run lint; npm run build
backend: node node_modules/prisma/build/index.js validate
frontend: npm test -- --reporter=dot
frontend: npm run typecheck; npm run lint; npm run build
frontend: PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:e2e -- public-smoke.spec.ts --workers=1
mobile: npm test -- --runInBand
mobile: node --test test/*.test.cjs
mobile: npm run typecheck; npm run lint
mobile: node node_modules/expo/bin/cli export --platform android --output-dir ../qa-artifacts/android
landing_pagee: corepack pnpm install --ignore-workspace --frozen-lockfile --ignore-scripts
landing_pagee: npm run build
root: corepack pnpm -r --if-present typecheck
root: corepack pnpm audit --json
```

On PowerShell, assign `PLAYWRIGHT_BASE_URL` with `$env:PLAYWRIGHT_BASE_URL='http://localhost:3100'` before running the browser command. Start the production frontend locally first. Browser tests block configured external services. Generated QA exports/screenshots are ignored and are not release packages.

Release requires: remediate/triage dependency findings with recorded reachability; close the remaining authentication/upload/validation risks; run the real customer/admin journeys against disposable integrations; apply and verify migrations; complete small/large Android device tests and signed release builds; measure load/error recovery; and demonstrate backup restoration. Until then, **NOT READY FOR DEPLOYMENT** remains the evidence-supported decision.


## 9. Phase 2 security remediation � 12 November 2026

The Phase 1 report was read before changes. Priorities R03 through R07 were addressed in order, with focused tests after each fix. The earlier audit/build/mobile/browser results above are historical Phase 1 evidence, not reruns. No deployment, production database access, migrations, real payments, messages or cloud uploads occurred. Financial calculations and response shapes were preserved.

### R03 � KYC storage

Signed PUT URLs are reusable capabilities until expiry; removing that property was not assumed. They now target staging keys only. Confirmation reads a bounded snapshot of actual bytes, enforces the declared size and 5 MB maximum, checks allowed format signatures/end structures, computes SHA-256 and checks a supplied hash. It writes a deterministic final key using local exclusive creation or R2 PutObject with IfNoneMatch: '*'. Only the immutable final reference is persisted. The R2 signature also binds Content-Length. Existing staging-key records remain recognized by duplicate checks.

Evidence: files-security.spec.ts, files-r2.spec.ts and updated kyc.service.spec.ts cover replacement attempts, content/size/hash mismatches, expired/tampered local capabilities, failed uploads, conditional conflicts and database failure. Existing ownership and admin document access regressions pass. The R2 tests use the real offline signer and mocked SDK responses; they do not prove cloud enforcement. Cloudflare documents atomic conditional writes at https://developers.cloudflare.com/r2/api/s3/conditional-operations/ and consistency at https://developers.cloudflare.com/r2/reference/consistency/.

Limits: format checks are not a full document decoder or malware scanner. An ambiguous database failure deliberately leaves the immutable object intact to avoid deleting a committed document; orphan reconciliation is still needed. Previously confirmed staging objects require a reviewed transition plan, including expiry of outstanding 15-minute upload capabilities. No existing cloud objects were migrated and bucket privacy was not inspected.

### R04 � refresh token families

Issuance, rotation and logout use a PostgreSQL user-row FOR UPDATE lock in an interactive transaction. Consumption and replacement commit together; replacement failure rolls back consumption. Rotations retain a stable family. A verified revoked ancestor revokes all active descendants of that family, without revoking unrelated login families. Revocation commits before the unauthorized response is thrown.

The deliberate policy is strict replay rejection: concurrent duplicate refreshes permit at most one issuance, and the duplicate revokes that family's replacement. There is no grace window; a lost refresh response followed by replay can require login. session.service.spec.ts covers simultaneous refresh, ancestor replay, unrelated-family isolation and rollback; JWT strategy regressions also pass. The harness serializes transactions and simulates rollback. Actual multi-connection PostgreSQL locking remains a staging gate.

### R05 � admin mutation validation

All identified inline object/Record mutation bodies in user, admin, roles, eligibility, config, ledger, notifications, repayments, disbursements, payments, loans and loan-products controllers now use decorated runtime DTOs. Global whitelist rejection prevents extra fields reaching services. Product create/update validates finite decimal storage bounds, positive ordered amounts, nonnegative rates and integer ordered tenure of 1�120 months (consistent with the existing approval limit). Partial product updates lock/read the current row and validate merged limits. Settings validate key syntax, effective type and serialized size (64 KiB). No rate formula or repayment allocation changed.

admin-mutations.spec.ts covers DTO allowlists, malformed values and service invariants. admin-mutations-http.spec.ts exercises real local Nest HTTP handling for six important write routes with substituted identity/domain dependencies: anonymous 401, borrower 403 and malformed staff requests 400 without writes. This is not an exhaustive integration test of every admin route. The initial related-service run passed 77 tests across 8 suites; later focused reruns cover the final changes.

### R06 � web authentication

Refresh 401/403 is definitive invalidation; network failures, 429, 5xx and malformed success payloads retain credentials. Refresh is single-flight, late old-access 401s reuse the current access token, and a session generation prevents a late refresh from restoring logged-out credentials. Customer/admin restoration distinguishes service unavailability from logout, with a protected-page retry state when identity cannot be established. Existing authenticated state survives transient restoration errors.

api-client.test.ts and auth-provider.test.tsx cover transient network/server failures, invalid or expired refresh tokens, access-token rotation, malformed refresh responses and logout races. These are client/component tests, not a live identity-provider journey.

### R07 � deadlines and safe outcomes

Customer/admin web API calls, contact submission, Google token verification, Razorpay and Resend/Digimiles calls now use a 15-second deadline covering fetch and body consumption. Stalls abort the request and settle even when a test transport ignores abort. Web document uploads use a 60-second XHR timeout. R2 HEAD/delete calls have 15-second abort signals; finalization already bounds its read/write operation.

There are no automatic fetch retries. Notification requests carry a stable notification-based email Idempotency-Key; Resend documents a 24-hour retention window (https://resend.com/changelog/idempotency-keys). Existing bounded worker retries remain for definitive provider failures. Ambiguous transport failures are recorded as failed and stop automatic notification retries, including duplicate worker delivery; operators must reconcile before resending. Payment order creation runs only for the request that created the payment record. Ambiguous order transport outcomes leave AWAITING_CONFIRMATION, reserving the installment against duplicate creation. Reconciliation must resolve these reservations; no automated provider lookup by reference was added. No financial calculation was changed.

bounded-fetch.spec.ts, notification-queue.service.spec.ts, payments.service.spec.ts and web kyc-upload.test.ts verify connection/body stalls, failed transport, no blind retry, ambiguous delivery handling, upload timeout/error/abort, and no second order for an existing in-flight payment. Existing Razorpay and SMS provider tests pass. No live provider timeout experiment was performed.

### Final Phase 2 verification

- Backend focused regression run: **121 passed, 16 suites**.
- Web focused regression run: **17 passed, 3 files**.
- Backend and frontend TypeScript checks: **passed**.
- Backend and frontend lint: **passed**.
- Web tests required the approved unsandboxed runner because esbuild could not read its configuration under the filesystem sandbox. Existing Vite CJS and React act deprecation warnings remain non-failing.

Commands (within the respective projects):

```text
backend: npm test -- --runInBand files-r2 files-security files.service kyc.service admin-kyc.service session.service jwt.strategy admin-mutations bounded-fetch notification-queue payments.service digimiles razorpay
frontend: npm test -- src/lib/api-client.test.ts src/lib/kyc-upload.test.ts src/components/providers/auth-provider.test.tsx
backend and frontend: npm run lint; npm run typecheck
```

**Release decision remains NOT READY FOR DEPLOYMENT.** R03�R07 code remediations have local regression evidence. R01 dependency findings, R02 real end-to-end integration coverage, other existing release blockers, live database/storage verification and the reconciliation/legacy-storage operational checks above remain outstanding. No production sign-off is implied.
