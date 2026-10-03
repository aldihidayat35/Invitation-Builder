# ADR 0010 — Widget P1 (RSVP, Gallery, Music, Gift), RSVP API & CSV import

- Status: Accepted (Fase 10)
- PRD: FR-WDG-005..008, FR-GST-001, analytics events `map_clicked`, `rsvp_submitted`, `music_played`

## Keputusan

1. **Semua lewat registry.** `rsvp`, `gallery`, `music`, `gift` didefinisikan di
   `widgets/definitions-p1.ts` dan didaftarkan di `defaultWidgetRegistry`; sidebar editor,
   inspector, placeholder Konva, validasi semantik, dan `WidgetRuntime` otomatis mengenalinya.
   Tidak ada kode khusus template. Control inspector baru: `boolean`, `number`, `binding`
   (prop `collection` hanya bisa di-bind ke variabel koleksi; isi data lewat Data Mode).
2. **Konten via koleksi.** Gallery membaca item `{assetId | src, alt}`; Gift membaca
   `{bank, accountNumber, accountName}`. Runtime memilih field secara eksplisit dan menolak
   `src` non-http(s)/non-relatif (mis. `javascript:`).
3. **RSVP API publik** `POST /api/public/rsvp` (`features/rsvp/handler.ts`): wajib JSON, body ≤ 8 KB,
   skema Zod strict, rate limit in-memory 10/menit per (IP + slug) → 429 + `Retry-After`,
   pesan error generik (tanpa stack/SQL/id). Hanya undangan `published` yang menerima RSVP.
4. **Kebijakan idempotensi.** Token tamu valid (undangan yang sama, tidak diarsipkan) → tepat satu
   RSVP per tamu; kirim ulang = _update_; nama tersimpan = nama tamu (bukan input klien);
   `partySize` ≤ `guest.maxParty`; tamu ditandai `responded`. Tanpa token → dedupe per nama
   (case-insensitive). Token tak dikenal/asing diperlakukan sebagai tanpa token. Tidak ada migrasi DB.
5. **Konteks publik di widget.** `PublicContextProvider` (slug, token, nama tamu) hanya dipasang
   oleh `/i/[slug]`; di preview/editor RSVP tampil tetapi tombol kirim nonaktif.
6. **Dashboard RSVP** `/dashboard/invitations/[id]/rsvp`: total hadir/tidak hadir/jumlah orang dan
   daftar respons; capability `invitation:read`, scoping workspace seperti fitur invitation lain.
7. **Import CSV tamu** (`invitations/csv.ts` murni + `guest-import.ts`): delimiter `, ; tab`,
   kutip/escape, auto-deteksi header (`nama`, `jumlah`), pratinjau dry-run → konfirmasi; duplikat
   (di file & terhadap tamu yang ada, case-insensitive) dilewati, baris tidak valid dilaporkan,
   maks 500 baris / 200 KB, satu transaksi + audit `guest.import`.
8. **Analytics hooks** `features/analytics/track.ts`: `CustomEvent("dib:analytics")` tanpa PII;
   sink dapat dipasang kemudian. Dipanggil dari Map (klik), RSVP (sukses kirim), Music (play sukses).
9. **Musik.** `preload="none"`, tombol play/pause selalu ada, autoplay hanya dicoba setelah gestur
   pertama pengguna dan kegagalan ditelan (status "Musik tidak dapat diputar").

## Utang / catatan

- Batas waktu RSVP (`deadline`) dievaluasi di klien; penegakan server-side menyusul (F11).
- Rate limiter per-proses; instance banyak butuh store bersama (F11/F12).
- Pemilihan foto Gallery lewat JSON/koleksi (belum ada picker asset per item).
