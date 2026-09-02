# RupayAid

Production-grade lending platform built with a modern, type-safe monorepo architecture.

## Tech Stack

### Frontend
- **Next.js 14** (App Router) - React framework
- **TypeScript** - Static typing
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** + **Radix UI** - Accessible component primitives
- **React Hook Form** + **Zod** - Form handling and validation
- **TanStack Query** - Server-state management
- **TanStack Table** - Data tables

### Backend
- **NestJS** - Modular Node.js framework
- **TypeScript** - Static typing
- **Prisma ORM** - Type-safe database access
- **Passport.js** - Authentication strategies
- **JWT** - Token-based auth
- **BullMQ** - Background job processing

### Database & Cache
- **PostgreSQL** (via **Neon**) - Primary database
- **Redis** (via **Upstash**) - Caching and queues

### Infrastructure
- **Vercel** - Frontend deployment
- **Railway / Fly.io** - Backend deployment
- **Cloudflare R2** - Document storage
- **GitHub Actions** - CI/CD
- **Sentry** - Error monitoring
- **Better Stack** - Logging

## Monorepo Structure

```
rupayaid/
├── backend/                # NestJS backend API
├── frontend/               # Next.js frontend
├── packages/
│   ├── config/             # Shared configs (TS, ESLint, Prettier)
│   ├── ui/                 # Shared UI components (shadcn/ui)
│   ├── types/              # Shared TypeScript types
│   └── docs/               # Documentation
└── ...
```

## Prerequisites

- Node.js >= 20
- pnpm >= 8
- PostgreSQL (local or Neon)
- Redis (local or Upstash)
- Environment variables (see `.env.example` files)

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
copy frontend/.env.example frontend/.env.local
copy backend/.env.example backend/.env.local

# Set up database (fill in DATABASE_URL first)
pnpm db:generate
pnpm db:push
```

## Development

```bash
# Run both frontend and backend together
pnpm dev

# Run individually
pnpm dev:web    # Next.js on http://localhost:3000
pnpm dev:api    # NestJS on http://localhost:3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Run web + api in development |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint across all workspaces |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Create/apply migrations |
| `pnpm db:studio` | Open Prisma Studio |

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /users` - List users (paginated)
- `GET /health` - Health check
- `GET /docs` (Swagger) - API documentation

## Environment Variables

Each application has its own `.env.example` file documenting the required variables. Never commit real `.env` files.

## Deployment

### Frontend (Vercel)
- Import the `frontend` directory
- Set environment variables matching `.env.example`
- Framework preset: Next.js

### Backend (Railway/Fly.io)
- Deploy the `backend` directory
- Configure `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- Prisma migrations run via release command

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

CI runs lint, typecheck, and build on all pushes and PRs.

## Monitoring

- **Sentry** for error tracking (set `SENTRY_DSN`)
- **Better Stack** for structured logging (set `BETTER_STACK_SOURCE_KEY`)

## License

Private - All rights reserved.
