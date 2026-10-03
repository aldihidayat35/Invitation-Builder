# ADR 0001 — Architecture Baseline

- **Status:** Accepted
- **Tanggal:** 2026-10-03
- **Fase:** 0 — Bootstrap dan Requirement Traceability
- **Requirement terkait:** P-01, P-03, P-04, P-06, P-07, P-09, PRD §5.1 (Baseline Technology Stack), §13, §14, §15, §25

## Konteks

PRD v1.0 (`docs/PRD_BASELINE.md`) adalah source of truth. Produk harus memisahkan
design model, content data, functional widgets, dan runtime renderer (PRD §2.1).
Keputusan di ADR ini **mencatat** keputusan PRD — tidak mengubahnya.

## Keputusan

### 1. Canonical JSON model (P-03, §15.2, §15.3)

- Template dan invitation design disimpan sebagai **JSON deklaratif** yang
  memiliki `schemaVersion` wajib dan divalidasi **Zod** di client dan server.
- Database **tidak pernah** menyimpan function, React component terserialisasi,
  raw script, inline event handler, atau kode yang dapat di-`eval`.
- Perubahan breaking pada schema memerlukan migration function yang pure dan
  test fixture. Published snapshot lama harus tetap dapat dirender.
- Lokasi kontrak: `src/lib/schema` (diisi pada Fase 1).

### 2. React-Konva hanya untuk interaksi editor (§5.1, P-04)

- React-Konva dipakai sebagai **editor interaction surface**: select, drag,
  resize, rotate, guides.
- Konva **bukan** output final. Editor menulis perubahan ke canonical JSON;
  canvas hanyalah proyeksi untuk manipulasi.
- Lokasi: `src/features/editor` (diisi pada Fase 4).

### 3. HTML renderer sebagai runtime publik dan preview (P-04, §13, AC-11)

- Public invitation dirender sebagai **DOM/HTML/CSS**. Text adalah HTML text
  (selectable, tajam), widget adalah DOM components.
- Preview sebelum publish menggunakan **renderer yang sama** dengan
  `runtimeMode=preview`.
- CSS renderer terisolasi (CSS Modules + CSS variables) agar style dashboard
  tidak bocor ke halaman publik (§5.1).
- Lokasi: `src/features/renderer`. Fase 0 hanya menyediakan smoke route
  `/smoke/renderer` tanpa logic bisnis.

### 4. Canonical base width 390 px (P-07, §9.3, §13)

- Semua koordinat disimpan relatif ke artboard **390 px**, bukan koordinat layar
  editor setelah zoom.
- Target viewport utama **320–430 px**; runtime scale =
  `clamp(viewportWidth / 390, min, max)`; tinggi section = `baseHeight × scale`.
- Default section height 844 px.
- Konstanta tunggal: `src/lib/schema/constants.ts`.

### 5. Immutable publish (P-06, §14, FR-TPL-003, FR-INV-004, FR-PUB-002)

- Template draft mutable; **template version immutable**.
- Publish invitation membuat **published snapshot immutable**; republish membuat
  snapshot baru dan memindahkan pointer `activePublishedSnapshotId`.
- Save draft tidak pernah mengubah live page. Rollback tidak menghapus sejarah.

### 6. Extensibility via registry (P-05, P-09)

- Widget, element type, dan animation preset ditambahkan melalui
  **registry + typed schema**, bukan conditional logic tersebar.
- Lokasi: `src/features/widgets` (Fase 6), animation preset registry (Fase 7).

## Keputusan tooling Fase 0

| Area            | Pilihan                                                     | Alasan                                                                                     |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Framework       | Next.js 16 App Router + React 19 + TypeScript strict        | Diwajibkan PRD §5.1                                                                        |
| Package manager | **npm** + `package-lock.json`                               | Tersedia di environment; pnpm tidak terpasang. Satu lockfile saja                          |
| Styling         | **CSS Modules** + CSS variables (tanpa Tailwind)            | PRD mengizinkan Tailwind atau CSS Modules; CSS Modules memberi isolasi renderer yang ketat |
| Lint / format   | ESLint (eslint-config-next) + Prettier                      | Standar Next.js                                                                            |
| Unit test       | Vitest + Testing Library + jsdom                            | Cepat, kompatibel TS/ESM                                                                   |
| E2E             | Playwright                                                  | Mendukung emulasi viewport mobile (AC-12)                                                  |
| Cycle check     | madge `--circular`                                          | Acceptance gate "tidak circular"                                                           |
| Runtime libs    | Zod, Zustand, Konva/React-Konva, GSAP                       | Diwajibkan PRD §5.1; belum dipakai fitur di Fase 0                                         |
| ORM             | **Belum dipilih** — ditetapkan Fase 1 (Prisma ATAU Drizzle) | Prompt Fase 1 langkah 1; PRD §5.1 melarang mencampur                                       |

## Konsekuensi

- Setiap fitur baru wajib menautkan requirement ID (lihat `docs/requirements-matrix.md`).
- Perubahan yang bertentangan dengan keputusan di atas membutuhkan Change Request
  (PRD §25.2), bukan ADR baru.
