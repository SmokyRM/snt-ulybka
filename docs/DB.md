# Database (Postgres / Vercel)

This project connects to Postgres via `@vercel/postgres`.

## Environment variables

Set the following (runtime only):

- `POSTGRES_URL`

Example (do not commit secrets):

```
POSTGRES_URL=postgres://user:password@host:5432/dbname
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
