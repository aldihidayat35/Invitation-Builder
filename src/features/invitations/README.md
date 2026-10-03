# features/invitations

Invitation instance, Data Mode, guest context, preview, publish snapshot. **Fase target: F8, F9** (CSV guest F10).

- PRD: FR-INV-001..004, FR-GST-001..003, FR-PRV-001, FR-PUB-001..003, P-02, P-06, AC-02/03/06/09/10.
- Invitation menyimpan `templateVersionId` + `dataValues`; data klien **tidak pernah** ditulis ke template.
- Publish membuat published snapshot immutable; save draft tidak mengubah live page.
- Fase 0: kosong.
