# RupayAid Environment Variables

## Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL including `/api/v1` |
| `NEXT_PUBLIC_APP_URL` | No | Public URL of the web app |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry client DSN |

## Backend (`backend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | API port |
| `NODE_ENV` | Yes | `development` / `production` |
| `CORS_ORIGIN` | Yes | Allowed CORS origin |
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Yes | JWT signing secret |
| `JWT_EXPIRES_IN` | No | Access token expiry |
| `REFRESH_TOKEN_SECRET` | Yes | Refresh token secret |
| `DIGIMILES_USERNAME` | Production | Digimiles SMS username (mock SMS if unset) |
| `DIGIMILES_PASSWORD` | Production | Digimiles SMS password |
| `DIGIMILES_BASE_URL` | No | Digimiles send URL |
| `DIGIMILES_SENDER_ID` | Production | 6-letter DLT header |
| `DIGIMILES_ENTITY_ID` | Production | 19-digit DLT Principal Entity ID |
| `REDIS_URL` | Recommended | Redis connection string. Without it, rate limits are counted per server instance |
| `TRUST_PROXY_HOPS` | No | Number of proxies in front of the API used to resolve the client IP (default `1`, correct for Render) |
| `ENABLE_SWAGGER` | No | Set `true` to serve `/api/docs` in production (always on in development) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET_NAME` | Yes | R2 bucket for documents |
| `SENTRY_DSN` | No | Sentry server DSN |
