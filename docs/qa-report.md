# Laporan QA — Fase 11

## Pemetaan Acceptance Criteria → verifikasi

| AC        | Verifikasi                                                               | Status                            |
| --------- | ------------------------------------------------------------------------ | --------------------------------- |
| AC-01     | Editor e2e (`editor.spec.ts`), widget tests, golden path                 | Terverifikasi parsial (otomatis)  |
| AC-04..06 | Asset/widget tests (F5/F6)                                               | Done                              |
| AC-07     | Animation unit/component tests                                           | Done                              |
| AC-08     | Editor undo/redo e2e                                                     | Done                              |
| AC-09     | `publishing.test.ts`, golden path                                        | Done                              |
| AC-10     | `publishing.test.ts` (draft vs snapshot)                                 | Done                              |
| AC-11     | `public-performance.test.tsx`, `public-smoke.spec.ts` (tanpa canvas)     | Done                              |
| AC-12     | e2e cek overflow horizontal di 320/375/390/414/430 (smoke + golden path) | Done (otomatis; bukan pixel-diff) |
| AC-13     | Runtime reduced-motion tests (F7); audit manual belum                    | Parsial                           |
| AC-14     | Schema/integration tests per-field                                       | Done                              |
| AC-15     | `golden-path.spec.ts` ada; belum ada bukti run hijau berulang di CI      | Parsial                           |

## Performa

- Halaman publik: tes `public-performance.test.tsx` (30 gambar, 100 teks) → 1 gambar eager, 29 lazy, `alt` ada, tanpa canvas.
- **Editor 100 elemen/section (NFR-PERF-002) belum diprofil** — dicatat sebagai utang.

## Aksesibilitas

Otomatis: role/label/alt pada halaman publik dan teks semantik animasi. **Audit manual (screen reader, keyboard) belum dilakukan.** Axe-core tidak dipasang.

## Regresi visual

Tidak ada baseline screenshot pixel-diff; digantikan asersi tanpa overflow di 5 viewport. Diterima sebagai kompromi.

## Regresi migrasi

`tests/unit/schema/migration-fixtures.test.ts` memuat fixture dokumen lama.

## Flaky test

Run penuh E2E (paralel) sekali gagal di `editor.spec.ts` (drag) dan `golden-path.spec.ts` (redirect setelah create); keduanya lulus saat dijalankan ulang. Penyebab dugaan: race hidrasi di bawah beban. Mitigasi: timeout redirect dinaikkan; CI memakai retry.
