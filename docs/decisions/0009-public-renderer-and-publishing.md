# ADR 0009 — Public renderer, publishing & snapshots

- Status: Accepted (Fase 9)
- PRD: FR-INV-004, FR-PUB-001..003, AC-09..AC-12, P-04, P-06, NFR-PERF-001, NFR-REL-001

## Keputusan

1. **Skala viewport 100% CSS.** Setiap `<section>` adalah _size container_
   (`container-type: inline-size`, `width: 100%`, `aspect-ratio: baseWidth / baseHeight`).
   Anak absolut menetapkan `--u: calc(100cqw / baseWidth)`; semua panjang artboard (posisi, ukuran,
   font, letter-spacing, stroke, radius) dinyatakan sebagai `calc(var(--u) * <angka px>)` lewat
   custom property tanpa satuan (`--x/--y/--w/--h/--fs/--ls/--bw/--r`). Hasil: artboard 390 px
   diskalakan proporsional untuk 320–430 px tanpa JavaScript dan tanpa overflow horizontal
   (viewport dibatasi `TARGET_VIEWPORT_MAX` = 430 px). Rotasi tetap `rotate()` pivot tengah.
2. **Snapshot immutable.** `publishInvitation` membekukan _dokumen template yang di-pin_ (sudah
   dimigrasi) + `invitations.data` ke `published_snapshots` (insert-only; trigger DB menolak
   UPDATE/DELETE). `revisionNo` naik per undangan; tidak ada kolom baru → tanpa migrasi DB.
3. **Gate publish.** Publish ditolak (`PublishBlockedError`) selama ada variabel wajib kosong /
   nilai tidak valid. Capability `invitation:write`; aksi diaudit (`invitation.publish`).
4. **Draft ≠ live.** Halaman publik hanya membaca `activePublishedSnapshotId`; `invitations.data`
   tidak pernah dibaca oleh `getPublicInvitation`. Edit draft baru tampil setelah publish ulang (AC-10).
5. **Rollback** (`rollbackInvitation`) hanya memindahkan pointer aktif ke revisi lama; snapshot
   tidak diubah. Diaudit (`invitation.rollback`).
6. **Rute publik `/i/[slug]`** (grup `(public)`, tanpa login, `force-dynamic`). `?to=<token>` memilih
   konteks tamu; token hanya berlaku untuk undangan yang sama, token tidak dikenal / diarsipkan
   jatuh ke konteks generik. Model publik tidak memuat id DB. `robots: noindex,nofollow`.
   Undangan diarsipkan / belum publish → 404.
7. **Satu renderer.** Preview dan publik memakai `DocumentRenderer` (DOM, tanpa canvas/Konva).
   Gambar di luar elemen pertama section pertama `loading="lazy"`; galeri/audio tidak preload.
8. **Isolasi widget.** `WidgetErrorBoundary` (client) membungkus tiap widget; kegagalan satu widget
   tidak menjatuhkan halaman dan tidak membocorkan pesan error.

## Konsekuensi / utang

- Widget memakai ukuran px internal; frame-nya yang diskalakan. Penyesuaian tipografi widget
  per viewport dan audit visual 5 viewport × ≥2 template dilanjutkan di F11.
- Slug tidak bisa diubah user di F9 (dihasilkan saat create, unik).
