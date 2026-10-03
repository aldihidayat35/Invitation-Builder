# ADR 0007 — Sistem Animasi dan Aksesibilitas (Fase 7)

Status: Accepted · Tanggal: 2026-10-03 · PRD: FR-ANM-001..006, AC-07, AC-13, NFR-A11Y-001, P-08, P-09

## Keputusan

1. **Pemisahan definisi data preset dari implementasi engine**:
   Semua preset animasi (`fadeIn`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`, `zoomIn`, `rotateInSoft`, `charFade`, `charRise`, `wordReveal`, `letterSpread`, `float`, `pulseSoft`, `sway`, `fadeOut`, `slideOut`, `zoomOut`) didefinisikan sebagai data murni Zod di `src/features/animations/definitions.ts` dan didaftarkan ke `AnimationPresetRegistry` (`src/features/animations/registry.ts`). Penambahan preset di masa depan tidak memerlukan migrasi skema database (P-09).
2. **Transform/opacity-first (GPU accelerated)**:
   Seluruh keyframe preset hanya memodifikasi `opacity`, `x`, `y`, `scale`, `rotation`, dan `transformOrigin`. Sifat animasi layout-heavy (`width`, `height`, `top`, `left`, `margin`, `padding`) dilarang keras untuk mencegah reflow/jank (Rule 9, NFR-PERF-001).
3. **Pemisahan teks beraksesibilitas (Semantic Screen Reader Preservation)**:
   `AccessibleAnimatedText` memecah teks per karakter (`data-anim-char`) atau per kata (`data-anim-word`) untuk efek stagger/letter-by-letter. Aksesibilitas dijamin utuh bagi screen reader menggunakan atribut `aria-label` dan `role="text"` pada elemen pembungkus serta `aria-hidden="true"` pada container visual, mencegah pembacaan per huruf yang mengganggu (FR-ANM-004, NFR-A11Y-001).
4. **Dukungan `prefers-reduced-motion` wajib**:
   Adaptor `resolveReducedMotionBehavior` otomatis mendeteksi preferensi pengguna. Jika aktif, durasi, delay, dan stagger di-nolkan, dan loop dimatikan, sehingga konten langsung tampil instan tanpa transisi visual yang memicu gangguan vestibular (AC-13, NFR-A11Y-001).
5. **Runtime pemicu (Trigger Runtime)**:
   Mendukung `onLoad`, `onEnterViewport` (didukung `IntersectionObserver` dengan threshold 0.15 dan auto-disconnect saat `once: true`), serta `onClick`.
6. **Replay di Editor Canvas**:
   `replayKonvaNode` memutar ulang animasi langsung pada node Konva di artboard canvas tanpa perlu menyentuh dokumen atau memicu autosave. Replay dapat dijalankan untuk elemen tunggal terpilih maupun seluruh section aktif via event `dib:replay-animation`.

## Konsekuensi / utang

- Efek stagger teks pada canvas editor saat ini di-replay pada level frame elemen (visual stagger teks per huruf ditampilkan penuh pada HTML renderer / preview).
- Animasi bertipe `exit` dan chaining antar-track (`afterEnter`) disiapkan secara skema dan registry, integrasi UI inspektor difokuskan pada `enter` track sebagai P0.
