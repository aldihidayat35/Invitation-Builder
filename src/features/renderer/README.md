# features/renderer

HTML/DOM renderer yang dipakai bersama oleh **preview** dan **public runtime**. **Fase target: F9** (fondasi di F0).

- PRD: P-04, §13, AC-11, AC-12, NFR-PERF-001, NFR-REL-001/002.
- Output wajib DOM/HTML/CSS — dilarang import `konva`, `react-konva`, atau `@/features/editor` (ESLint `no-restricted-imports`).
- CSS renderer terisolasi (CSS Modules + variabel `--dib-*`).
- Fase 0: `RendererViewport` (container DOM) + smoke route `/smoke/renderer`. Scaling `clamp(viewport/390)` di F9.
