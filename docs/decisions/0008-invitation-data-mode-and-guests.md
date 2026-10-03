# ADR 0008 — Invitation Data Mode, Guest Context & Preview (Fase 8)

- **Status:** Accepted
- **Fase:** F8
- **Requirement terkait:** FR-INV-001..003, FR-GST-001 (CRUD minimum), FR-GST-002, FR-GST-003, FR-PRV-001, FR-VAR-002, P-02, P-04, AC-02, AC-03, AC-06

## Konteks

Template (design) dan data klien harus terpisah total (P-02). Operator harus bisa membuat
undangan dari template yang sudah dipublish dan mengisi data **tanpa Design Mode**. Preview harus
memakai renderer HTML yang sama dengan runtime publik, bukan screenshot Konva (P-04).

## Keputusan

1. **Invitation mem-pin satu `TemplateVersion` immutable.** `createInvitation` selalu memakai
   `publishedVersionNo` terbaru saat dibuat; republish template **tidak** mengubah undangan lama.
   Template yang belum pernah dipublish ditolak (`TemplateNotPublishedError`). Template dari
   workspace lain diperlakukan seperti tidak ada.
2. **Data klien hanya di `invitations.data`.** Tidak ada fungsi di service invitation yang menulis
   ke `templates`/`template_versions` (dibuktikan test AC-03: draft, revision, dan versions
   identik sebelum/sesudah). Tidak ada migrasi DB baru: tabel `invitations`/`guests` sudah ada dari F1.
3. **Autosave Data Mode = parse form → validasi → simpan sebagian.** Nilai mentah string dikonversi
   `parseFormSubmission` per `VariableDefinition`. Nilai bertipe salah **tidak disimpan** namun
   dilaporkan; required yang kosong **tidak memblokir simpan** (hanya memblokir publish di F9 lewat
   `getInvitationReadiness`). Klien memanggil server action dengan debounce 800 ms
   (NFR-PERF-003) dan memakai sequence guard agar respons lama tidak menimpa edit baru.
4. **`guest.name` hanya dari guest context.** Key `guest.*` tidak pernah diterima dari form/data
   (variabel `guest-context` tidak punya field). Preview memilih konteks: `generic` (tanpa tamu →
   fallback), `sample` (nama contoh), atau tamu nyata.
5. **Guest token opaque.** `generateGuestTokenId()` (16 byte acak, base64url, unik di DB).
   Hapus tamu = soft archive (token tetap tercadangkan; tidak bisa dipakai ulang).
   CSV import ditunda ke F10.
6. **`DocumentRenderer` (HTML/DOM) di `features/renderer`.** Mengonsumsi `ResolvedDocument`,
   dipakai preview sekarang dan halaman publik di F9. Frame = kotak absolut koordinat 390 px,
   rotasi `transform: rotate()` pivot tengah (ADR 0005). Teks dirender sebagai text node React
   (selalu di-escape); teks beranimasi lewat `AccessibleAnimatedText`; widget lewat `WidgetRuntime`
   (fallback terlihat hanya di mode `preview`). Skala viewport (`clamp(viewport/390)`) menyusul di F9.
7. **Otorisasi.** Capability baru `invitation:read` / `invitation:write` untuk owner, admin,
   designer, dan operator. Operator tetap **tidak** boleh upload asset (kontrak F5 dipertahankan)
   tetapi dapat memilih asset `ready` di Data Mode. Akses by-id memakai pola yang sama dengan
   template: non-member → NotFound (eksistensi tidak bocor), member tanpa hak → Forbidden.
8. **Audit.** `invitation.create|rename|archive` dan `guest.create|archive` ditambahkan ke
   `AUDIT_ACTIONS` (FR-AUD-001).

## Konsekuensi

- F9 dapat memakai `DocumentRenderer` + `getInvitationReadiness` untuk publish snapshot tanpa
  mengubah kontrak F8.
- Editor koleksi (JSON textarea) tetap sederhana; UI list builder adalah utang non-blocking.
- `AnimatedElement` kini menerima elemen resolved (hanya `id` + `animations` yang dibaca).

## Alternatif yang ditolak

- Menyimpan nilai tidak valid supaya input pengguna tidak hilang: menolak karena membuat
  `invitations.data` tidak lagi dapat dipercaya saat publish.
- Preview berbasis Konva: melanggar P-04 (preview harus production-equivalent).
