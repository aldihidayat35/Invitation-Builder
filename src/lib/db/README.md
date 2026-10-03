# src/lib/db

Drizzle ORM + PostgreSQL (ADR 0002). 11 tables in `schema/tables.ts`, SQL migrations in `/drizzle`.

- `repositories/` – workspace-scoped queries; take `db` as the first argument.
- `connect.ts` – production (`pg`). `pglite.ts` – embedded Postgres for dev/tests only.
- `seed.ts` – idempotent dev user + workspace + empty template.
- UI/route code must NOT import this (ESLint-enforced); use feature services
  (e.g. `src/features/templates/service.ts`).

## Commands

```bash
# DATABASE_URL=postgres://user:pass@host:5432/db   or   pglite://./.data/dev
npm run db:generate   # after editing schema/*
npm run db:migrate
npm run db:seed
```

Run against real PostgreSQL by setting `DATABASE_URL=postgres://...`. Integration tests
(`tests/integration`) apply the real migrations to an in-memory PGlite.
