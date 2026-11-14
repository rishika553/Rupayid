# Android emulator development

Start the API from the repository root: `pnpm dev:api`.
In another terminal run `pnpm --filter @rupayaid/mobile start:android`.
Set `ANDROID_HOME` to your Android SDK, or `ADB_PATH` to its adb executable,
if adb is not on PATH. Use `ANDROID_SERIAL` when multiple devices are connected.

The Android command forwards ports 3001 (API) and 8081 (Metro), and supplies
`EXPO_PUBLIC_API_URL=http://127.0.0.1:3001/api/v1`. Repeat it after restarting
the emulator because reverse mappings are temporary. Restart Metro after
changing environment variables. The API must be running separately.

On the inspected Android API 37 emulator, Expo Go had local-network access
denied: requests to `10.0.2.2:3001` timed out. The same Expo runtime reached
the API over ADB-reversed localhost successfully. This development setup
does not require changing Android permissions, CORS, validation, or JWT checks.
Use your deployed HTTPS API URL for release builds, not localhost.

Authentication tokens use Expo SecureStore. The previously installed AsyncStorage
legacy API failed in Expo Go with a null native module and silently lost sessions.
Storage writes now reject on failure instead of reporting a successful login.
Run storage regression tests with `node --test mobile/test/secure-storage.test.cjs`
from the repository root.

Session isolation regressions (mocked transport/native storage, real QueryClient):
`node --test mobile/test/auth-session.test.cjs mobile/test/secure-storage.test.cjs`.
Each authentication session owns its API client and query cache. Logout, confirmed
refresh-token rejection, and account switching invalidate the old client and discard its cache;
protected routes are withheld before redirect effects run. Native-device testing
is still needed for the full sign-in, KYC and payment journeys.

Network failures, timeouts, rate limits and server errors during refresh preserve
the current session for retry. A cold-start `/auth/me` outage shows Retry / Sign
out instead of exposing protected content or deleting saved credentials. An
already identified user keeps their session and cache during revalidation outages.

Mobile targets Expo SDK 58 / React 19; the web workspace uses React 18. The mobile
TypeScript paths resolve React declarations from its own `@types/react` package
so hoisted native libraries do not accidentally import the web app's React types.
ESLint extends the shared workspace React/TypeScript configuration. Run
`pnpm --filter @rupayaid/mobile typecheck` and `pnpm --filter @rupayaid/mobile lint`.

## Google sign-in

The existing Expo AuthSession Google provider is loaded only when the runtime
has ExpoApplication and the platform OAuth client is configured. This prevents
an unavailable optional native module from crashing email login and registration
in Expo Go. The fallback button explains why Google login is unavailable.
Supported, configured builds still send the provider ID token to /auth/google.
Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and the platform-specific Android/iOS
client ID for the build being tested. Real Google OAuth requires device testing.

Run the provider-availability regressions with:
`node --test mobile/test/google-sign-in.test.cjs` from the repository root.

See [REDESIGN.md](./REDESIGN.md) for the premium UI implementation, validation
results, Android screenshots, and remaining production verification.

Live API regression probe: `node backend/test/auth-runtime.cjs` from the repo
root. It creates one synthetic account, checks authentication and revocation,
and logs out its sessions. It prints no credentials or tokens and retains the
synthetic account for audit. Do not point this test at production.
