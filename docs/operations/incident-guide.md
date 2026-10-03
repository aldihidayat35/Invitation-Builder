# Incident Quick Guide

Prinsip: **stabilkan dulu, selidiki kemudian**. Catat waktu & requestId. Jangan menghapus data atau menonaktifkan validasi untuk "menghilangkan" gejala.

## 0. Triase 2 menit

1. `curl -i $BASE/api/health` → 200? Bila 503: masalah DB/koneksi (lihat §3).
2. `npm run smoke:prod` (set `SMOKE_BASE_URL`, dll.) → cek mana yang FAIL.
3. Cari di log berdasarkan `requestId` dari laporan pengguna.

## 1. Undangan publik salah/rusak setelah publish

Gejala: konten salah, tampilan rusak, widget error.

1. Dashboard → undangan → Publish → **Aktifkan** revisi sebelumnya (rollback snapshot, tercatat audit).
2. Darurat tanpa UI (butuh akses DB; lakukan di transaksi dan catat):
   ```sql
   -- lihat revisi
   select revision_no, id, created_at from published_snapshots where invitation_id = '<id>' order by revision_no desc;
   -- aktifkan revisi tertentu
   update invitations set active_published_snapshot_id = '<snapshot_id>' where id = '<id>';
   ```
3. Widget tunggal rusak tidak menjatuhkan halaman (error boundary); laporkan tipe widget + requestId.

## 2. Banjir RSVP / indikasi abuse

1. Cek log `rsvp rate limited` (sumber IP).
2. Blok IP/ASN di edge/WAF; turunkan limit jika perlu (`src/features/rsvp/handler.ts`, `createRateLimiter`).
3. Data RSVP tidak dihapus otomatis; filter di dashboard RSVP.

## 3. Database tidak tersedia / lambat

1. Periksa status layanan DB managed & koneksi (jumlah koneksi, disk).
2. Health 503 → pindahkan traffic/restart instance setelah DB pulih.
3. Korupsi data → **hentikan penulisan**, pulihkan dari backup ke instance baru (`backup-restore.md`).

## 4. Rollback aplikasi

Deploy ulang artefak sebelumnya; migrasi expand-only sehingga skema tetap kompatibel (`deployment.md` §4). Jalankan smoke test.

## 5. Upload/asset gagal

1. Log error `/api/assets/*`; cek kredensial & kuota bucket (`S3_*`).
2. Asset publik tidak muncul: cek objek di bucket & status asset `ready`.

## 6. Setelah insiden

Tulis ringkasan (dampak, durasi, akar masalah, tindakan pencegahan), tambahkan tes regresi bila berupa bug, perbarui dokumen ini.
