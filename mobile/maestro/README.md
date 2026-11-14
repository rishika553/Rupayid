# Maestro E2E flows (mobile)

Device E2E tests that run against the built Android app, not Jest.

## Prerequisites

1. Install Maestro: https://maestro.mobile.dev (not a pnpm package).
2. Build the Android app (release or debug APK) and install on an emulator or real device.
3. Backend reachable from the device at the API URL configured in the build.

Run: `maestro test maestro/flows/` (from this directory).

## Blockers before any of the user-journey flows can run

**No seeded Android test accounts exist in this repo.** The backend `prisma/seed.ts` creates admin + demo customers for web development, but there are no documented credentials pinned for mobile E2E. The flows below therefore cover only what the UI can do without authentication, plus one login-happy-path marked `TODO_CREDENTIALS`.

Once a dedicated QA test account and backend fixture are decided, drop the credentials into `maestro/.env` (gitignored) and reference them with Maestro's env substitution.

## Flows

- [`01-launch-and-login-screen.yaml`](flows/01-launch-and-login-screen.yaml) — launch the app, confirm the login screen renders.
- [`02-login-success.yaml`](flows/02-login-success.yaml) — **TODO_CREDENTIALS.** Logs in with a seeded account; blocked until a mobile QA account is provisioned.
- [`03-dashboard-navigation.yaml`](flows/03-dashboard-navigation.yaml) — **TODO_CREDENTIALS.** Depends on flow 02.
- [`04-kyc-navigation.yaml`](flows/04-kyc-navigation.yaml) — **TODO_CREDENTIALS.** Depends on flow 02.
- [`05-loan-apply-navigation.yaml`](flows/05-loan-apply-navigation.yaml) — **TODO_CREDENTIALS.** Depends on flow 02.

Flow 01 is runnable today. The rest will be enabled once credentials + a built APK are available in CI.
