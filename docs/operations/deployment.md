# Deployment, Migrasi, Storage/CDN & Rollback

## 1. Pipeline rilis

1. PR → CI hijau (`typecheck`, `lint`, `format:check`, `check:cycles`, `test`, `build`, E2E Playwright).
2. Merge ke `main` → build artefak (`npm run build`) → deploy **staging**.
3. Jalankan migrasi staging, lalu `npm run smoke:prod` + E2E terhadap staging (production-like config).
4. Checklist rilis (`release-checklist.md`) ditandatangani → deploy **production** dengan urutan di bawah.

## 2. Workflow migrasi database

- Skema ada di `src/lib/db/schema`; migrasi SQL dihasilkan `npm run db:generate` ke `drizzle/` dan **di-commit**.
- Terapkan: `DATABASE_URL=… npm run db:migrate` (script `scripts/db-migrate.ts`, idempoten).
- Trigger DB menolak UPDATE/DELETE `published_snapshots` — jangan menulis migrasi yang mengubah isi snapshot lama.

### Urutan deploy (backward-compatible, expand → migrate → contract)

1. **Expand**: migrasi aditif saja (kolom nullable / tabel baru / index) — kode versi lama tetap berjalan.
2. Deploy aplikasi versi baru.
3. Jalankan backfill bila perlu (idempoten).
4. **Contract** (hapus kolom/tipe lama) hanya di rilis berikutnya setelah versi lama tidak lagi berjalan.
5. Perubahan skema dokumen kanonik: tambahkan migrator versi baru di `src/lib/schema` + fixture beku di
   `tests/fixtures/documents/v<N>` (tes `migration-fixtures.test.ts` menjaga regresi). Snapshot lama
   tidak pernah ditulis ulang; dimigrasi saat dibaca.

> Sebelum migrasi production: **backup** (lihat `backup-restore.md`). Jangan jalankan migrasi destruktif tanpa persetujuan eksplisit.

## 3. Object storage / CDN

- Bucket **privat**; tidak ada listing publik. Aset disajikan lewat `/api/assets/[id]/file` (cek status & MIME), bukan URL bucket langsung.
- Bila CDN dipasang di depan aplikasi: cache hanya `/api/assets/*/file` dan `/_next/static/*`; **jangan** cache `/i/*`, `/api/*` lain, `/dashboard/*`, `/editor/*` (konten live harus langsung berubah setelah republish).
- CORS bucket minimal: tidak diperlukan untuk alur saat ini (upload & delivery lewat aplikasi). Bila presigned upload diaktifkan:
  `AllowedOrigins` = origin aplikasi saja, `AllowedMethods` = `PUT`, `AllowedHeaders` = `Content-Type`, `MaxAgeSeconds` ≤ 600.
- IAM kunci aplikasi: hanya `GetObject`, `PutObject`, `DeleteObject` pada bucket tersebut.

## 4. Rollback

### Aplikasi

1. Deploy ulang artefak versi sebelumnya (tag git / image sebelumnya).
2. Karena migrasi bersifat expand-only, skema tetap kompatibel dengan versi lama; **tidak perlu** rollback DB.
3. Bila migrasi bermasalah dan data rusak: pulihkan dari backup (restore drill di `backup-restore.md`) — keputusan manusia, bukan otomatis.
4. Verifikasi dengan `npm run smoke:prod`.

### Published invitation (snapshot)

- Dashboard → detail undangan → panel **Publish** → **Aktifkan** pada revisi sebelumnya. Hanya memindahkan pointer
  `activePublishedSnapshotId`; snapshot tidak berubah; tercatat di audit (`invitation.rollback`).
- Darurat tanpa UI: lihat langkah SQL di `incident-guide.md`.
