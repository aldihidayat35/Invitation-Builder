**PRODUCT DOCUMENTATION**

Prompt Implementasi Bertahap

Digital Invitation Builder — prompt siap pakai untuk AI coding agent,
dengan PRD v1.0 sebagai acuan tetap

| **Versi**            | 1.0                                           |
|----------------------|-----------------------------------------------|
| **Tanggal baseline** | 3 Oktober 2026                                |
| **Status**           | Implementation Playbook                       |
| **Platform target**  | Web editor; output undangan HTML mobile-first |

*Dokumen ini menjadi acuan tetap untuk desain produk, implementasi,
pengujian, dan acceptance criteria. Perubahan ruang lingkup harus
melalui change request yang eksplisit.*

# Daftar Isi Ringkas

0\. Cara Menggunakan Dokumen Prompt

1\. Master Guardrails

2\. Format Laporan Setiap Fase

Fase 0 — Bootstrap dan Requirement Traceability

Fase 1 — Data Model, Schemas, dan Foundation

Fase 2 — Auth, Workspace, Template Library

Fase 3 — Canonical Document Engine dan Variable Binding

Fase 4 — Editor Core

Fase 5 — Asset Pipeline dan Image Elements

Fase 6 — Widget Registry dan P0 Widgets

Fase 7 — Animation System

Fase 8 — Invitation Data Mode, Guest Context, Preview

Fase 9 — HTML Public Renderer dan Publishing

Fase 10 — P1 Widgets: RSVP, Gallery, Music, Gift

Fase 11 — Hardening, Performance, Security, QA

Fase 12 — Production Readiness dan Release

Lampiran — Prompt Change Request, Bugfix, dan Code Review

# 0. Cara Menggunakan Dokumen Prompt

Dokumen ini dibagi menjadi fase yang sengaja berurutan. Setiap fase
dapat diberikan kepada AI coding agent sebagai prompt terpisah.
PRD_Digital_Invitation_Builder_v1.0.docx harus tersedia di context agent
atau diubah menjadi teks/markdown di repository, tetapi isi dan
requirement ID-nya tidak boleh diubah oleh agent tanpa Change Request
resmi.

- Jalankan fase secara berurutan. Jangan melompat kecuali dependency
  fase berikutnya sudah tersedia dan acceptance gate fase sebelumnya
  lulus.

- Di awal setiap fase, agent wajib membaca PRD baseline dan file hasil
  fase sebelumnya yang relevan.

- Jika prompt fase dan PRD berbeda, PRD menang.

- Jika requirement ambigu, pilih implementasi paling sederhana yang
  tetap memenuhi PRD; catat asumsi sebagai ADR/decision log, jangan
  mengubah product behavior sendiri.

- Setiap fase harus berakhir dengan typecheck, lint, tests yang relevan,
  dan ringkasan file yang berubah.

- Jangan menambahkan fitur “nice to have” yang tidak ada di scope fase
  jika fitur itu menambah kompleksitas atau mengubah contract.

| **Acuan tetap:** Semua prompt di bawah menganggap PRD v1.0 sebagai source of truth. Requirement IDs seperti FR-EDT-001 dan AC-10 harus tetap dipakai untuk traceability. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 1. Master Guardrails

Anda adalah senior full-stack engineer yang mengimplementasikan Digital
Invitation Builder. PRD v1.0 adalah source of truth dan tidak boleh
direinterpretasi secara bebas.  
  
ATURAN WAJIB:  
1) Gunakan Next.js + React + TypeScript strict.  
2) Public invitation harus dirender sebagai HTML/DOM/CSS, bukan
screenshot/canvas-only.  
3) Canonical design model adalah JSON deklaratif dan tervalidasi Zod.
Jangan menyimpan function, React component, raw script, atau eval-able
code di database.  
4) Editor boleh memakai React-Konva untuk manipulasi visual, tetapi
final preview wajib memakai HTML renderer yang sama dengan runtime
publik.  
5) Data klien terpisah dari template. Tidak boleh hardcode
nama/tanggal/lokasi klien ke reusable template.  
6) Widget menggunakan registry + typed prop schema. Jangan menduplikasi
logic widget per template.  
7) Publish membuat immutable snapshot. Save draft tidak boleh mengubah
live page.  
8) Canonical artboard width 390 px; output target 320–430 px.  
9) Semua write API divalidasi di server dan diautorisasi.  
10) Tidak ada arbitrary HTML/JS injection dari user.  
11) Implementasi harus menjaga backward compatibility schema atau
menyediakan migration + tests.  
12) Setiap perubahan harus dapat ditelusuri ke requirement ID PRD.  
13) Jangan menghapus test yang sudah ada untuk membuat build hijau.
Perbaiki root cause.  
14) Jangan membuat mock yang menutupi behavior produksi pada acceptance
path.  
15) Jika ada konflik requirement, hentikan bagian yang konflik,
dokumentasikan konflik, dan minta Change Request; lanjutkan bagian lain
yang tidak terblokir.  
  
QUALITY BAR:  
- TypeScript strict tanpa any yang tidak beralasan.  
- Error state, loading state, validation state tersedia.  
- Unit/integration/E2E sesuai risiko.  
- Accessibility dasar untuk public runtime.  
- Kode modular, tidak membangun satu komponen editor raksasa.  
- Dokumentasikan decision penting di docs/adr atau docs/decisions.

# 2. Format Laporan Setiap Fase

Pada akhir fase, jawab dengan format:  
A. Ringkasan implementasi  
B. Requirement PRD yang dipenuhi (ID)  
C. File/modul penting yang dibuat/diubah  
D. Database/schema migration  
E. Test yang dijalankan + hasil  
F. Acceptance gate fase: PASS/FAIL per item  
G. Risiko/utang teknis yang tersisa  
H. Instruksi menjalankan/verifikasi manual  
I. Apakah aman lanjut ke fase berikutnya: YA/TIDAK + alasan

# Fase 0 — Bootstrap dan Requirement Traceability

**TUJUAN**

Membuat fondasi repository yang stabil dan menjadikan PRD sebagai
artefak traceable sebelum fitur bisnis dibangun.

**PRD TARGET**

P-01, P-03, P-04, P-07, P-09, baseline technology stack, Definition of
Done.

**KERJAKAN**

1\. Inisialisasi Next.js App Router + React + TypeScript strict.

2\. Pilih satu package manager dan lockfile.

3\. Pasang linting, formatting, test runner, browser E2E runner, Zod,
Zustand, React-Konva, dan GSAP. Jangan membuat fitur editor dulu.

4\. Buat struktur modular awal: src/app, src/features/editor,
src/features/templates, src/features/invitations, src/features/widgets,
src/features/renderer, src/lib/schema, src/lib/db, src/lib/auth, tests.

5\. Buat docs/PRD_BASELINE.md sebagai representasi teks dari PRD yang
tersedia. Jangan meringkas requirement sampai kehilangan detail/ID.

6\. Buat docs/requirements-matrix.md: kolom Requirement ID, ringkasan,
fase target, test target, status.

7\. Buat docs/decisions/0001-architecture-baseline.md yang mencatat:
canonical JSON, React-Konva editor interaction, HTML renderer, base
width 390, immutable publish.

8\. Tambahkan scripts: typecheck, lint, test, test:e2e, build.

9\. Siapkan CI minimal yang menjalankan typecheck + lint + unit test +
build.

10\. Buat halaman placeholder dashboard dan public renderer smoke route
tanpa bisnis logic.

**JANGAN**

\- Jangan membuat database entity final sebelum Fase 1.

\- Jangan membuat editor palsu dengan hardcoded invitation data.

\- Jangan mengubah keputusan PRD.

**ACCEPTANCE GATE**

\- npm/pnpm install sukses.

\- typecheck, lint, test, build lulus.

\- requirements matrix menyebut semua requirement IDs dari PRD.

\- Struktur modul tersedia dan tidak circular.

\- Public smoke page adalah DOM HTML, bukan canvas output.

# Fase 1 — Data Model, Schemas, dan Foundation

**TUJUAN**

Membuat database, Zod contracts, canonical document schema, dan
migration foundation yang akan dipakai seluruh produk.

**PRD TARGET**

FR-TPL-002, FR-VAR-001..003, FR-WDG-001, FR-AST-001, NFR-REL-001, schema
evolution, relational entities.

**KERJAKAN**

1\. Pilih salah satu ORM: Prisma ATAU Drizzle. Catat keputusan di ADR.

2\. Implementasikan PostgreSQL schema untuk users, workspaces,
workspace_members, templates, template_versions, invitations,
published_snapshots, guests, rsvps, assets, audit_logs.

3\. Buat Zod schema versioned untuk CanonicalDocumentV1, Section, Frame,
Element union, TextElement, ImageElement, ShapeElement, WidgetElement,
AnimationConfig, VariableDefinition, Binding, ThemeTokens.

4\. Implementasikan schemaVersion=1 dan registry migrator dengan API
migrateDocument(input)-\>latest. Buat fixture v1 dan unit test.

5\. Implementasikan safe binding type compatibility. Tidak perlu UI.

6\. Implementasikan safe URL validator dan coordinate schema.

7\. Buat DB seed untuk satu workspace dev + user dev + empty template.

8\. Tambahkan repository/service layer; jangan query DB langsung dari UI
components.

9\. Tambahkan unit tests untuk invalid frames, duplicate IDs, unknown
widget type placeholder behavior, binding type mismatch, unsafe URL.

10\. Update requirements matrix status fase.

**DESIGN CONSTRAINTS**

\- JSON declarative only.

\- frame menggunakan x,y,w,h,rotation dengan finite numbers dan w/h \>
0.

\- baseWidth default 390.

\- element/widget id stabil dan unik dalam document.

**ACCEPTANCE GATE**

\- Migration database berhasil dari database kosong.

\- CanonicalDocumentV1 parse valid fixture dan menolak invalid fixture.

\- Tidak ada eval/raw script fields.

\- Schema migration tests lulus.

# Fase 2 — Auth, Workspace, dan Template Library

**TUJUAN**

Membuat dashboard dasar yang aman: authentication, authorization,
template library, draft lifecycle, dan template version publishing.

**PRD TARGET**

FR-AUTH-001, FR-TPL-001..003, FR-AUD-001, P-06.

**KERJAKAN**

1\. Implementasikan auth yang cocok dengan stack project. Gunakan
session server-side yang aman.

2\. Implementasikan workspace authorization middleware/service.

3\. Buat Template Library UI: list, create, rename, duplicate, archive,
open.

4\. Template draft menyimpan draftDocumentJson tervalidasi.

5\. Tambahkan optimistic concurrency menggunakan version/updatedAt.

6\. Buat template validate endpoint yang memakai canonical schema dan
semantic validation.

7\. Publish template membuat TemplateVersion immutable dengan versionNo
meningkat.

8\. Catat audit log untuk publish/archive/duplicate penting.

9\. Buat test authorization: user workspace A tidak bisa mengakses
template workspace B.

10\. Buat integration test create draft -\> save -\> publish -\> edit
draft lagi; published version tidak berubah.

**UI MINIMUM**

\- Loading, empty, error, confirmation archive.

\- Indikator Draft/Published.

**ACCEPTANCE GATE**

\- FR-TPL-001..003 teruji.

\- Published template version benar-benar immutable pada service/API
level.

\- Cross-workspace access ditolak.

# Fase 3 — Canonical Document Engine dan Variable Binding

**TUJUAN**

Membuat engine yang mengubah canonical document + data context menjadi
resolved render model tanpa editor UI yang kompleks.

**PRD TARGET**

FR-VAR-001..003, FR-INV-002, P-02, P-03.

**KERJAKAN**

1\. Buat variable registry helpers: define, validate, default, required,
formatter whitelist.

2\. Implementasikan resolver(binding, invitationData, guestData) yang
deterministic dan side-effect free.

3\. Implementasikan structured text segments: static text + binding
tokens. Jangan gunakan template string eval.

4\. Implementasikan formatter: date, datetime dengan timezone,
uppercase/lowercase/titlecase, currency sederhana.

5\. Implementasikan visibility/fallback behavior untuk optional value.

6\. Buat development playground page yang merender resolved JSON/text
menggunakan sample data.

7\. Buat form generator primitives dari VariableDefinition; UI final
Data Mode akan dibuat Fase 8.

8\. Unit test: multiple bindings, missing required, optional fallback,
wrong type, guest.name runtime, timezone formatting.

9\. Tambahkan semantic validator yang memastikan setiap binding key
valid.

**ACCEPTANCE GATE**

\- Satu template fixture dapat diberi dua dataset berbeda dan
menghasilkan dua resolved models berbeda tanpa mutasi template.

\- Tidak ada data klien hardcoded di fixture reusable selain sample data
test.

# Fase 4 — Editor Core

**TUJUAN**

Membangun pengalaman Canva-like dasar untuk section dan elemen visual
menggunakan React-Konva, tetapi tetap menyimpan canonical JSON.

**PRD TARGET**

FR-EDT-001..009, AC-08, UX editor, Section Model.

**KERJAKAN**

1\. Buat editor shell: top bar, left sidebar, center artboard, right
inspector, layers panel.

2\. Artboard base width 390. Implementasikan zoom 25–200%, pan bila
perlu, dan coordinate transform agar saved values tidak terpengaruh
zoom.

3\. Implementasikan sections: add, reorder, duplicate, delete,
baseHeight, background.

4\. Implementasikan element types: text, rectangle, circle, line, basic
decoration placeholder.

5\. Implementasikan select, multi-select bila stabil, drag, resize,
rotate, delete, duplicate, lock, hide, z-order.

6\. Implementasikan undo/redo dengan minimal 50 history actions; pointer
move tidak membuat history entry per pixel. Commit transform pada
pointer end.

7\. Implementasikan right inspector untuk frame, opacity, color,
typography inti.

8\. Implementasikan layer list per section.

9\. Implementasikan autosave debounce ke template draft dengan conflict
detection.

10\. Implementasikan keyboard shortcuts sesuai PRD Lampiran A.

11\. Tambahkan snapping center/edges jika dapat dilakukan tanpa
mengganggu core; tandai P1 bila belum.

12\. Tests: reducer/store history, coordinate math, transform commit,
lock/hide, section reorder.

**PERFORMANCE RULE**

\- Jangan reserialize dan POST document pada setiap drag frame.

\- Pisahkan transient transform state dan committed document state.

**ACCEPTANCE GATE**

\- User membuat 3 section dan memanipulasi elemen visual.

\- Save/reload mempertahankan posisi/ukuran/rotation/layer.

\- Undo/redo konsisten.

\- Canonical JSON tetap lolos schema.

# Fase 5 — Asset Pipeline dan Image Elements

**TUJUAN**

Mendukung upload/reuse image yang aman dan image element yang dapat
mengganti foto template secara dinamis.

**PRD TARGET**

FR-EDT-008, FR-AST-001..002, NFR-SEC-002.

**KERJAKAN**

1\. Implementasikan server-side upload init/finalize flow ke
S3-compatible storage.

2\. Validasi MIME, extension consistency, byte limit, image dimensions.

3\. Simpan metadata asset. Jangan percaya metadata client saja.

4\. Buat Asset sidebar: upload, list recent, search/filter sederhana
bila scope memungkinkan.

5\. Tambahkan ImageElement ke editor: source asset, replace, object-fit
contain/cover, focal position, radius, opacity.

6\. Tambahkan image binding ke variable type=image.

7\. Implementasikan public image component abstraction yang nantinya
mendukung optimized variants/lazy loading.

8\. Uji upload invalid MIME dan oversized file.

9\. Uji template image binding diganti oleh invitationData tanpa
mengubah template JSON.

**ACCEPTANCE GATE**

\- User dapat upload image, menaruh ke artboard, save/reload, replace,
dan bind ke variable.

\- Unsafe file ditolak server.

# Fase 6 — Widget Registry dan P0 Widgets

**TUJUAN**

Membangun reusable widget platform dan tiga widget wajib MVP: Map,
Countdown, Guest Greeting.

**PRD TARGET**

FR-WDG-001..004, AC-04..06, P-05, P-09.

**KERJAKAN**

1\. Buat WidgetDefinition interface: type, version, label, propsSchema,
defaultFrame, defaultProps, editorRenderer/placeholder, runtimeRenderer,
migrateProps optional.

2\. Buat central widgetRegistry. Unknown widget type harus menghasilkan
safe fallback di editor/runtime, bukan crash.

3\. Implement Map widget. Props: coordinate binding/static, label,
buttonText. Runtime klik membuka Google Maps coordinate URL. Jangan
pakai embedded Google Maps API pada MVP.

4\. Implement Countdown widget. Props: target datetime, timezone,
labels, afterState. Pastikan timer cleanup dan update efisien.

5\. Implement GuestGreeting widget. Props: guestName binding, prefix,
fallback generic.

6\. Editor left sidebar dapat insert widget. Right inspector dibangun
dari widget props schema/config metadata.

7\. Binding compatibility enforced.

8\. Unit tests untuk registry, prop validation, unknown widget.

9\. Component/integration tests untuk map URL, countdown timezone
behavior, guest fallback.

**ACCEPTANCE GATE**

\- Widget yang sama dapat ditempatkan pada dua template tanpa duplikasi
logic.

\- Map, countdown, guest greeting render di editor placeholder dan HTML
runtime sandbox.

# Fase 7 — Animation System

**TUJUAN**

Membuat animation model + editor controls + runtime engine, termasuk
text letter-by-letter.

**PRD TARGET**

FR-ANM-001..006, AC-07, NFR-A11Y-001.

**KERJAKAN**

1\. Buat animation preset registry. Pisahkan data preset dari GSAP
implementation.

2\. Implement P0 enter presets: fadeIn, slideUp/Down/Left/Right, zoomIn,
rotateInSoft.

3\. Implement text presets: charFade/charRise, wordReveal.

4\. Config: trigger, durationMs, delayMs, easing, once, staggerUnit,
staggerAmountMs.

5\. Runtime trigger onLoad dan onEnterViewport. onClick hanya untuk
elemen yang memang interactive dan tidak mengganggu accessibility.

6\. Text splitting harus menjaga semantic text menggunakan
aria-label/visually-hidden strategy yang benar.

7\. Implement prefers-reduced-motion: non-essential animation off atau
minimal.

8\. Editor inspector punya Animation section dan replay
selected/section.

9\. Animation harus transform/opacity-first. Hindari animasi
layout-heavy.

10\. Unit test config normalization dan reduced-motion decision.
Component test memastikan stagger menghasilkan jumlah span benar tanpa
mengubah accessible name.

**ACCEPTANCE GATE**

\- Text nama pasangan dapat animasi masuk per huruf.

\- Replay editor bekerja.

\- Public runtime dengan reduced motion tetap menampilkan konten segera.

# Fase 8 — Invitation Data Mode, Guest Context, dan Preview

**TUJUAN**

Mengubah reusable template menjadi invitation instance yang datanya
mudah diisi operator tanpa mengedit layout.

**PRD TARGET**

FR-INV-001..003, FR-GST-002..003, FR-PRV-001, AC-02, AC-03, AC-06.

**KERJAKAN**

1\. Buat Create Invitation flow dari TemplateVersion.

2\. Invitation menyimpan templateVersionId + dataValuesJson.

3\. Buat Data Mode berdasarkan VariableDefinition:
text/date/datetime/image/url/color/boolean/coordinate/select.

4\. Required validation harus jelas sebelum publish.

5\. Preview menggunakan HTML renderer route/component yang sama dengan
public runtime, bukan Konva screenshot.

6\. Implement guest CRUD minimum dan secure opaque token generation.
Import CSV boleh ditunda ke P1 bila requirement matrix menandainya
demikian, tetapi guest manual harus tersedia untuk AC-06.

7\. Preview dapat memilih sample guest dan generic context.

8\. Implement invitation data autosave yang tidak mengubah template.

9\. E2E: satu template -\> invitation A data A -\> invitation B data B
-\> previews berbeda dan template unchanged.

**ACCEPTANCE GATE**

\- Operator dapat membuat invitation tanpa masuk Design Mode.

\- Mengganti nama pengantin sekali memperbarui semua bound elements.

\- Guest A dan B menampilkan nama berbeda.

# Fase 9 — HTML Public Renderer dan Publishing

**TUJUAN**

Menyelesaikan jalur produksi: public HTML renderer mobile-first,
published snapshots, public slug, dan isolation draft/live.

**PRD TARGET**

FR-INV-004, FR-PUB-001..003, AC-09..12, P-04, P-06, NFR-PERF-001,
NFR-REL-001.

**KERJAKAN**

1\. Implement HTML renderer untuk sections/elements/widgets. Text harus
DOM text.

2\. Implement scale strategy baseWidth=390 untuk viewport 320–430; cegah
horizontal overflow.

3\. Public route /i/\[slug\] membaca activePublishedSnapshotId, bukan
draft.

4\. Publish invitation membuat PublishedSnapshot immutable yang
menyimpan documentJson/templateVersionId/dataValues sesuai model PRD.

5\. Guest token context dapat diterapkan ke public route tanpa
mengekspos DB id.

6\. Default metadata robots noindex,nofollow kecuali product setting
nanti berubah.

7\. Lazy load image di luar above-the-fold. Jangan preload seluruh
gallery/audio.

8\. Tambahkan error boundary per widget.

9\. Buat visual regression target 320, 375, 390, 414, 430 untuk minimal
dua representative templates.

10\. E2E AC-10: publish -\> edit draft -\> live unchanged -\> republish
-\> live changes.

11\. Pastikan preview dan public renderer share core renderer
package/components.

**ACCEPTANCE GATE**

\- Public URL tanpa login bekerja.

\- Text dapat diseleksi sebagai HTML.

\- Tidak ada horizontal scroll pada target viewports.

\- Draft isolation lulus test.

\- Published snapshot lama masih dapat dibaca.

# Fase 10 — P1 Widgets: RSVP, Gallery, Music, Gift

**TUJUAN**

Menambah widget yang umum pada undangan tanpa mengorbankan arsitektur
registry.

**PRD TARGET**

FR-WDG-005..008, FR-GST-001 sebagian, analytics events terkait.

**KERJAKAN**

1\. RSVP widget: hadir/tidak, partySize bila enable, message optional,
deadline optional. Public API tervalidasi, rate-limited, dan idempotency
policy jelas.

2\. Buat RSVP dashboard basic per invitation.

3\. Guest CSV import: parse preview, mapping minimal, duplicate
handling, summary success/fail.

4\. Gallery widget: image collection, grid/slider, lazy load,
keyboard/touch accessible controls.

5\. Music widget: play/pause selalu ada; autoplay hanya best-effort
setelah user gesture sesuai browser policy; failure tidak menghasilkan
error page.

6\. Gift widget: list account/e-wallet from variables + copy action
dengan feedback.

7\. Semua widget harus memakai registry yang sama. Tidak boleh
special-case di template files.

8\. Tambahkan analytics hooks: map_clicked, rsvp_submitted,
music_played.

9\. Tests setiap widget dan public API.

**ACCEPTANCE GATE**

\- Widget baru dapat diinsert dari sidebar dan di-render oleh public
renderer tanpa perubahan template-specific code.

\- RSVP submission tersimpan dan error tidak membocorkan internal data.

# Fase 11 — Hardening, Performance, Security, QA

**TUJUAN**

Mengubah produk dari “berfungsi” menjadi “layak pilot” melalui hardening
teknis, test, profiling, security, dan visual QA.

**PRD TARGET**

Seluruh NFR, Section 19–21, AC-12..15.

**KERJAKAN**

1\. Audit authorization semua dashboard write/read resource.

2\. Audit unsafe URL, text escaping, upload MIME spoofing, widget props
validation.

3\. Tambahkan rate limit public RSVP dan endpoint publik lain yang dapat
disalahgunakan.

4\. Profile editor dengan stress fixture ~100 elemen per section;
kurangi rerender dan commit state frequency.

5\. Profile public page dengan realistic 15–30 images + animation.
Terapkan lazy loading/optimization.

6\. Jalankan accessibility audit manual + automated untuk public route:
semantic text, button labels, focus, reduced motion, image alt strategy.

7\. Tambahkan E2E golden path penuh dari create template sampai public
guest URL.

8\. Tambahkan visual regression 320/375/390/414/430.

9\. Tambahkan migration regression fixtures.

10\. Tambahkan structured logging + requestId pada API error.

11\. Tambahkan error telemetry integration point, tanpa hardcode vendor
bila belum dipilih.

12\. Perbaiki semua test flaky sebelum lanjut.

**ACCEPTANCE GATE**

\- CI hijau konsisten.

\- Golden path AC-01..15 memiliki test atau verifikasi terdokumentasi.

\- Tidak ada blocker security/performance known yang tidak diterima
secara eksplisit.

# Fase 12 — Production Readiness dan Release

**TUJUAN**

Menyiapkan deployment production, operasional, rollback, backup, dan
release checklist tanpa mengubah behavior produk.

**PRD TARGET**

NFR-BACKUP-001, observability, audit, immutable publish, Definition of
Done.

**KERJAKAN**

1\. Siapkan environment config matrix: local, staging, production.

2\. Secret hanya lewat environment/secret manager; audit repository
untuk kebocoran.

3\. Siapkan DB migration workflow dan deploy order yang
backward-compatible.

4\. Siapkan object storage/CDN production policy dan CORS yang minimal.

5\. Dokumentasikan backup database/storage dan restore drill.

6\. Dokumentasikan rollback aplikasi dan rollback published invitation
snapshot.

7\. Buat production smoke tests: auth, template load, invitation public,
guest context, map click URL, countdown render, asset load.

8\. Buat release checklist dan incident quick guide.

9\. Pastikan monitoring minimal tersedia untuk error rate, API latency,
public render errors, upload errors, RSVP errors.

10\. Freeze PRD baseline untuk release; scope baru masuk Change Request
v1.1+.

**ACCEPTANCE GATE**

\- Staging end-to-end lulus dengan production-like config.

\- Backup/restore procedure terdokumentasi.

\- Deployment/rollback steps dapat dijalankan oleh engineer lain.

\- Release checklist ditandatangani secara internal.

# Lampiran A — Prompt Change Request

Gunakan prompt ini ketika kebutuhan produk berubah setelah PRD
baseline.  
  
"Baca PRD baseline dan change request berikut. Jangan
mengimplementasikan perubahan dulu. Buat impact analysis yang mencakup:
requirement IDs terdampak, schema/database/API/editor/renderer impact,
migration impact pada published snapshots, test yang harus
diubah/ditambah, backward compatibility, risiko, dan rekomendasi versi
PRD berikutnya. Bedakan perubahan additive vs breaking. Setelah impact
analysis, tunggu approval eksplisit sebelum mengubah code. Jangan
mengganti requirement lama secara diam-diam."

# Lampiran B — Prompt Bugfix

"Perbaiki bug berikut tanpa memperluas scope. Pertama reproduksi dengan
test yang gagal. Telusuri requirement PRD terkait dan jelaskan expected
behavior. Implementasikan fix terkecil yang benar, tambahkan regression
test, jalankan typecheck/lint/unit/integration/E2E yang relevan, lalu
laporkan root cause, file berubah, dan mengapa fix tidak mengubah
contract lain. Jangan menghapus test atau menonaktifkan validation."

# Lampiran C — Prompt Code Review per Fase

"Lakukan code review terhadap implementasi fase ini berdasarkan PRD,
bukan preferensi subjektif. Buat temuan per severity: Blocker, High,
Medium, Low. Untuk setiap temuan cantumkan requirement ID/guardrail yang
dilanggar, bukti file/function, risiko user/production, dan perbaikan
konkret. Prioritaskan: data/design separation, immutable publishing,
HTML renderer parity, schema validation, authorization, arbitrary-code
prevention, performance editor, mobile overflow, accessibility
animation, dan backward compatibility. Akhiri dengan verdict: gate PASS
hanya jika tidak ada Blocker/High yang belum ditangani."

# Lampiran D — Checklist Sebelum Memberi Prompt Fase Berikutnya

- Pastikan laporan fase sebelumnya menyatakan aman lanjut.

- Pastikan CI hijau dan tidak ada migration error.

- Pastikan requirement matrix sudah diperbarui.

- Pastikan PRD baseline belum berubah; jika berubah, revisi prompt yang
  terdampak.

- Pastikan debt yang ditunda tidak memblokir dependency fase berikutnya.

- Jika ada perubahan arsitektur, ADR sudah ditulis dan tidak
  bertentangan dengan PRD.
