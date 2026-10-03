# ADR 0006 — Asset pipeline dan widget registry (Fase 5 + 6)

Status: Accepted · Tanggal: 2026-10-03 · PRD: FR-AST-001..002, FR-EDT-008, NFR-SEC-002, FR-WDG-001..004, P-05, P-09

## Keputusan

1. **Validasi gambar memakai sniffer sendiri** (`src/lib/storage/image-sniff.ts`), bukan `sharp`: tanpa dependensi native. Tipe dan dimensi diambil dari magic bytes (JPEG/PNG/WebP/AVIF). SVG sengaja ditolak (potensi script).
2. **Metadata klien tidak dipercaya.** Init hanya mencadangkan baris `assets`; finalize membaca ulang objek, lalu memeriksa ukuran, tipe, dan dimensi (maks 8000 px). Jika gagal: status `failed` dan objek dihapus.
3. **Dua storage driver di balik satu interface**: lokal (upload di-proxy lewat `PUT /api/assets/:id/content`) dan S3-compatible (presigned PUT, TTL 300 detik). Driver S3 **belum diuji ke server S3 nyata** dan butuh CORS bucket.
4. **Pengiriman publik lewat capability URL** (`/api/assets/:id/file`): UUID tak tertebak, hanya aset `ready`, `nosniff`, CSP `sandbox`. Kebijakan lebih ketat dibahas di F9.
5. **Hanya gambar di F5**; audio ditolak sampai F10.
6. **Definisi widget bebas DOM**: `WidgetDefinition` (schema, default, placeholder fungsi murni) terpisah dari komponen runtime (`widgets/runtime/`). Komponen runtime memilih prop secara eksplisit, tidak pernah spread data tersimpan.
7. **Timezone countdown berada di dalam nilai datetime** (`{local, timeZone}`), bukan prop terpisah.
8. **Peta tanpa Maps API**: tautan Google Maps `search/?api=1&query=lat,lng`.
9. Tipe widget tak dikenal: diblokir saat publish (`unknown_widget_type`), fallback aman di editor dan runtime.

## Konsekuensi / utang

- Belum ada varian gambar teroptimasi; `PublicImage` dan `assetUrl(id,{width})` sudah menjadi titik ekstensi.
- Baris `uploading` yatim jika PUT gagal (perlu job pembersih).
- Kanvas editor menampilkan placeholder untuk gambar yang di-bind (belum memakai default variabel).
- Pesan error validasi init masih dari zod (bahasa Inggris).
