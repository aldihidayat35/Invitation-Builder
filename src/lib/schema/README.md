# lib/schema

Kontrak runtime (Zod) untuk canonical document, variable, binding, widget props, API payload. **Fase target: F1** (fondasi F0).

- PRD: P-03, FR-TPL-002, FR-VAR-001..003, §15.2, §15.3, NFR-SEC-001, AC-14.
- Dokumen wajib memiliki `schemaVersion`; perubahan breaking butuh migration pure + fixture test.
- Dilarang: field yang berisi function, raw script, inline handler, atau kode eval-able.
- Fase 0: hanya `constants.ts` (base width 390, viewport 320–430, default section height 844).

## Fase 1 contents

- `document.ts` CanonicalDocumentV1; `migrate.ts` `migrateDocument(input) -> latest`.
- `semantics.ts` binding/widget semantic validation; `binding-compat.ts` type matrix.
- `url.ts` safe URL validator; `coordinate.ts`, `frame.ts`, `asset.ts`.
- See ADR 0003.
