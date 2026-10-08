# Privasi & Retensi Data

## Alur permintaan pengguna

1. Pengguna mengajukan ekspor atau penghapusan melalui `/dashboard/privacy`.
2. Sistem menolak permintaan sejenis yang masih pending dan mencatat permintaan ke audit log.
3. Owner memverifikasi identitas, ruang lingkup data, kewajiban transaksi, dan legal hold dari
   `/dashboard/admin/operations`.
4. Owner mengubah status menjadi `in_progress`, melakukan pekerjaan dengan prosedur terkontrol,
   lalu menandai `completed` atau `rejected` beserta catatan keputusan.

Status `completed` adalah atestasi operator bahwa ekspor/penghapusan telah dilakukan. Aplikasi tidak
menghapus data bisnis secara otomatis agar histori transaksi, audit, dan relasi data tidak rusak tanpa
pemeriksaan manusia.

## Kebijakan awal

| Data                                     | Retensi awal           | Perlakuan                                             |
| ---------------------------------------- | ---------------------- | ----------------------------------------------------- |
| Permintaan privasi dan catatan keputusan | 2 tahun                | dibatasi untuk owner                                  |
| Audit log transaksi/otorisasi            | 2 tahun                | append-only; pseudonimkan identitas bila akun dihapus |
| Security event                           | 90 hari                | append-only; hanya hash identitas                     |
| Backup database/object storage           | 30 hari                | kedaluwarsa melalui lifecycle infrastruktur           |
| Data order aktif                         | selama layanan/kontrak | selesaikan atau batalkan sebelum penghapusan          |

Permintaan penghapusan diberi target review 30 hari (`retention_due_at`). Bila hukum atau kontrak
mewajibkan penyimpanan lebih lama, owner wajib menolak/menunda dengan alasan yang spesifik.

## Checklist penyelesaian

- Verifikasi pemilik akun tanpa menyalin dokumen identitas ke audit log.
- Ekspor hanya data milik target dan simpan artefak pada kanal sementara yang terenkripsi.
- Cabut sesi aktif dan akses akun.
- Lepaskan atau pseudonimkan data pribadi yang tidak lagi wajib disimpan.
- Jangan mengubah ledger audit/security; pseudonimkan referensi melalui proses migrasi yang disetujui.
- Catat tiket, tanggal, pelaksana, ruang lingkup, serta pengecualian pada resolution note.
- Ingatkan pengguna bahwa salinan dalam backup hilang mengikuti siklus retensi maksimum 30 hari.
