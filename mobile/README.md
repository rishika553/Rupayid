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

Both auth screens use the native Google account chooser and send its ID token to
the existing `/auth/google` endpoint. Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in
`mobile/.env` to the same Web OAuth client ID as the backend's `GOOGLE_CLIENT_ID`.
This public client ID is not a client secret; never put a Google client secret in
an `EXPO_PUBLIC_` variable.

Google sign-in needs an installed native build, not Expo Go. In Google Cloud,
register an Android OAuth client for `com.rupayaid.app` and the SHA-1 certificate
of the debug/release build being tested, in the same project as the Web client.
Android links the native library automatically; Firebase is not used. Build with
`pnpm --filter @rupayaid/mobile android` after configuring the Android SDK.
For iOS, also set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; `app.config.js` adds its
reversed URL scheme through the library's config plugin. Rebuild after changes.

The button remains visible in Expo Go and explains that this preview requires
email sign-in. Cancelled Google prompts do not create a session. Native login
with real Google credentials still needs verification on a configured build.
Run `node --test mobile/test/google-sign-in.test.cjs` for the mocked SDK regressions.

Live API regression probe: `node backend/test/auth-runtime.cjs` from the repo
root. It creates one synthetic account, checks authentication and revocation,
and logs out its sessions. It prints no credentials or tokens and retains the
synthetic account for audit. Do not point this test at production.
