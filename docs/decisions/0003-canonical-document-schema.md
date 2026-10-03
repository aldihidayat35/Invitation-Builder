# ADR 0003 — Canonical Document Schema v1

- **Status:** Accepted
- **Tanggal:** 2026-10-03
- **Fase:** 1
- **Requirement terkait:** P-03, FR-TPL-002, FR-VAR-001..003, FR-WDG-001, NFR-SEC-001, AC-14, PRD §15.2–15.3, Lampiran C

## Keputusan

1. **Strict objects.** Semua objek dokumen memakai `z.strictObject`; field tak
   dikenal (termasuk `script`, `html`, `onClick`, `eval`) ditolak. Inilah
   mekanisme "tidak ada raw script/eval field". Nilai JSON bebas (props widget)
   divalidasi `jsonValueSchema`: JSON polos, kunci terlarang (`__proto__`,
   `constructor`, `script`, `html`, `on*`), batas ukuran/kedalaman.
2. **Versi.** `schemaVersion` wajib; `LATEST_SCHEMA_VERSION = 1`.
   `migrateDocument(input) -> latest` (registry `DOCUMENT_MIGRATIONS`, kosong
   untuk v1). Input di-`structuredClone` (tidak memutasi sumber, menolak fungsi),
   hasil selalu di-parse schema terbaru. Versi lebih baru dari yang didukung ditolak.
3. **Frame.** `x,y,w,h,rotation` finite; `w,h > 0`; `rotation` default 0 (±360).
4. **baseWidth** `literal(390)`, default 390 (P-07).
5. **Namespace id.** Section dan element/widget berbagi satu namespace id;
   duplikat dilaporkan pada pemakai kedua. Urutan layer = urutan array.
6. **Widget tak dikenal valid secara struktural** (forward compatibility).
   Dilaporkan oleh validasi semantik (`unknown_widget_type`, pemblokir publish).
   Runtime/editor memakai `WidgetRegistry.resolve()` yang mengembalikan
   placeholder/fallback dan tidak pernah melempar.
7. **Widget catalog di-inject** ke `validateDocumentSemantics`, sehingga
   `src/lib/schema` tidak bergantung pada `src/features/widgets`.
8. **Binding.** `{bind, fallback?, hideWhenMissing?, formatter?}`; formatter
   whitelist (7), tanpa ekspresi. Matriks kompatibilitas tipe variabel ↔ slot
   (`binding-compat.ts`); formatter hanya untuk slot teks.
9. **URL aman.** Allow-list protokol (https/mailto/tel); tolak spasi/kontrol,
   backslash, `//`, kredensial. `javascript:`/`data:` ditolak.
10. **Aset.** SVG sengaja tidak diizinkan (dapat memuat script).
11. **Ikon/dekoratif** dimodelkan sebagai `ImageElement`; `group` ditunda
    (penambahan aditif, tidak butuh bump versi).
