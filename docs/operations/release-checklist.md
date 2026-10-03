# Release Checklist

Salin per rilis. Centang hanya setelah dibuktikan (link CI / output / tangkapan layar).

## A. Kualitas

- [ ] CI hijau di `main`: typecheck, lint, format:check, cycles, unit/integration, build, E2E.
- [ ] `docs/qa-report.md` diperbarui; tidak ada AC (AC-01..15) tanpa bukti.
- [ ] Tidak ada blocker keamanan/performa di `docs/security-audit.md` (atau diterima eksplisit di bawah).
- [ ] Matriks requirement (`docs/requirements-matrix.md`) tidak memuat status "Not started"/"In progress" tak terjelaskan.

## B. Konfigurasi & secret

- [ ] Variabel production sesuai `docs/operations/environments.md`; `AUTH_INSECURE_COOKIES` & `ALLOW_PGLITE_IN_PRODUCTION` **tidak** diset.
- [ ] Secret hanya di secret manager; scan repo bersih.
- [ ] Kunci S3 punya hak minimal; bucket privat; CORS minimal.

## C. Data

- [ ] Backup DB + bucket terbaru diambil **sebelum** migrasi.
- [ ] Migrasi bersifat expand-only (atau perubahan destruktif disetujui tertulis).
- [ ] Restore drill terakhir < 90 hari dan lulus (RTO/RPO tercatat).

## D. Staging (production-like)

- [ ] `npm run smoke:prod` lulus (isi `SMOKE_PUBLIC_SLUG`, `SMOKE_GUEST_TOKEN`, `SMOKE_ASSET_ID`).
- [ ] Golden path manual: buat template → publish → buat undangan → publish → URL tamu → RSVP → dashboard RSVP.
- [ ] Rollback diuji: aktifkan revisi lama pada undangan uji, lalu kembali.

## E. Production

- [ ] Deploy sesuai `docs/operations/deployment.md`; catat versi/commit.
- [ ] `npm run smoke:prod` terhadap production lulus.
- [ ] Monitor & alert di `docs/operations/observability.md` aktif; health probe hijau.
- [ ] Rencana rollback aplikasi tersedia dan orang on-call tahu langkahnya.

## F. Baseline

- [ ] PRD baseline dibekukan (`docs/PRD_BASELINE.md` + checksum test). Scope baru → Change Request v1.1+.

## Tanda tangan internal

| Peran                 | Nama | Tanggal | Tanda tangan |
| --------------------- | ---- | ------- | ------------ |
| Engineering lead      |      |         |              |
| QA                    |      |         |              |
| Product owner         |      |         |              |
| Operasional / on-call |      |         |              |
