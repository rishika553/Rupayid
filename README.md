# RupayAid

Lending platform for Indian customers: sign up, complete KYC, apply for a loan, receive the disbursement and repay online. Staff review KYC and loans in an admin portal.

## How the pieces fit

```
landing_pagee (marketing site, Vercel)
        │  "Get started" / "Sign in"
        ▼
frontend (customer portal + admin portal, Vercel)
        │  REST + JWT
        ▼
backend (NestJS API, Render) ──► PostgreSQL (Neon)
                               ├─► Cloudflare R2 (KYC documents)
                               ├─► Razorpay (repayments)
                               ├─► Resend (email) / Digimiles (SMS)
                               └─► Redis (optional, rate limits)
```

| Folder | What it is |
|--------|------------|
| `landing_pagee/` | Standalone Next.js marketing site. Not part of the pnpm workspace; deployed as its own Vercel project. |
| `frontend/` | Next.js 14 app: customer portal (`/login`, `/dashboard`, `/kyc`, `/loans`, `/repayments`, `/payments`, `/referral`, `/notifications`, `/profile`) and admin portal (`/admin`). |
| `backend/` | NestJS API with Prisma. Customer routes under `/api/v1`, staff routes under `/api/admin`. |
| `packages/types` | Shared TypeScript types. |
| `packages/ui` | Shared UI components. |
| `packages/config` | Shared TS / ESLint / Prettier config. |
| `packages/docs` | Architecture, environment variables, development notes. |

## Customer sign-in

Customers sign in with email + password or Google. The mobile number is collected in the KYC personal-details step (required, 10 digits), not at sign-in. Sessions use a short-lived access token plus a rotating refresh token stored in the `Session` table.

Staff sign in separately at `/admin` with a username and password.

## Prerequisites

- Node.js >= 20
- pnpm 8
- PostgreSQL (local or Neon)
- Redis is optional; without it rate limits fall back to in-memory

## Setup

```bash
pnpm install

# create backend/.env and frontend/.env.local (see packages/docs/ENV.md)

pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

The landing site installs on its own:

```bash
cd landing_pagee
pnpm install --ignore-workspace
pnpm dev
```

## Development

```bash
pnpm dev        # frontend + backend
pnpm dev:web    # frontend on http://localhost:3000
pnpm dev:api    # backend on http://localhost:3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run frontend and backend |
| `pnpm build` | Build frontend and backend |
| `pnpm lint` | ESLint across workspaces |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | Unit tests |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create/apply migrations (development) |
| `pnpm db:seed` | Seed roles, loan products, the admin user and demo customers |
| `pnpm db:studio` | Open Prisma Studio |

## API

Base URL: `http://localhost:3001/api/v1`. Swagger UI is at `/api/docs` in development (set `ENABLE_SWAGGER=true` to expose it in production).

| Area | Routes |
|------|--------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` |
| Customer | `/customers/me`, `/dashboard`, `/kyc`, `/files`, `/eligibility`, `/loan-products`, `/loans`, `/repayments`, `/payments`, `/referrals`, `/notifications` |
| Admin | `/api/admin/auth`, `/api/admin/dashboard`, `/api/admin/kyc`, `/api/admin/loans`, `/api/admin/disbursements`, `/api/admin/repayments`, `/api/admin/payments` |
| Health | `GET /health` |

## Deployment

| App | Host | Settings |
|-----|------|----------|
| Landing site | Vercel | Root Directory `landing_pagee`, install `pnpm install --ignore-workspace`, build `pnpm exec next build` |
| Customer + admin portal | Vercel | Root Directory `frontend`; set `NEXT_PUBLIC_API_URL` to the backend `/api/v1` URL |
| API | Render | Build the `@rupayaid/api` package, run `prisma migrate deploy`, start with `start:prod` (`node dist/src/main.js`) |
| Database | Neon | `DATABASE_URL` on Render |

Render's free tier sleeps when idle, so the first request after a quiet period can take close to a minute.

Environment variables for every app are listed in [`packages/docs/ENV.md`](packages/docs/ENV.md). Never commit real `.env` files.

## License

Private - All rights reserved.
