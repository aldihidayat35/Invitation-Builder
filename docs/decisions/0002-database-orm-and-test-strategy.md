# ADR 0002 — ORM, Database, dan Strategi Verifikasi

- **Status:** Accepted
- **Tanggal:** 2026-10-03
- **Fase:** 1 — Data Model, Schemas, dan Foundation
- **Requirement terkait:** FR-TPL-002, FR-AST-001, NFR-REL-001, PRD §15.1, Lampiran B

## Keputusan

### 1. ORM: Drizzle (bukan Prisma)

| Pertimbangan       | Drizzle                                     | Prisma                              |
| ------------------ | ------------------------------------------- | ----------------------------------- |
| Skema              | TypeScript, dapat mengimpor enum Zod/domain | `.prisma` DSL terpisah              |
| Migrasi            | SQL biasa; custom SQL (trigger) first-class | Perlu `--create-only` + edit manual |
| Constraint `CHECK` | Didukung di skema                           | Tidak didukung di skema             |
| Index `lower(col)` | Didukung (`sql` expression)                 | Tidak didukung langsung             |
| Runtime            | Ringan, tanpa engine biner/codegen          | Query engine + generate step        |

Alasan utama: enum DB dibangun dari `src/lib/schema/domain.ts` (satu sumber
kebenaran untuk Zod dan DB), serta kebutuhan `CHECK`, unique index
`lower(email)`, dan trigger immutability.

### 2. Driver dan verifikasi

- Produksi: **PostgreSQL** via `pg` (node-postgres) — `connectPostgres`.
- Mesin dev kosong (tanpa Postgres/Docker), maka migrasi dan repository
  diverifikasi dengan **PGlite** (Postgres 17 embedded/WASM, engine Postgres
  asli). PGlite adalah `devDependency`, hanya untuk dev dan test.
- Skrip `db:migrate` / `db:seed` menerima `DATABASE_URL=postgres://...` **atau**
  `pglite://<dir>`. Migrasi SQL yang sama berjalan di keduanya.
- **Batasan jujur:** migrasi belum dijalankan terhadap server PostgreSQL
  terpisah di lingkungan ini. CI sebaiknya menambah service Postgres (lihat
  README `src/lib/db`).

### 3. Immutability di level DB

`template_versions`, `published_snapshots`, `audit_logs` dilindungi trigger
`BEFORE UPDATE OR DELETE` (migrasi `0001_immutability_triggers`) yang melempar
`restrict_violation`. Ini menjamin NFR-REL-001 walau ada bug aplikasi.

### 4. Konvensi

- PK `uuid` (`gen_random_uuid()`), `timestamptz`, snake_case.
- FK default `RESTRICT`: data diarsipkan, bukan dihapus keras.
- Kolom jsonb dokumen bertipe `unknown` → wajib lewat `migrateDocument` saat dibaca.
- `templates.revision` untuk optimistic concurrency (tabrakan simpan = conflict).
- `invitations.data` dan `published_snapshots.data` memuat data klien; desain
  tidak pernah bercampur dengan data klien.
- `guests.token_id`: 16 byte acak (base64url), unik, tidak berurutan. Disimpan
  plaintext (bukan hash) karena tautan tamu harus dapat dibuat ulang; token
  tidak memberi akses selain halaman undangan tamu itu.
- File skema DB memakai **import relatif** (drizzle-kit tidak mengenal alias `@/`).
- `import "server-only"` hanya di barrel `src/lib/db/index.ts` dan service
  feature; script (tsx) mengimpor modul dalam secara langsung.
- ESLint melarang import DB (`@/lib/db`, `drizzle-orm`, `pg`, `pglite`) dari
  `src/app/**` dan `src/features/*/components/**`.
