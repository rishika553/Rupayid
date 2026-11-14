# Technical decisions — RupayAid

Locked-in architectural choices. Do not change these without explicit approval from the project owner.

## Locked stack

| Area | Choice | Why |
|---|---|---|
| Package manager | pnpm 8.15.0, workspaces | Monorepo with shared `types`, `ui`, `config`. |
| Node | >= 20 | Pinned in `package.json` engines; also pinned in Render build (`2fc64fc`). |
| Backend framework | NestJS 10 | Module-per-domain fits lending domain subdomains cleanly. |
| ORM | Prisma 5 | Type-safe client shared across modules; migrations track schema evolution. |
| Database | PostgreSQL (Neon) | Serverless, scales to zero; financial integrity via transactions. |
| Frontend framework | Next.js 14 App Router | Server components for data fetching; one framework for both customer and admin portals. |
| Mobile | Expo + expo-router + RN 0.88 | Shared TypeScript types with web via `@rupayaid/types`. |
| Styling | Tailwind + Radix UI | Headless primitives; design system lives in `packages/ui`. |
| Forms | react-hook-form + zod | Schema-first validation shared with backend DTOs where possible. |
| State / data | TanStack Query | Caching + optimistic updates; avoids hand-rolled fetchers. |
| Auth | JWT access + rotating refresh via `Session` table | Stateless API; refresh rotation reduces token-theft blast radius. |
| File storage | Cloudflare R2 (S3-compatible) | KYC documents; cheaper egress than S3. |
| Payments | Razorpay | India-native repayment rails; webhooks logged to `PaymentWebhookEvent`. |
| SMS | Digimiles (DLT-compliant) | Required by Indian TRAI DLT rules. |
| Email | Resend | Simple API; dev-friendly. |
| Queues | BullMQ on Redis | Background jobs (notifications, disbursement workers). |
| Rate limiting | Redis-backed with in-memory fallback | Works without Redis in dev; falls back gracefully. |
| Marketing site | Separate Next.js project in `landing_pagee/`, not in workspace | Independent deploy cadence; can't risk breaking landing when frontend releases. |

## Non-negotiables

1. **Customer auth stays email/password + Google.** Mobile number is collected in KYC, not at signup. Do not re-shape this without approval — the `User` model and seed assume it.
2. **Admin login is separate** at `/admin` with username/password. Do not merge into customer auth.
3. **Prisma migrations are append-only.** Never edit an applied migration; add a new one.
4. **Shared types live in `packages/types`.** Duplicated types across frontend and mobile are a bug.
5. **Backend API versioned under `/api/v1`.** Admin under `/api/admin`. New versions require a separate prefix, not an in-place break.
6. **No real `.env` in Git.** Env catalogue in `packages/docs/ENV.md` is authoritative.
7. **Landing site is standalone.** Install with `--ignore-workspace`; do not fold it into the workspace.

## Decisions that have cost

- **Render free tier** — API sleeps when idle; cold starts up to ~1min. Documented tradeoff for cost.
- **Redis optional** — simplifies dev, but production without Redis means per-instance rate limits.
- **No E2E test gate in CI** — `ci.yml` test block is commented out. Gate is intentionally off; re-enabling requires fixing failing tests first.

## Things that look flexible but aren't

- **Nest module layout (`backend/src/modules/*`).** Many modules reference each other via `PrismaService` and shared DTOs; splitting into separate packages would churn too many imports.
- **`User` → `CustomerProfile` split.** Keeps staff (`AdminUser`) separate from customers. Do not collapse.
- **Double-entry `Ledger` + `LedgerEntry`.** Financial source of truth. Any new money movement must post ledger entries.

## 2026-11-09 — Stage 2 slice 4: `node-linker=isolated` single source of truth
What: Root `.npmrc` sets `node-linker=isolated` for pnpm 8. Removed the now-redundant `npm_config_node_linker: isolated` env override from the CI `build` job. **Retained** the identical override in `frontend/vercel.json`'s `installCommand`.
Why retained (Vercel): the Root Directory for the Vercel project is `frontend/`; the install command uses `cd .. && … pnpm install` to reach the repo root, where `.npmrc` is accessible, so the override is in principle redundant. But a Vercel deploy cannot be reproduced from a local shell — if the root `.npmrc` were ever missed on that platform (e.g. a future change to Root Directory that drops the `cd ..`), the override is the last line of defence keeping Next.js on a single React instance. Belt-and-suspenders until a deploy-time verification is in place.

## 2026-11-09 — Stage 2 slice 4: KYC previews stay on native `<img>`
What: `kyc-documents-panel.tsx` keeps two `<img>` elements with inline `eslint-disable-next-line @next/next/no-img-element`.
Why: (1) the pre-upload preview uses a `blob:` object URL that `next/image` cannot optimise and must never leave the browser; (2) the document preview uses a short-lived SIGNED Cloudflare R2 URL for a private KYC document — routing it through `next/image` would proxy via `/_next/image?url=…` on Vercel, which caches responses behind a public, non-expiring path and would leak private documents. Any change here needs a privacy review.

## When adding a decision

Append a short section here with: what, why, date, who approved. Example:

```
## 2026-11-09 — Example decision
What: Switched from X to Y.
Why: One-sentence rationale.
Approved by: <name>.
```
