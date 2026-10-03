# features/templates

Template library, draft lifecycle, dan template versioning. **Fase: F2 (selesai)**; editor visual di F4.

- PRD: FR-TPL-001..003, FR-AUD-001, P-06, §14, Lampiran B & C.
- Template draft mutable; template version **immutable** (tidak ada API update/delete version; trigger DB menolak UPDATE/DELETE).

## Struktur

- `service.ts` — logika berotorisasi (db di-inject): list, create, get, rename, duplicate, archive, saveDraft, publish, validate.
- `api.ts` — fasad `server-only` yang mengikat `requireUser` + `getDb()`; satu-satunya impor template untuk `src/app`.
- `components/` — UI (client-safe); tidak mengimpor DB.
- `index.ts` — export client-safe saja.

## Kebijakan

- Operasi by-id oleh non-member → NotFound (tidak membocorkan keberadaan); by-workspace → Forbidden.
- Save draft memakai optimistic concurrency (`revision`); konflik → `RevisionConflictError`.
- Publish: satu transaksi + row lock, `versionNo` naik, audit log; ditolak bila draft belum berubah sejak publish terakhir.
- Widget tak dikenal = publish blocker (registry produksi kosong sampai F6).
- Archive soft; restore belum ada.
