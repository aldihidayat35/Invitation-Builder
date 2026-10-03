# Requirements Traceability Matrix

Sumber: `docs/PRD_BASELINE.md` (PRD v1.0, baseline 3 Oktober 2026).
Fase target mengacu pada `Prompt_Implementasi_Bertahap_Digital_Invitation_Builder_v1.0.md`.

**Legenda status:** `Not started` � `In progress` � `Foundation` (fondasi/keputusan tercatat, fitur belum) � `Done` (acceptance terpenuhi & teruji)

**Legenda test target:** U = Unit � C = Component � I = Integration � E = E2E � V = Visual regression � P = Performance � S = Security � M = Migration � D = Dokumentasi/verifikasi manual

> Kelengkapan matrix ini diverifikasi otomatis oleh `tests/unit/requirements-matrix.test.ts`
> (setiap requirement ID di PRD baseline wajib muncul di tabel ini).

## 1. Prinsip Produk (PRD �5)

| Requirement ID | Ringkasan                                                                           | Fase target | Test target | Status                                         |
| -------------- | ----------------------------------------------------------------------------------- | ----------- | ----------- | ---------------------------------------------- |
| P-01           | PRD adalah source of truth; implementasi/test/scope traceable ke requirement PRD    | F0 (semua)  | U, D        | Foundation                                     |
| P-02           | Data klien (nama, tanggal, lokasi, foto, tamu) terpisah dari desain; tidak hardcode | F3, F8      | U, I, E     | In progress                                    |
| P-03           | Canonical JSON model, versionable, tervalidasi                                      | F0, F1, F3  | U, M        | Foundation                                     |
| P-04           | Public invitation = DOM/HTML/CSS; canvas hanya alat editor                          | F0, F9      | E, V        | Foundation                                     |
| P-05           | Reusable widgets: tema hanya menyimpan widget type + props + style overrides        | F6, F10     | U, C        | Done (F5/F6)                                   |
| P-06           | Immutable publish: setiap publish menciptakan snapshot tak berubah                  | F2, F9      | I, E        | In progress (template version=F2, snapshot=F9) |
| P-07           | Mobile-first: canonical artboard 390 px; target 320�430 px                          | F0, F4, F9  | U, V        | Foundation                                     |
| P-08           | Progressive enhancement: fitur non-esensial tidak memblokir konten utama            | F7, F9, F10 | E, P        | In progress (F7 non-blocking)                  |
| P-09           | Safe extensibility via registry/schema, bukan conditional tersebar                  | F0, F6, F7  | U, D        | Done (F5/F6/F7)                                |

## 2. Baseline non-ID (PRD �5.1, �25)

| Requirement ID | Ringkasan                                                                                                      | Fase target | Test target | Status                      |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ----------- | --------------------------- |
| STACK (�5.1)   | Next.js + React + TS strict; React-Konva editor; Zustand; GSAP; PostgreSQL + satu ORM; S3; Zod; CSS terkontrol | F0, F1      | D           | Foundation (ORM & DB di F1) |
| DOD (�25.1)    | Definition of Done: req ID di PR, lint/typecheck/test lulus, server validation, states, tanpa hardcode         | F0 (semua)  | D (CI)      | Foundation                  |
| CR (�25.2)     | Change Control: perubahan via Change Request eksplisit                                                         | Semua       | D           | Foundation                  |

## 3. Functional Requirements (PRD �8)

| Requirement ID | Ringkasan                                                                                                      | Prioritas | Fase target                            | Test target | Status                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------- | ----------- | ------------------------------------------------------------------ |
| FR-AUTH-001    | Login/logout, sesi aman; dashboard terlindungi; public tanpa login                                             | P0        | F2                                     | I, E, S     | Done                                                               |
| FR-TPL-001     | Create, rename, duplicate, archive, open template draft                                                        | P0        | F2                                     | I, E        | Done                                                               |
| FR-TPL-002     | Template disimpan sebagai JSON tervalidasi; payload invalid ditolak                                            | P0        | F1, F2                                 | U, I        | Done                                                               |
| FR-TPL-003     | Publish template ? immutable version; versi lama tetap terbaca                                                 | P0        | F2                                     | I           | Done                                                               |
| FR-INV-001     | Buat invitation dari template version (templateVersionId + dataValues)                                         | P0        | F8                                     | I, E        | Done (F8)                                                          |
| FR-INV-002     | Form data dibangun dari variable schema (type, required, default, validation)                                  | P0        | F3, F8                                 | U, C        | Done (F8)                                                          |
| FR-INV-003     | Preview dengan sample guest/data memakai renderer HTML production-equivalent                                   | P0        | F8                                     | E           | Done (F8)                                                          |
| FR-INV-004     | Publish ? snapshot immutable + public slug; draft tidak mengubah live                                          | P0        | F9                                     | I, E        | Done (F9)                                                        |
| FR-EDT-001     | Artboard zoom (25�200%), pan, center; tidak mengubah saved coordinates                                         | P0        | F4                                     | U, E        | Done                                                               |
| FR-EDT-002     | Select, multi-select, drag, resize, rotate; tersimpan & undoable                                               | P0        | F4                                     | U, E        | Done                                                               |
| FR-EDT-003     | Duplicate, delete, lock, hide, reorder layer; tercermin di editor & renderer                                   | P0        | F4                                     | U, E        | Done                                                               |
| FR-EDT-004     | Undo/redo minimal 50 history actions                                                                           | P0        | F4                                     | U           | Done                                                               |
| FR-EDT-005     | Snapping & alignment guides (center/edges/tetangga)                                                            | P1        | F4                                     | U           | In progress                                                        |
| FR-EDT-006     | Tambah text, image, rectangle, circle, line, icon/decorative asset                                             | P0        | F4, F5                                 | C, E        | In progress                                                        |
| FR-EDT-007     | Typography: font family, size, weight, line-height, letter spacing, align, color, opacity                      | P0        | F4                                     | C, V        | In progress                                                        |
| FR-EDT-008     | Image: upload, replace, crop/focal, fit mode, radius, opacity                                                  | P0        | F5                                     | C, I        | Done (F5/F6)                                                       |
| FR-EDT-009     | Section: add, reorder, duplicate, delete, height/background; urutan = urutan scroll publik                     | P0        | F4                                     | U, E        | Done                                                               |
| FR-VAR-001     | Variable types: text, richText-limited, number, date, datetime, image, url, color, boolean, coordinate, select | P0        | F1, F3                                 | U           | Done                                                               |
| FR-VAR-002     | Text & widget props binding ke variable; data berubah ? preview berubah                                        | P0        | F1, F3                                 | U, E        | Done (F8)                                                          |
| FR-VAR-003     | Binding fallback/default + formatter; optional missing tidak merusak layout                                    | P1        | F1, F3                                 | U           | Done                                                               |
| FR-WDG-001     | Widget registry: type ? props schema, editor config, runtime component                                         | P0        | F1, F6                                 | U           | Done (F5/F6)                                                       |
| FR-WDG-002     | Map widget: lat/lng + label; klik membuka Google Maps                                                          | P0        | F6                                     | C, E        | Done (F5/F6)                                                       |
| FR-WDG-003     | Countdown: target datetime + timezone; state setelah waktu lewat                                               | P0        | F6                                     | U, C        | Done (F5/F6)                                                       |
| FR-WDG-004     | Guest Greeting: nama tamu dari guest context + fallback                                                        | P0        | F6                                     | C, E        | Done (F5/F6)                                                       |
| FR-WDG-005     | RSVP: hadir/tidak, nama, jumlah tamu, pesan; tersimpan & idempotent                                            | P1        | F10                                    | C, I, S     | Not started                                                        |
| FR-WDG-006     | Gallery grid/slider; lazy loading & optimization                                                               | P1        | F10                                    | C, P        | Not started                                                        |
| FR-WDG-007     | Music play/pause; autoplay mengikuti kebijakan browser; gagal tidak memblokir                                  | P1        | F10                                    | C, E        | Not started                                                        |
| FR-WDG-008     | Gift: rekening/e-wallet dari variables + copy action & feedback                                                | P1        | F10                                    | C           | Not started                                                        |
| FR-ANM-001     | Enter animation: fade, slide, zoom, rotate-soft                                                                | P0        | F7                                     | U, C        | Done (F7)                                                          |
| FR-ANM-002     | Attention/loop animation; tidak memblokir scroll; reduced-motion                                               | P1        | F7                                     | U, C        | Done (F7)                                                          |
| FR-ANM-003     | Exit animation dengan trigger terdefinisi                                                                      | P1        | F7                                     | U, C        | Done (F7)                                                          |
| FR-ANM-004     | Text stagger per character/word; tetap terbaca screen reader                                                   | P0        | F7                                     | C           | Done (F7)                                                          |
| FR-ANM-005     | Atur duration, delay, easing, stagger amount, trigger                                                          | P0        | F7                                     | U           | Done (F7)                                                          |
| FR-ANM-006     | Trigger onLoad, onEnterViewport, onClick; deterministik & dapat dipreview                                      | P0        | F7                                     | C, E        | Done (F7)                                                          |
| FR-GST-001     | Guest CRUD + bulk import CSV dengan validasi duplikat & summary                                                | P1        | F8 (CRUD minimum), F10 (CSV)           | I, E        | In progress (CRUD minimum Done F8; CSV=F10)                        |
| FR-GST-002     | Token/slug guest opaque, tidak sequential id                                                                   | P0        | F8                                     | U, S        | Done (F8)                                                          |
| FR-GST-003     | Guest context tersedia ke variables/widget (guest.name)                                                        | P0        | F8                                     | U, E        | Done (F8)                                                          |
| FR-AST-001     | Upload image/audio; validasi MIME/size; object storage                                                         | P0        | F1, F5                                 | I, S        | Done (F5/F6)                                                       |
| FR-AST-002     | Asset library search/filter & reuse                                                                            | P1        | F5                                     | C, I        | Done (F5/F6)                                                       |
| FR-PUB-001     | Public URL slug unik; collision ditangani                                                                      | P0        | F9                                     | U, I        | Done (F9)                                                        |
| FR-PUB-002     | Draft dan published state terpisah                                                                             | P0        | F9                                     | I, E        | Done (F9)                                                        |
| FR-PUB-003     | Rollback ke snapshot sebelumnya dengan audit trail                                                             | P1        | F9                                     | I           | Done (F9)                                                        |
| FR-PRV-001     | Preview pilih guest sample & viewport mobile; data context identik runtime                                     | P0        | F8                                     | E           | Done (F8; viewport mobile 390px, scaling=F9)                       |
| FR-SET-001     | Design tokens template (font, colors, spacing) ? CSS variables untuk widget                                    | P1        | F1 (schema ThemeTokens), F6 (CSS vars) | U, C        | Not started                                                        |
| FR-AUD-001     | Audit publish, rollback, delete/restore (actor, action, entity, timestamp)                                     | P1        | F2                                     | I           | In progress (publish/archive/duplicate/login; rollback/delete=F9+) |

> Catatan: FR-SET-001 tidak disebut eksplisit pada PRD TARGET fase mana pun di playbook.
> Penempatan F1/F6 adalah usulan pemetaan berdasarkan dependency (ThemeTokens di Fase 1,
> CSS variables widget di Fase 6) � bukan perubahan scope.

## 4. Non-Functional Requirements (PRD �18)

| Requirement ID | Ringkasan                                                                  | Prioritas | Fase target | Test target | Status       |
| -------------- | -------------------------------------------------------------------------- | --------- | ----------- | ----------- | ------------ |
| NFR-PERF-001   | Public page interaktif cepat; critical content tidak menunggu galeri/audio | P0        | F9, F11     | P, E        | In progress (F9 lazy-load; F11)  |
| NFR-PERF-002   | Editor drag/resize ~60fps dengan ~100 elemen per section                   | P0        | F4, F11     | P           | Not started  |
| NFR-PERF-003   | Autosave debounce 0.8�2 dtk; tidak POST per pointer move                   | P0        | F4          | U           | Not started  |
| NFR-REL-001    | Published snapshot dirender deterministik setelah restart/deploy           | P0        | F1, F9      | M, I        | In progress  |
| NFR-REL-002    | Kegagalan satu widget tidak membuat page blank                             | P0        | F6, F9      | C           | Not started  |
| NFR-SEC-001    | Tidak ada arbitrary script/HTML dari data user                             | P0        | F1, F11     | U, S        | In progress  |
| NFR-SEC-002    | Upload divalidasi server; URL akses mengikuti storage policy               | P0        | F5, F11     | I, S        | Done (F5/F6) |
| NFR-A11Y-001   | Semantic text, tombol keyboard accessible, alt text, reduced motion        | P1        | F7, F11     | C, E        | In progress (text & reduced-motion F7) |
| NFR-COMP-001   | Chrome Android, Safari iOS, Chromium modern                                | P0        | F11         | E           | Not started  |
| NFR-OBS-001    | requestId + structured logging untuk error penting                         | P1        | F11, F12    | I           | Not started  |
| NFR-BACKUP-001 | Strategi backup & restore terdokumentasi sebelum production                | P1        | F12         | D           | Not started  |

## 5. Acceptance Criteria (PRD �23)

| Requirement ID | Ringkasan                                                                                  | Fase target         | Test target | Status              |
| -------------- | ------------------------------------------------------------------------------------------ | ------------------- | ----------- | ------------------- |
| AC-01          | Template =3 section dengan text, image, shape, map, countdown, guest greeting tanpa coding | F4�F6, F11          | E           | Not started         |
| AC-02          | Ganti nama pengantin di form ? semua elemen terikat berubah                                | F8                  | E           | Done (F8)           |
| AC-03          | Satu template ? dua invitation berbeda data tanpa saling memengaruhi                       | F8                  | I, E        | Done (F8)           |
| AC-04          | Map widget membuka Google Maps ke koordinat yang benar                                     | F6                  | C, E        | Done (F5/F6)        |
| AC-05          | Countdown sesuai timezone terpilih                                                         | F6                  | U, C        | Done (F5/F6)        |
| AC-06          | Guest link A dan B menampilkan nama tamu berbeda                                           | F6, F8              | E           | Done (F8)           |
| AC-07          | Text animasi masuk per huruf + replay di preview                                           | F7                  | C, E        | Done (F7)           |
| AC-08          | Dekorasi drag, resize, rotate, reorder, lock, hide di editor                               | F4                  | E           | Done                |
| AC-09          | Publish ? URL publik tanpa login                                                           | F9                  | E           | Done (F9)         |
| AC-10          | Edit draft setelah publish tidak mengubah live sampai republish                            | F9                  | E           | Done (F9)         |
| AC-11          | Public page HTML/DOM; text bukan bitmap/canvas                                             | F0 (smoke), F9      | E           | Done (F9) |
| AC-12          | Tanpa overflow horizontal di 320/375/390/414/430                                           | F0 (smoke), F9, F11 | E, V        | In progress (F9: skala CSS; QA visual=F11) |
| AC-13          | prefers-reduced-motion: konten tetap terlihat & usable                                     | F7, F11             | E           | In progress (runtime F7) |
| AC-14          | Document JSON invalid ditolak server dengan error per field/element                        | F1, F2, F11         | U, I        | In progress         |
| AC-15          | E2E golden path berjalan di CI sebelum release                                             | F11, F12            | E (CI)      | Not started         |

## 6. Riwayat update

| Tanggal    | Fase  | Perubahan                                                                                                                                                                                          |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-03 | F0    | Matrix awal dibuat; status fondasi untuk P-01/03/04/06/07/09, STACK, DOD                                                                                                                           |
| 2026-10-03 | F1    | Schema/DB/migrator selesai: FR-TPL-002, FR-VAR-001..003, FR-WDG-001, FR-AST-001 (kontrak saja), NFR-REL-001, NFR-SEC-001, AC-14 -> In progress (API=F2, UI=F3/F5/F6)                               |
| 2026-10-03 | F2    | Auth sesi server-side, otorisasi workspace, Template Library, publish immutable, audit log, validate API: FR-AUTH-001, FR-TPL-001..003 Done; FR-AUD-001 & P-06 partial                             |
| 2026-10-03 | F3    | Engine resolver/formatter/registry/form + playground: FR-VAR-001, FR-VAR-003 Done; FR-VAR-002, FR-INV-002, P-02 In progress (preview=F7, Data Mode UI=F8)                                          |
| 2026-10-03 | F4    | Editor core (sections, elemen, undo/redo, autosave, shortcut): FR-EDT-001..004, 009, AC-08 Done; FR-EDT-005 (snap tepi/tengah), 006 (tanpa image/icon), 007 In progress                            |
| 2026-10-03 | F5/F6 | Asset pipeline + P0 widgets (map, countdown, guestGreeting): FR-EDT-008, FR-AST-001/002, NFR-SEC-002, FR-WDG-001..004, AC-04..06, P-05, P-09 -> Done. AC-06 e2e dengan link tamu nyata menunggu F8 |
| 2026-10-03 | F7    | Sistem animasi: FR-ANM-001..006, AC-07, P-09 Done; AC-13 & NFR-A11Y-001 partial (runtime reduced-motion & accessible text); P-08 in-progress (non-blocking animation)                  |
| 2026-10-03 | F8    | Invitation Data Mode, guest CRUD minimum (token opaque), preview via DocumentRenderer HTML: FR-INV-001..003, FR-GST-002/003, FR-PRV-001, FR-VAR-002, AC-02, AC-03, AC-06 Done; FR-GST-001 partial (CSV=F10) |
| 2026-10-03 | F9    | Public renderer (skala CSS 320-430), `/i/[slug]` dari snapshot aktif, publish/republish/rollback: FR-INV-004, FR-PUB-001..003, AC-09, AC-10, AC-11 Done; AC-12, NFR-PERF-001 In progress (QA visual/perf=F11); NFR-REL-001 (error boundary per widget) |
