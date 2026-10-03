# features/invitations

Invitation instance, Data Mode, guest context, preview, publish snapshot. **Fase target: F8, F9** (CSV guest F10).

- PRD: FR-INV-001..004, FR-GST-001..003, FR-PRV-001, FR-PUB-001..003, P-02, P-06, AC-02/03/06/09/10.
- Invitation menyimpan `templateVersionId` + `data` (nilai variable); data klien **tidak pernah** ditulis ke template.
- Publish membuat published snapshot immutable; save draft tidak mengubah live page.

## Status

- **F8 (selesai):** buat undangan dari template version terpublish, Data Mode (form dari
  `VariableDefinition`, autosave), readiness (required) report, guest CRUD minimum dengan token
  opaque, preview via `DocumentRenderer` dengan konteks tamu generic/sample/nyata. Lihat
  `docs/decisions/0008-invitation-data-mode-and-guests.md`.
- **F9:** publish snapshot + `/i/[slug]`. **F10:** import CSV tamu, RSVP.

## Struktur

- `service.ts` — logika server-only dengan `db` + `actor` diinjeksi (dites langsung).
- `api.ts` — facade terikat sesi untuk page/server action (UI tidak menyentuh DB).
- `schemas.ts`, `types.ts` — validasi input & tipe publik.
- `components/` — `VariableFields`, `DataModeForm` (autosave), `GuestPanel`, `CreateInvitationForm`, `InvitationList`.
