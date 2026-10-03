# ADR 0012 — Production Readiness

Status: Diterima (Fase 12) — gate staging/restore drill belum dieksekusi

## Keputusan

1. Konfigurasi hanya via env/secret manager; matriks di `docs/operations/environments.md`.
2. Migrasi DB mengikuti expand → migrate → contract (backward-compatible); lihat `docs/operations/deployment.md`.
3. Backup/restore & rollback (aplikasi + snapshot publish) didokumentasikan di `backup-restore.md` dan `deployment.md`.
4. Smoke test produksi: `npm run smoke:prod` (`scripts/smoke-production.mjs`).
5. Release checklist & incident guide berupa template; tanda tangan internal dilakukan saat rilis nyata.
6. **PRD baseline dibekukan.** Scope baru wajib lewat Change Request v1.1+.

## Belum dilakukan

- Deploy ke staging nyata dan restore drill.
- Pemasangan monitoring/alert di vendor pilihan.
