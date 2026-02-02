# Database (Postgres)

This project connects to Postgres via `postgres` (postgres-js).

## Quick setup

After pulling changes, run:

```
npm install
```

This ensures the `postgres` package and its dependencies are installed correctly.

## Environment variables

Set the following (runtime only):

- `POSTGRES_URL_NON_POOLING` (preferred)
- `POSTGRES_URL`
- `DATABASE_URL` (fallback)

Example (do not commit secrets):

```
POSTGRES_URL_NON_POOLING=postgres://user:password@host:5432/dbname
```

## Vercel env pull

If you use Vercel, pull env vars into `.env.local`:

```
vercel env pull .env.local
```

## Health check

- `GET /api/health/db` runs a simple `SELECT 1` and returns `{ ok: true }` on success.

## Migrations

Run migrations with:

```
npm run db:migrate
```

The script loads `.env.local` when `POSTGRES_URL` is not already set.
