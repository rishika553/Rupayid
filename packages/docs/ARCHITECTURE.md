# RupayAid Architecture

This document describes the high-level architecture of the RupayAid platform.

## Overview

RupayAid is a lending platform with a clear separation between the frontend (Next.js) and backend (NestJS) applications, connected through a REST API. Both applications share TypeScript types and configuration through workspace packages.

## Core flow

```
Browser (Next.js)
    │
    │ HTTP / JSON (JWT Bearer token)
    ▼
NestJS API
    │
    ├── Prisma ──────► PostgreSQL (Neon)
    │
    ├── Redis (Upstash) ──► Caching
    │
    └── BullMQ ──► Background jobs
```

## Key design decisions

1. **Monorepo** - Single repository using pnpm workspaces for shared code reuse and consistent tooling.
2. **REST API** - The frontend talks to the backend via a REST API under `/api/v1`.
3. **JWT Auth** - Stateless authentication using JWT tokens with a Passport.js strategy.
4. **Type-safe boundary** - Shared types between frontend and backend reduce integration errors.
5. **Serverless-friendly** - Neon (serverless PostgreSQL) and Upstash (serverless Redis) allow the backend to be serverless-friendly.
