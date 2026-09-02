# RupayAid Development Guide

## Getting started

1. Install pnpm: `npm install -g pnpm@8`
2. Install dependencies: `pnpm install`
3. Copy env files (see ENV.md)
4. Run database: `pnpm db:generate && pnpm db:push`
5. Start dev servers: `pnpm dev`

## Development workflow

- `apps/web` runs Next.js on port 3000
- `apps/api` runs NestJS on port 3001
- API docs available at `http://localhost:3001/api/docs`

## Code conventions

- Prettier for formatting (config at repo root)
- ESLint for linting (config in `packages/config`)
- TypeScript strict mode enabled everywhere
- Shared types live in `packages/types`
- UI components live in `packages/ui`

## Adding a new API endpoint

1. Create the NestJS module in `apps/api/src/modules/<name>/`
2. Define DTOs with class-validator decorators
3. Register the module in `app.module.ts`
4. Add shared types in `packages/types`

## Adding a new UI component

1. Use `pnpm dlx shadcn-ui@latest add <component>` in `apps/web`
2. Move the component to `packages/ui/components/` if shared
3. Export from `packages/ui/index.tsx`
