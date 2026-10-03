# features/widgets

Widget registry dan widget runtime/editor. **Fase target: F6** (P0: map, countdown, guestGreeting), **F10** (P1: rsvp, gallery, music, gift).

- PRD: FR-WDG-001..008, P-05, P-09, §11, NFR-REL-002, AC-04..06.
- Registry memetakan `type` → props schema (Zod), editor placeholder, runtime component, default frame, migrateProps.
- Tema hanya menyimpan `widgetType + props + style overrides`. Unknown widget → safe fallback.
- Setiap widget runtime dibungkus error boundary.
- Fase 0: kosong.
