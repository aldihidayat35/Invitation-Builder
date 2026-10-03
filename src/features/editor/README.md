# features/editor

Canva-like design editor (Design Mode). **Fase target: F4** (lalu F5–F7 menambah image, widget, animation controls).

- PRD: FR-EDT-001..009, §9, §17, NFR-PERF-002, NFR-PERF-003, AC-08.
- React-Konva hanya **interaction surface**; perubahan selalu ditulis ke canonical JSON (`src/lib/schema`).
- State: Zustand dengan undo/redo terkontrol (≥50 actions). Transient transform terpisah dari committed document.
- Dilarang: menjadi dependency `features/renderer` (dijaga ESLint).
- Fase 0: kosong — **jangan** membuat editor palsu dengan data hardcode.
