# Feature: Animations (Fase 7)

Modul sistem animasi deklaratif (PRD §12, FR-ANM-001..006, AC-07, AC-13, NFR-A11Y-001).

## Arsitektur

1. **Preset Registry** (`definitions.ts`, `registry.ts`):
   - Definisi preset berupa data murni (P-09), terpisah dari engine runtime GSAP.
   - Presets: P0 enter (`fadeIn`, `slideUp`, `slideDown`, `slideLeft`, `slideRight`, `zoomIn`, `rotateInSoft`), Text (`charFade`, `charRise`, `wordReveal`, `letterSpread`), Attention (`float`, `pulseSoft`, `sway`), Exit (`fadeOut`, `slideOut`, `zoomOut`).
   - Seluruh animasi adalah transform/opacity-first (GPU-accelerated, tanpa layout thrashing).

2. **Accessible Text Splitting** (`text-splitter.tsx`):
   - `AccessibleAnimatedText` memecah teks per karakter (`data-anim-char`) atau per kata (`data-anim-word`).
   - Mempertahankan integritas screen reader 100% menggunakan `role="text"` dan `aria-label`, dengan visual `aria-hidden="true"`.

3. **Accessibility Adapter** (`reduced-motion.ts`):
   - Mendeteksi `prefers-reduced-motion: reduce`.
   - Mengubah durasi/delay/stagger menjadi 0 agar konten langsung tampil tanpa delay.

4. **Runtime Engine** (`runtime.ts`):
   - Menggunakan GSAP untuk menjalankan animasi berdasarkan pemicu (`onLoad`, `onEnterViewport` via `IntersectionObserver`, `onClick`).
   - Cleanup otomatis saat unmount (membunuh tween dan memutuskan observer).

5. **Editor Canvas Replay** (`konva-replay.ts`):
   - Memutar ulang animasi langsung pada node Konva di artboard canvas tanpa mengubah dokumen kanonik.
