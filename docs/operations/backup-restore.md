# Backup & Restore (NFR-BACKUP-001)

## Sasaran

| Aset                  | Frekuensi backup                | Retensi | RPO      | RTO     |
| --------------------- | ------------------------------- | ------- | -------- | ------- |
| PostgreSQL            | harian penuh + PITR/WAL kontinu | 30 hari | ≤ 15 mnt | ≤ 2 jam |
| Object storage (aset) | versioning bucket + replikasi   | 30 hari | ≤ 1 jam  | ≤ 4 jam |
| Konfigurasi/secret    | di secret manager (versi)       | —       | —        | —       |

Angka di atas adalah target awal; sesuaikan dengan SLA pilot dan catat perubahan di ADR.

## Database

Backup logis manual (sebelum migrasi production):

```bash
pg_dump --format=custom --no-owner "$DATABASE_URL" --file "undangan-$(date +%Y%m%d-%H%M).dump"
```

Restore ke instance **baru** (jangan menimpa production langsung):

```bash
createdb undangan_restore
pg_restore --no-owner --dbname undangan_restore undangan-YYYYMMDD-HHMM.dump
DATABASE_URL=postgres://…/undangan_restore npm run db:migrate   # harus no-op bila skema sama
```

Validasi pasca-restore: jumlah baris `invitations`, `published_snapshots`, `rsvps`; buka satu `/i/<slug>`; `npm run smoke:prod` dengan `SMOKE_BASE_URL` instance restore.

## Storage

- Aktifkan **versioning** bucket + lifecycle (hapus versi non-current > 30 hari).
- Restore objek: salin versi sebelumnya (`aws s3api copy-object --copy-source "bucket/key?versionId=…"`).
- Asset yang dirujuk snapshot publik harus ada; setelah restore jalankan smoke test dengan `SMOKE_ASSET_ID`.

## Restore drill (wajib sebelum go-live, lalu per kuartal)

1. Ambil backup terbaru (DB + bucket) ke lingkungan terisolasi.
2. Restore DB baru + salin bucket; deploy app staging menunjuk ke keduanya.
3. Jalankan `npm run smoke:prod` + buka satu undangan publik + satu RSVP uji.
4. Catat: waktu total (RTO aktual), data terakhir yang hilang (RPO aktual), masalah ditemukan.
5. Simpan catatan drill di tiket/ADR; perbaiki prosedur jika target terlampaui.

> Status: prosedur terdokumentasi; **drill pertama belum dijalankan** (butuh infrastruktur staging). Harus selesai sebelum go-live.
