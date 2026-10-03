# Konfigurasi per Environment

Semua konfigurasi lewat environment variable / secret manager. **Tidak ada secret di repository**
(`.env*` di-ignore kecuali `.env.example`; hasil audit di `docs/security-audit.md`).

| Variable                                                                     | Local                      | Staging                  | Production                     | Catatan                                                                          |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------------ | ------------------------------ | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                               | `pglite://./.data/dev`     | `postgres://…` (managed) | `postgres://…` (managed, TLS)  | PGlite **ditolak** di production kecuali `ALLOW_PGLITE_IN_PRODUCTION=1` (CI/e2e) |
| `ALLOW_PGLITE_IN_PRODUCTION`                                                 | —                          | —                        | **jangan diset**               | Hanya e2e/CI                                                                     |
| `AUTH_INSECURE_COOKIES`                                                      | `1` hanya untuk http lokal | **jangan diset**         | **jangan diset**               | Mematikan flag `Secure` cookie                                                   |
| `SEED_DEV_PASSWORD`                                                          | opsional                   | wajib bila seeding       | wajib bila seeding, lalu hapus | Seed akun awal; ganti password setelah login pertama                             |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`                      | kosong (disk lokal)        | bucket staging           | bucket production              | Bila `S3_BUCKET` diset, kunci akses wajib (app gagal start jika tidak)           |
| `S3_REGION`, `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE`                            | —                          | sesuai provider          | sesuai provider                | `S3_ENDPOINT` untuk S3-compatible (R2/MinIO)                                     |
| `STORAGE_LOCAL_DIR`                                                          | `.data/uploads`            | —                        | — (pakai S3)                   | Disk lokal tidak cocok untuk multi-instance                                      |
| `NODE_ENV`                                                                   | `development`              | `production`             | `production`                   | Diset otomatis oleh `next start`/`next build`                                    |
| `E2E_PASSWORD`, `E2E_PORT`                                                   | opsional                   | CI saja                  | —                              | Hanya Playwright                                                                 |
| `SMOKE_BASE_URL`, `SMOKE_PUBLIC_SLUG`, `SMOKE_GUEST_TOKEN`, `SMOKE_ASSET_ID` | —                          | dipakai `smoke:prod`     | dipakai `smoke:prod`           | Tidak dibaca aplikasi                                                            |

## Aturan

1. Staging memakai konfigurasi **sama bentuknya** dengan production (Postgres + S3 + TLS); hanya nilai/credential berbeda.
2. Credential staging ≠ production. Rotasi: ganti di secret manager → redeploy → cabut kunci lama.
3. Menambah variable baru: perbarui `.env.example` dan tabel ini dalam PR yang sama.
