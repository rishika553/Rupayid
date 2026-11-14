# CLAUDE.md — RupayAid

Context file loaded automatically by Claude Code at session start. Keep it short and factual. Detailed docs live under [`docs/`](docs/) and [`packages/docs/`](packages/docs/).

## Project overview

RupayAid is a lending platform for Indian customers: signup → KYC → loan application → disbursement → repayment. Staff review KYC and loans in a separate admin portal.

## Architecture

```
landing_pagee (Next.js marketing site, Vercel, standalone — not in workspace)
      │
frontend (Next.js 14 app, Vercel)  ──► customer portal + /admin portal
      │ REST + JWT (/api/v1)
backend (NestJS 10 + Prisma, Render) ──► PostgreSQL (Neon)
                                     ├─► Cloudflare R2 (KYC docs)
                                     ├─► Razorpay (repayments)
                                     ├─► Resend (email) / Digimiles (SMS)
                                     └─► Redis (optional, rate limits)
mobile (Expo / React Native 0.88, Expo Router) ──► same backend
```

Monorepo via `pnpm` workspaces. Shared packages: `@rupayaid/types`, `@rupayaid/ui`, `@rupayaid/config`, `@rupayaid/docs`.

## Tech stack (versions pinned in package.json)

- Node >= 20, pnpm 8.15.0
- Backend: NestJS 10, Prisma 5, PostgreSQL, JWT + Passport, BullMQ, ioredis, class-validator, Swagger
- Frontend: Next.js 14.1, React 18, TanStack Query/Table, Tailwind, Radix UI, react-hook-form + zod
- Mobile: Expo ~58, React Native 0.88, React 19.3, expo-router, expo-secure-store
- Landing: separate Next.js project (standalone)

## Development commands

```bash
pnpm install              # install all workspaces
pnpm dev                  # frontend + backend together
pnpm dev:web              # frontend on :3000
pnpm dev:api              # backend on :3001
pnpm dev:mobile           # Expo
pnpm mobile:android       # Expo on Android

pnpm build                # web + api
pnpm lint                 # eslint across workspaces
pnpm typecheck            # tsc --noEmit everywhere
pnpm test                 # unit tests (jest in backend)

pnpm db:generate          # prisma generate
pnpm db:migrate           # prisma migrate dev
pnpm db:seed              # seed roles, products, admin user, demo customers
pnpm db:studio            # prisma studio
```

Landing site is installed separately: `cd landing_pagee && pnpm install --ignore-workspace`.

## Coding conventions

- TypeScript strict across all apps. Never introduce `any` without a comment explaining why.
- Backend: NestJS module-per-domain (`backend/src/modules/*`). DTOs validated with class-validator.
- Frontend: App Router. Server components by default; mark client components explicitly.
- Shared types belong in `packages/types`, not duplicated across apps.
- Default to no comments; explain only non-obvious *why*.
- Commits: short imperative subject; the repo's style is informal (e.g. "fix the kyc issue", "worked on dashboard") — match what's there.

## Important restrictions

1. **Do not break the web app while working on mobile.** They share the backend — touching an API changes two clients.
2. **Do not change backend API shapes without auditing frontend + mobile callers.** Both consume `/api/v1`.
3. **Preserve existing auth and database behaviour.** JWT access + rotating refresh tokens via `Session` table; do not replace.
4. **Never commit real `.env` files.** Env var catalogue: [`packages/docs/ENV.md`](packages/docs/ENV.md).
5. **No new dependencies without a reason.** Prefer what's already installed.
6. **Do not remove features without approval.**
7. **Run `pnpm typecheck` after backend/frontend changes**; run the relevant workspace `lint` for touched code.

## Detailed docs

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — what's built, what's pending, known issues
- [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md) — architectural decisions and locked-in choices
- [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) — dated work log
- [`packages/docs/ARCHITECTURE.md`](packages/docs/ARCHITECTURE.md), [`packages/docs/ENV.md`](packages/docs/ENV.md), [`packages/docs/DEV.md`](packages/docs/DEV.md)
- [`README.md`](README.md) — public-facing overview

## Memory rules (for Claude)

After any substantial task:
1. Update [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) only with **verified** state (code read, tests run, or app exercised).
2. Record non-obvious decisions in [`docs/TECHNICAL_DECISIONS.md`](docs/TECHNICAL_DECISIONS.md).
3. Append a dated entry to [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).
4. Only edit this `CLAUDE.md` when a permanent rule or stack fact changes.
5. Never mark unverified work as completed. If uncertain, write "present in code, not verified in a running app."
