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
| `OTP_PEPPER` | Yes | HMAC pepper for hashing OTPs |
| `MSG91_AUTH_KEY` | Production | MSG91 auth key (mock SMS if unset) |
| `MSG91_TEMPLATE_ID` | Production | MSG91 OTP template id |
| `MSG91_SENDER_ID` | No | MSG91 sender id |
| `REDIS_URL` | Yes | Redis connection string (Upstash) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET_NAME` | Yes | R2 bucket for documents |
| `SENTRY_DSN` | No | Sentry server DSN |
