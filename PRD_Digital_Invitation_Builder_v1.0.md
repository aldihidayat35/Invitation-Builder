**PRODUCT DOCUMENTATION**

Product Requirements Document (PRD)

Digital Invitation Builder — editor undangan digital reusable dengan output HTML mobile-first

| **Versi**            | 1.0                                           |
|----------------------|-----------------------------------------------|
| **Tanggal baseline** | 3 Oktober 2026                                |
| **Status**           | Baseline / Source of Truth                    |
| **Platform target**  | Web editor; output undangan HTML mobile-first |

*Dokumen ini menjadi acuan tetap untuk desain produk, implementasi, pengujian, dan acceptance criteria. Perubahan ruang lingkup harus melalui change request yang eksplisit.*

# Daftar Isi Ringkas

1\. Ringkasan Eksekutif

2\. Latar Belakang dan Masalah

3\. Visi, Sasaran, dan Non-Sasaran

4\. Pengguna, Peran, dan Skenario Utama

5\. Prinsip Produk dan Keputusan Arsitektur

6\. Konsep Domain

7\. Alur Pengguna End-to-End

8\. Persyaratan Fungsional

9\. Spesifikasi Editor Canva-like

10\. Sistem Variable dan Data Binding

11\. Sistem Widget Reusable

12\. Sistem Animasi

13\. Renderer HTML Mobile dan Responsiveness

14\. Template, Versi, dan Publishing

15\. Model Data dan Kontrak JSON

16\. API dan Backend

17\. UX/UI Editor

18\. Non-Functional Requirements

19\. Keamanan dan Privasi

20\. Analytics dan Observability

21\. Testing dan QA

22\. Scope MVP dan Roadmap

23\. Acceptance Criteria

24\. Risiko dan Mitigasi

25\. Definition of Done dan Change Control

Lampiran A–D

# 1. Ringkasan Eksekutif

Produk yang akan dibangun adalah aplikasi web untuk membuat, mengedit, menyimpan, dan mempublikasikan undangan digital berbasis HTML. Editor harus memberikan pengalaman visual menyerupai Canva: pengguna dapat memilih objek, menggeser posisi, mengubah ukuran, memutar, mengatur layer, mengubah teks, mengganti foto, dan menambahkan animasi. Namun hasil akhir bukan gambar atau video, melainkan halaman HTML interaktif yang dibagikan melalui link.

Perbedaan inti dibanding editor desain umum adalah setiap tema harus reusable. Tema tidak menyimpan nama pengantin, tanggal, lokasi, nama tamu, atau data acara sebagai teks hardcode. Elemen dapat dihubungkan ke variable terstruktur. Saat tema digunakan untuk klien baru, operator cukup mengisi data undangan dan seluruh elemen yang terikat variable memperbarui tampilannya secara otomatis.

Produk juga memiliki sistem widget reusable. Widget merupakan komponen fungsional yang dapat ditempatkan di berbagai tema, misalnya Google Maps berdasarkan koordinat, countdown menuju waktu acara, sapaan nama tamu, RSVP, galeri, musik, dan informasi hadiah. Widget memiliki konfigurasi dan logika sendiri tetapi tetap mengikuti style tema.

| **Keputusan paling penting:** Model desain disimpan sebagai JSON terstruktur. Editor dan public renderer membaca model yang sama. Halaman publik selalu dirender sebagai HTML/CSS/JavaScript, bukan screenshot atau canvas statis. Publish membuat snapshot immutable agar perubahan draft tidak merusak undangan yang sudah dibagikan. |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 2. Latar Belakang dan Masalah

- Template undangan yang di-hardcode menyebabkan perubahan konten harus dilakukan di source code atau duplikasi file.

- Desain baru sulit digunakan ulang karena data klien bercampur dengan struktur visual.

- Widget fungsional seperti maps, countdown, guest greeting, dan RSVP sering ditulis ulang untuk tiap tema.

- Animasi desain menjadi tidak konsisten jika logika animasi tersebar di banyak template.

- Sulit memberi kebebasan visual kepada desainer tanpa membuat hasil akhir HTML menjadi rapuh pada berbagai ukuran ponsel.

- Perubahan template setelah undangan dipublikasikan berpotensi memengaruhi klien yang sudah live bila tidak ada versioning.

## 2.1 Problem Statement

Dibutuhkan satu platform yang memisahkan design model, content data, functional widgets, dan runtime renderer sehingga template dapat dibuat satu kali, digunakan ulang berkali-kali, diedit secara visual, dan dipublikasikan sebagai halaman HTML mobile-first yang stabil.

# 3. Visi, Sasaran, dan Non-Sasaran

## 3.1 Visi Produk

Menjadi studio undangan digital berbasis web tempat desainer dapat membuat tema tanpa coding, operator dapat membuat undangan klien cukup dengan mengisi data, dan klien menerima link undangan HTML yang interaktif, cepat, personal, dan konsisten di perangkat mobile.

## 3.2 Sasaran Utama

- Membuat editor visual mobile artboard yang terasa familiar bagi pengguna Canva.

- Menerapkan reusable theme + structured variables sehingga satu tema dapat dipakai untuk banyak undangan.

- Menerapkan reusable widget registry agar widget dapat dipasang di tema mana pun tanpa menyalin logic.

- Mendukung animasi enter, attention/loop, exit, scroll-triggered, serta text stagger per huruf/kata.

- Menghasilkan halaman publik HTML yang mobile-first, ringan, dan bisa dibagikan melalui URL unik.

- Menjaga published invitation stabil melalui snapshot/versioning.

- Memiliki fondasi extensible agar tipe elemen, widget, animation preset, dan data schema baru dapat ditambahkan tanpa migrasi besar.

## 3.3 Non-Sasaran MVP

- Bukan editor desain serbaguna untuk poster, presentasi, atau video.

- Tidak menargetkan output desktop sebagai format desain utama; desktop hanya fallback/preview.

- Tidak menargetkan collaborative real-time multi-cursor pada MVP.

- Tidak menargetkan marketplace template publik pada MVP.

- Tidak menargetkan video editing atau timeline audiovisual kompleks.

- Tidak menargetkan custom JavaScript arbitrary yang dapat dimasukkan user ke halaman publik.

# 4. Pengguna, Peran, dan Skenario Utama

| **Peran**            | **Tanggung Jawab**                                                                                          |
|----------------------|-------------------------------------------------------------------------------------------------------------|
| Owner/Admin          | Mengelola workspace, akun, template, widget registry, invitation, publishing, dan konfigurasi sistem.       |
| Designer             | Membuat dan mengedit tema, section, elemen, style, data binding, dan animasi.                               |
| Operator             | Membuat undangan baru dari template, mengisi data klien, daftar tamu, melihat preview, lalu publish.        |
| Guest/Public Visitor | Membuka link undangan, melihat konten personal, maps, countdown, galeri, dan mengirim RSVP bila diaktifkan. |

## 4.1 Skenario Utama

1\. Designer membuat tema baru, menambah section, elemen dekorasi, teks dinamis, foto, widget, dan animasi, lalu menyimpan sebagai template.

2\. Operator memilih template, membuat invitation instance, mengisi data pengantin, tanggal, lokasi, foto, rekening, dan informasi lain.

3\. Operator mengimpor atau menambah daftar tamu; sistem membuat guest identifier/link personal.

4\. Operator membuka preview final yang menggunakan renderer publik yang sama dengan halaman live.

5\. Operator menekan Publish; sistem membuat snapshot versi, slug publik, dan mengaktifkan link.

6\. Guest membuka link; renderer memuat snapshot + invitation data + guest data dan menampilkan HTML mobile-first.

7\. Bila template diedit setelah publish, undangan live tetap memakai snapshot lama sampai operator melakukan republish eksplisit.

# 5. Prinsip Produk dan Keputusan Arsitektur

| **ID** | **Prinsip**                | **Makna**                                                                                                |
|--------|----------------------------|----------------------------------------------------------------------------------------------------------|
| P-01   | PRD adalah source of truth | Implementasi, prompt, test, dan perubahan scope harus dapat ditelusuri ke requirement PRD.               |
| P-02   | Data terpisah dari desain  | Nama, tanggal, lokasi, foto klien, nama tamu, dan nilai lain tidak di-hardcode ke template.              |
| P-03   | Canonical JSON model       | Template/invitation design disimpan sebagai structured JSON yang versionable dan dapat divalidasi.       |
| P-04   | HTML runtime               | Public invitation dirender sebagai DOM/HTML/CSS; canvas hanya alat editor/interaksi, bukan output final. |
| P-05   | Reusable widgets           | Logic widget tidak diduplikasi di tema; tema hanya menyimpan widget type + props + style overrides.      |
| P-06   | Immutable publish          | Setiap publish menciptakan snapshot yang tidak berubah.                                                  |
| P-07   | Mobile-first               | Canonical artboard width 390 px; target utama 320–430 px.                                                |
| P-08   | Progressive enhancement    | Fitur non-esensial seperti autoplay audio atau animation mewah tidak boleh memblokir konten utama.       |
| P-09   | Safe extensibility         | Penambahan widget/element baru melalui registry/schema, bukan conditional logic tersebar.                |

## 5.1 Baseline Technology Stack

- Framework utama: Next.js + React + TypeScript strict.

- Editor interaction surface: React-Konva untuk select/drag/resize/rotate/guides; final visual parity diverifikasi melalui preview HTML renderer di iframe/route terpisah.

- State client editor: Zustand dengan undo/redo history terkontrol.

- Animation runtime: GSAP untuk timeline, scroll, stagger, dan sequencing; CSS/WAAPI dapat dipakai untuk preset sederhana.

- Database: PostgreSQL; ORM dapat Prisma atau Drizzle, dipilih satu kali pada fase bootstrap dan tidak dicampur.

- Object storage: S3-compatible storage untuk foto, audio, thumbnail, dan asset template.

- Validation: Zod schema sebagai kontrak runtime untuk document model, widget props, variable values, dan API payload.

- Styling aplikasi: Tailwind CSS atau CSS Modules; public renderer wajib menghasilkan CSS yang terkontrol dan tidak membocorkan style dashboard.

| **Catatan implementasi:** Jangan menyimpan serialized React component, function, atau executable code di database. Database hanya menyimpan data deklaratif yang tervalidasi. |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 6. Konsep Domain

| **Entitas**         | **Definisi**                                                                                            |
|---------------------|---------------------------------------------------------------------------------------------------------|
| Workspace           | Ruang kepemilikan project dan user.                                                                     |
| Theme/Template      | Desain reusable yang berisi sections, elements, widgets, styles, animation config, dan variable schema. |
| Template Draft      | Versi yang sedang diedit oleh designer.                                                                 |
| Template Version    | Snapshot template immutable yang dapat dipakai invitation.                                              |
| Invitation          | Instance undangan untuk satu klien/event yang memiliki data values dan mengacu ke template version.     |
| Invitation Draft    | Kondisi invitation sebelum/di antara publish.                                                           |
| Published Snapshot  | Snapshot immutable design + data reference yang digunakan halaman publik.                               |
| Section             | Unit vertikal halaman, memiliki height/layout/overflow/background dan children.                         |
| Element             | Objek visual: text, image, shape, icon, line, decoration, group.                                        |
| Widget              | Komponen fungsional reusable: map, countdown, guest greeting, RSVP, gallery, music, gift, event list.   |
| Variable Definition | Definisi key, type, label, default, required, formatting.                                               |
| Data Value          | Nilai variable pada invitation atau guest context.                                                      |
| Animation Preset    | Definisi reusable untuk enter/attention/exit dan trigger.                                               |
| Guest               | Tamu undangan dengan name, token/slug, RSVP state, dan metadata minimal.                                |
| Asset               | Media yang di-upload atau merupakan asset template.                                                     |

# 7. Alur Pengguna End-to-End

## 7.1 Alur Membuat Template

1\. Designer membuka Template Library dan memilih Create Theme.

2\. Sistem membuat draft template dengan canonical mobile artboard 390 px.

3\. Designer menambah section dan menentukan background/height.

4\. Designer menambah text/image/shape/decorative elements atau widget.

5\. Designer dapat mengetik teks statis atau menghubungkan text/image/props ke variable.

6\. Designer menambahkan animation preset dan trigger ke elemen.

7\. Designer menguji sample data dan preview HTML.

8\. Designer melakukan Validate Template; error data binding/widget config harus ditampilkan sebelum template dapat dipublikasikan.

9\. Designer mempublikasikan template version.

## 7.2 Alur Membuat Invitation dari Template

1\. Operator memilih template version.

2\. Sistem membuat invitation draft dan form berdasarkan variable schema template.

3\. Operator mengisi nilai termasuk nama, foto, jadwal, lokasi, koordinat, URL musik, dan lain-lain.

4\. Nilai terlihat langsung di preview/editor melalui data binding.

5\. Operator dapat melakukan override visual tertentu jika permission/template mengizinkan.

6\. Operator menambah/import guest.

7\. Operator melakukan preview guest-specific.

8\. Operator publish dan mendapatkan public URL serta pola guest URL.

# 8. Persyaratan Fungsional

| **ID**      | **Area**   | **Requirement**                                                                                                                                | **Prioritas** | **Acceptance ringkas**                                                        |
|-------------|------------|------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------------------------------------------------------------------------|
| FR-AUTH-001 | Akun       | User dapat login/logout dan sesi aman.                                                                                                         | P0            | Route editor/dashboard terlindungi; public invitation tidak memerlukan login. |
| FR-TPL-001  | Template   | User dapat membuat, menamai, duplicate, archive, dan membuka template draft.                                                                   | P0            | Operasi tersimpan dan muncul di library.                                      |
| FR-TPL-002  | Template   | Template menyimpan sections/elements/widgets/variables sebagai JSON tervalidasi.                                                               | P0            | Payload gagal disimpan bila tidak lolos schema.                               |
| FR-TPL-003  | Template   | Template dapat dipublish menjadi immutable version.                                                                                            | P0            | Version id baru dibuat; versi sebelumnya tetap dapat dibaca.                  |
| FR-INV-001  | Invitation | User dapat membuat invitation dari template version.                                                                                           | P0            | Invitation menyimpan templateVersionId dan dataValues.                        |
| FR-INV-002  | Invitation | Form data invitation dibangun dari variable schema.                                                                                            | P0            | Field sesuai type, required, default, dan validation.                         |
| FR-INV-003  | Invitation | User dapat preview menggunakan sample guest/data sebelum publish.                                                                              | P0            | Preview menggunakan renderer HTML production-equivalent.                      |
| FR-INV-004  | Invitation | Publish membuat snapshot immutable dan public slug.                                                                                            | P0            | Draft selanjutnya tidak mengubah live page sampai republish.                  |
| FR-EDT-001  | Editor     | Artboard mobile dapat zoom, pan, dan center.                                                                                                   | P0            | Zoom minimal 25–200%; tidak mengubah saved coordinates.                       |
| FR-EDT-002  | Editor     | Elemen dapat select, multi-select, drag, resize, rotate.                                                                                       | P0            | Transform tersimpan dan undoable.                                             |
| FR-EDT-003  | Editor     | Mendukung duplicate, delete, lock, hide, reorder layer.                                                                                        | P0            | Status layer tercermin di editor dan renderer.                                |
| FR-EDT-004  | Editor     | Mendukung undo/redo untuk perubahan desain.                                                                                                    | P0            | Minimal 50 history actions per editing session.                               |
| FR-EDT-005  | Editor     | Mendukung snapping dan alignment guides.                                                                                                       | P1            | Snap ke artboard center/edges dan objek tetangga.                             |
| FR-EDT-006  | Editor     | User dapat menambah text, image, rectangle, circle, line, icon/decorative asset.                                                               | P0            | Semua tipe tampil dan persist.                                                |
| FR-EDT-007  | Editor     | Text dapat diatur font family, size, weight, line-height, letter spacing, alignment, color, opacity.                                           | P0            | Preview dan public renderer konsisten.                                        |
| FR-EDT-008  | Editor     | Image dapat upload, replace, crop/focal position, fit mode, radius, opacity.                                                                   | P0            | Asset URL aman dan optimizable.                                               |
| FR-EDT-009  | Editor     | Section dapat ditambah, reorder, duplicate, delete, ubah height/background.                                                                    | P0            | Section ordering menjadi urutan scroll publik.                                |
| FR-VAR-001  | Variable   | Template dapat mendefinisikan variable bertipe text, richText-limited, number, date, datetime, image, url, color, boolean, coordinate, select. | P0            | Schema tervalidasi dan form terbuat otomatis.                                 |
| FR-VAR-002  | Variable   | Text dan widget props dapat binding ke variable.                                                                                               | P0            | Perubahan data memperbarui preview tanpa edit template.                       |
| FR-VAR-003  | Variable   | Binding dapat memiliki fallback/default dan formatter.                                                                                         | P1            | Missing optional value tidak merusak layout.                                  |
| FR-WDG-001  | Widget     | Widget registry memetakan type ke schema props, editor config, dan runtime component.                                                          | P0            | Widget baru dapat ditambahkan tanpa mengubah template lama.                   |
| FR-WDG-002  | Widget     | Map widget menerima latitude/longitude dan label.                                                                                              | P0            | Klik membuka Google Maps ke koordinat yang benar.                             |
| FR-WDG-003  | Widget     | Countdown menerima target datetime + timezone.                                                                                                 | P0            | Hitung mundur benar dan mempunyai state setelah waktu lewat.                  |
| FR-WDG-004  | Widget     | Guest Greeting menampilkan nama tamu dari guest context dengan fallback.                                                                       | P0            | Nama tidak dimasukkan ke template hardcode.                                   |
| FR-WDG-005  | Widget     | RSVP dapat menerima status hadir/tidak, nama, jumlah tamu jika diaktifkan, dan pesan opsional.                                                 | P1            | Submission tersimpan dan idempotent per guest sesuai policy.                  |
| FR-WDG-006  | Widget     | Gallery menampilkan collection image dengan mode grid/slider.                                                                                  | P1            | Lazy loading dan image optimization aktif.                                    |
| FR-WDG-007  | Widget     | Music widget menyediakan play/pause; autoplay harus mengikuti kebijakan browser dan user gesture.                                              | P1            | Kegagalan autoplay tidak menghalangi page.                                    |
| FR-WDG-008  | Widget     | Gift widget menampilkan rekening/e-wallet dan copy action.                                                                                     | P1            | Nilai berasal dari variables; copy feedback tersedia.                         |
| FR-ANM-001  | Animation  | Elemen dapat memiliki enter animation.                                                                                                         | P0            | Preset minimal fade, slide, zoom, rotate-soft.                                |
| FR-ANM-002  | Animation  | Elemen dapat memiliki attention/loop animation.                                                                                                | P1            | Loop tidak memblokir scroll dan dapat dinonaktifkan reduced-motion.           |
| FR-ANM-003  | Animation  | Elemen dapat memiliki exit animation.                                                                                                          | P1            | Trigger exit terdefinisi; tidak menghilangkan konten permanen tanpa alasan.   |
| FR-ANM-004  | Animation  | Text mendukung stagger per character dan per word.                                                                                             | P0            | Whitespace dan accessibility text tetap terbaca oleh screen reader.           |
| FR-ANM-005  | Animation  | User dapat atur duration, delay, easing, stagger amount, trigger.                                                                              | P0            | Nilai tersimpan dalam animation config.                                       |
| FR-ANM-006  | Animation  | Trigger minimal onLoad, onEnterViewport, onClick untuk elemen yang sesuai.                                                                     | P0            | Trigger deterministik dan dapat dipreview.                                    |
| FR-GST-001  | Guest      | User dapat CRUD guest dan bulk import CSV.                                                                                                     | P1            | Validasi duplikat dan hasil import summary.                                   |
| FR-GST-002  | Guest      | Sistem membuat token/slug guest yang tidak mudah ditebak.                                                                                      | P0            | Link guest tidak mengekspos sequential database id.                           |
| FR-GST-003  | Guest      | Guest context tersedia ke variables/widget.                                                                                                    | P0            | guest.name dapat tampil personal.                                             |
| FR-AST-001  | Asset      | User dapat upload image dan audio sesuai batas file.                                                                                           | P0            | File divalidasi MIME/size dan disimpan object storage.                        |
| FR-AST-002  | Asset      | Asset library dapat search/filter dan reuse.                                                                                                   | P1            | Tidak perlu upload ulang asset sama.                                          |
| FR-PUB-001  | Publishing | Public URL menggunakan slug unik.                                                                                                              | P0            | Slug collision ditangani.                                                     |
| FR-PUB-002  | Publishing | Draft dan published state terpisah.                                                                                                            | P0            | Save draft tidak mengubah live snapshot.                                      |
| FR-PUB-003  | Publishing | User dapat rollback ke snapshot publish sebelumnya.                                                                                            | P1            | Rollback menjadi publish baru atau switch aman dengan audit trail.            |
| FR-PRV-001  | Preview    | Preview invitation dapat memilih guest sample dan viewport mobile.                                                                             | P0            | Data context identik dengan public runtime.                                   |
| FR-SET-001  | Settings   | Template memiliki design tokens: font, primary/secondary colors, spacing defaults.                                                             | P1            | Widget dapat memakai token melalui CSS variables.                             |
| FR-AUD-001  | Audit      | Aksi publish, rollback, delete/restore penting tercatat.                                                                                       | P1            | Audit menyimpan actor, action, entity, timestamp.                             |

# 9. Spesifikasi Editor Canva-like

## 9.1 Layout Editor

- Top bar: breadcrumb, nama template/invitation, save state, undo, redo, preview, validate, publish.

- Left sidebar: Elements, Text, Uploads/Assets, Widgets, Sections, Variables, Template Data.

- Center: mobile artboard + ruler/guides opsional; zoom/pan; area di luar artboard non-publishable.

- Right inspector: transform, style, typography, image, binding, animation, widget props, section props sesuai selection.

- Layers panel: urutan z-index per section, lock/hide, rename, group/ungroup jika fitur tersedia.

- Animation panel: preset, trigger, duration, delay, easing, stagger, preview animation.

## 9.2 Interaksi Objek

- Klik memilih satu objek; Shift/Ctrl memilih beberapa objek bila multi-select tersedia.

- Drag mengubah x/y; transformer handles mengubah width/height/rotation.

- Keyboard: Delete, Arrow nudge 1 px, Shift+Arrow 10 px, Ctrl/Cmd+C/V, Ctrl/Cmd+Z/Y, duplicate shortcut.

- Position values disimpan dalam canonical coordinate base 390 px, bukan coordinate layar editor setelah zoom.

- Lock mencegah pointer manipulation tetapi objek tetap dirender.

- Hidden-in-editor dapat berbeda dari hidden-in-publish hanya jika property eksplisit; default satu property visible.

- Elemen tidak boleh menyimpan inline event handler atau raw script.

## 9.3 Section Model

Invitation merupakan vertical scroll document yang terdiri dari beberapa section. Setiap section mempunyai baseHeight dan optional minHeight behavior. Elemen di dalam section menggunakan absolute coordinates terhadap section. Ini memberi kebebasan desain seperti Canva namun tetap menjaga scaling yang konsisten pada perangkat mobile.

- Canonical design width: 390 px.

- Default section height: 844 px, dapat diubah designer.

- Runtime scale = clamp(viewportWidth / 390, batas minimum dan maksimum yang ditetapkan renderer).

- Rendered section height = baseHeight × scale agar scroll flow tidak collapse.

- Konten interaktif seperti form RSVP boleh menggunakan internal DOM layout; bounding box widget tetap berada di artboard.

- Overflow default hidden per section; dapat diubah ke visible untuk decorative edge objects bila aman.

# 10. Sistem Variable dan Data Binding

Variable adalah kontrak data antara template dan invitation. Setiap variable memiliki key stabil berbentuk dot path, type, label, default value, validation, dan optional formatter. Key tidak boleh berubah diam-diam setelah template dipakai; perubahan breaking membutuhkan template version baru.

| **Key**                 | **Type**      | **Keterangan**               | **Rule**            |
|-------------------------|---------------|------------------------------|---------------------|
| couple.bride.fullName   | text          | Nama lengkap mempelai wanita | required            |
| couple.bride.nickname   | text          | Nama panggilan               | optional            |
| couple.groom.fullName   | text          | Nama lengkap mempelai pria   | required            |
| event.ceremony.startAt  | datetime      | Waktu akad/pemberkatan       | required + timezone |
| event.reception.startAt | datetime      | Waktu resepsi                | optional            |
| venue.name              | text          | Nama lokasi                  | required            |
| venue.address           | text          | Alamat                       | required            |
| venue.coordinate        | coordinate    | Lat/lng                      | optional untuk map  |
| media.coverPhoto        | image         | Foto cover                   | optional            |
| guest.name              | guest-context | Nama tamu                    | runtime             |
| gift.accounts           | collection    | Daftar rekening/e-wallet     | optional            |

## 10.1 Binding Rules

- Binding disimpan sebagai object, bukan string interpolation arbitrary.

- Binding text dapat menggabungkan static prefix/suffix dengan satu atau beberapa safe variable tokens melalui structured segments.

- Image element dapat bind source asset ke variable bertipe image.

- Widget props dapat bind ke variable yang type-compatible.

- Formatter whitelist: date, datetime, uppercase, lowercase, title-case, phone-display, currency sederhana. Tidak ada eval().

- Missing required variable menyebabkan template/invitation validation error; missing optional variable menggunakan fallback atau hide behavior yang dikonfigurasi.

# 11. Sistem Widget Reusable

Widget registry menjadi kontrak plugin internal. Setiap widget mendefinisikan type, version, label, property schema, binding schema, editor component/placeholder, runtime component, default size, and migration function bila schema berubah.

| **Widget**    | **Prioritas** | **Props inti**                               | **Perilaku**                                                                                          |
|---------------|---------------|----------------------------------------------|-------------------------------------------------------------------------------------------------------|
| map           | P0            | latitude, longitude, label, buttonText       | Tombol/card; membuka Google Maps URL dengan koordinat. Tidak membutuhkan embedded Maps API untuk MVP. |
| countdown     | P0            | targetDateTime, timezone, labels, afterState | Menampilkan hari/jam/menit/detik; update efisien.                                                     |
| guestGreeting | P0            | guestName binding, prefix, fallback          | Menampilkan nama tamu personal.                                                                       |
| rsvp          | P1            | eventId, fields config, deadline             | Form hadir/tidak, jumlah tamu, note opsional.                                                         |
| gallery       | P1            | images, mode, autoplay                       | Grid/slider, lazy load.                                                                               |
| music         | P1            | audioAsset, title, startMode                 | Play/pause; menghormati browser autoplay.                                                             |
| gift          | P1            | accounts collection, labels                  | Daftar rekening dan tombol copy.                                                                      |
| eventSchedule | P1            | events collection                            | List/cards jadwal lebih dari satu acara.                                                              |

## 11.1 Widget Contract

- Widget runtime menerima context: invitationData, guestData, themeTokens, runtimeMode, analytics hooks.

- Widget tidak boleh mengakses database langsung dari client; operasi data menggunakan API yang terautorisasi sesuai public context.

- Widget tidak dapat mengeksekusi HTML/script tidak tervalidasi.

- Widget harus punya fallback UI dan error boundary agar satu widget rusak tidak merusak seluruh undangan.

- Style override hanya melalui schema properti aman dan CSS variables/known style fields.

# 12. Sistem Animasi

| **Kategori**   | **Preset awal**                                       | **Trigger**                                    |
|----------------|-------------------------------------------------------|------------------------------------------------|
| Enter          | fadeIn, slideUp/Down/Left/Right, zoomIn, rotateInSoft | onLoad / onEnterViewport                       |
| Attention/Loop | float, pulseSoft, sway, shimmer-safe                  | afterEnter / whileVisible                      |
| Exit           | fadeOut, slideOut, zoomOut                            | onExitViewport / explicit trigger bila dipakai |
| Text           | charFade, charRise, wordReveal, letterSpread          | onLoad / onEnterViewport                       |

## 12.1 Animation Config

- Setiap animation track menyimpan presetId, trigger, durationMs, delayMs, easing, repeat, yoyo, staggerUnit, staggerAmountMs, once.

- Text stagger tidak mengubah semantic text. Runtime membuat visual spans tetapi menyediakan aria-label atau hidden semantic text yang benar.

- prefers-reduced-motion wajib didukung: non-essential animation dinonaktifkan atau dipersingkat.

- Animation tidak boleh memblokir initial content visibility lebih lama dari batas yang ditentukan; konten utama harus tetap dapat diakses saat JS gagal.

- Editor memiliki tombol replay untuk selected element dan preview seluruh section.

# 13. Renderer HTML Mobile dan Responsiveness

Public renderer adalah komponen terpisah dari dashboard/editor chrome. Ia membaca published snapshot dan menghasilkan DOM. Tujuan utamanya fidelity, performance, dan keamanan.

- Target utama viewport 320–430 px. Canonical artboard 390 px diskalakan proporsional.

- Pada layar lebih besar, undangan dapat ditampilkan di container terpusat dengan max-width sesuai desain; tidak perlu membuat layout desktop baru.

- Elemen text dirender sebagai HTML text, bukan canvas bitmap, sehingga tetap tajam dan selectable.

- Image menggunakan responsive source/optimization dan lazy loading di luar above-the-fold.

- Widget interaktif adalah DOM components.

- Preview yang dipakai sebelum publish menggunakan renderer yang sama, dengan runtimeMode=preview.

- Hydration harus selektif bila memungkinkan; konten statis dapat dirender server-side, widget interaktif hydrate di client.

## 13.1 Public URL dan Guest Context

- Base public URL contoh: /i/{invitationSlug}.

- Guest personalization dianjurkan menggunakan opaque guest token pada path/query yang tidak mengekspos database id.

- Jika guest token invalid/missing, gunakan configured generic greeting.

- Nama tamu harus di-escape sebagai text; tidak boleh diperlakukan sebagai HTML.

- Invitation dapat diatur noindex secara default untuk privasi; opsi indexing dapat ditambahkan kemudian bila dibutuhkan.

# 14. Template, Versi, dan Publishing

Versioning diperlukan karena tema reusable akan terus berkembang sementara undangan klien yang sudah live harus stabil.

- Template draft mutable; template version immutable.

- Invitation memilih templateVersionId saat dibuat. Upgrade ke version baru adalah tindakan eksplisit.

- Invitation draft menyimpan data dan allowed overrides.

- Publish membuat publishedSnapshot yang menunjuk design model version + resolved configuration/data version.

- Republish membuat snapshot baru dan mengubah pointer activePublishedSnapshotId.

- Rollback tidak menghapus sejarah; rollback menghasilkan pointer/snapshot audit yang dapat dilacak.

- Archive bersifat soft-delete untuk template/invitation penting pada MVP.

# 15. Model Data dan Kontrak JSON

## 15.1 Relational Entities

| **Table**           | **Field utama**                                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------|
| users               | id, email, name, passwordHash/provider, status, createdAt                                               |
| workspaces          | id, name, ownerId, createdAt                                                                            |
| workspace_members   | workspaceId, userId, role                                                                               |
| templates           | id, workspaceId, name, slug, status, draftDocumentJson, schemaVersion                                   |
| template_versions   | id, templateId, versionNo, documentJson, variableSchemaJson, createdBy, createdAt                       |
| invitations         | id, workspaceId, templateVersionId, title, slug, status, dataValuesJson, activePublishedSnapshotId      |
| published_snapshots | id, invitationId, revisionNo, documentJson, dataValuesJson, templateVersionId, publishedAt, publishedBy |
| guests              | id, invitationId, name, tokenHash/tokenId, status, metadataJson                                         |
| rsvps               | id, invitationId, guestId nullable, response, partySize, message, submittedAt                           |
| assets              | id, workspaceId, storageKey, mimeType, width, height, bytes, metadataJson                               |
| audit_logs          | id, workspaceId, actorId, action, entityType, entityId, payloadJson, createdAt                          |

## 15.2 Canonical Document JSON — Contoh Struktur

{  
"schemaVersion": 1,  
"design": { "baseWidth": 390, "tokens": { "colors": {}, "fonts": {} } },  
"variables": \[ ...definitions... \],  
"sections": \[  
{  
"id": "sec_cover",  
"baseHeight": 844,  
"background": { ... },  
"elements": \[  
{  
"id": "el_title",  
"type": "text",  
"frame": { "x": 32, "y": 220, "w": 326, "h": 88, "rotation": 0 },  
"style": { ... },  
"content": { "segments": \[{"bind":"couple.bride.nickname"}, {"text":" & "}, {"bind":"couple.groom.nickname"}\] },  
"animations": { "enter": {"presetId":"charRise", "trigger":"onEnterViewport", ...} }  
},  
{  
"id": "wdg_map",  
"type": "widget",  
"widgetType": "map",  
"frame": { ... },  
"props": { "coordinate": {"bind":"venue.coordinate"}, "label": {"bind":"venue.name"} }  
}  
\]  
}  
\]  
}

## 15.3 Schema Evolution

- schemaVersion wajib di setiap document.

- Perubahan backward-compatible dapat dibaca oleh renderer baru tanpa migrasi destructive.

- Perubahan breaking memerlukan migration function yang pure dan memiliki test fixture.

- Published snapshots lama tetap dapat dirender setelah aplikasi di-upgrade.

# 16. API dan Backend

| **Method** | **Route**                          | **Purpose**                               |
|------------|------------------------------------|-------------------------------------------|
| POST       | /api/templates                     | Create template draft                     |
| GET        | /api/templates/:id                 | Get template + metadata                   |
| PATCH      | /api/templates/:id/draft           | Autosave/update document draft            |
| POST       | /api/templates/:id/validate        | Validate document/schema/bindings         |
| POST       | /api/templates/:id/publish         | Create immutable template version         |
| POST       | /api/invitations                   | Create invitation from template version   |
| PATCH      | /api/invitations/:id/data          | Update data values                        |
| GET        | /api/invitations/:id/preview       | Preview payload/context                   |
| POST       | /api/invitations/:id/publish       | Create published snapshot                 |
| POST       | /api/invitations/:id/guests/import | CSV guest import                          |
| POST       | /api/assets/upload-init            | Create signed upload / validate metadata  |
| GET        | /i/:slug                           | Public invitation page                    |
| POST       | /api/public/rsvp                   | Submit RSVP with invitation/guest context |

## 16.1 API Rules

- Semua write endpoint dashboard memerlukan auth + workspace authorization.

- Gunakan optimistic concurrency atau updatedAt/version field untuk mencegah silent overwrite pada autosave.

- Document JSON divalidasi Zod di server walaupun sudah divalidasi client.

- Public write endpoint seperti RSVP memakai rate limit, schema validation, CSRF strategy yang sesuai arsitektur, dan anti-spam minimum.

- Error response terstruktur: code, message, fieldErrors, requestId.

# 17. UX/UI Editor

- Editor harus tetap usable pada desktop/laptop; output yang didesain tetap mobile.

- Autosave status jelas: Saving…, Saved, Error.

- Panel inspector contextual; jangan menampilkan semua opsi sekaligus.

- Selection state harus terlihat jelas tanpa mengubah output publik.

- Drag/resize tidak boleh memicu full-page rerender yang terasa patah.

- Preview mode harus satu klik dan dapat kembali ke editor tanpa kehilangan state.

- Validation errors mengarahkan user ke section/element/widget yang bermasalah.

- Data mode dan Design mode dapat dipisah agar operator tidak perlu mengubah layout.

## 17.1 Mode Editor

| **Mode**     | **Fokus**            | **Hak utama**                                                        |
|--------------|----------------------|----------------------------------------------------------------------|
| Design Mode  | Membuat template     | Semua elemen, layer, binding, widget, animation.                     |
| Data Mode    | Mengisi invitation   | Form variable + preview; layout terkunci kecuali override diizinkan. |
| Preview Mode | Validasi hasil final | Renderer HTML; pilih guest/viewport; tidak mengedit.                 |

# 18. Non-Functional Requirements

| **ID**         | **Prioritas** | **Requirement**                                                                                                        |
|----------------|---------------|------------------------------------------------------------------------------------------------------------------------|
| NFR-PERF-001   | P0            | Public page interactive cepat pada koneksi mobile wajar; critical content tidak menunggu semua galeri/audio.           |
| NFR-PERF-002   | P0            | Editor drag/resize target terasa 60fps pada template dengan ~100 elemen per section pada perangkat development target. |
| NFR-PERF-003   | P0            | Autosave debounce 0.8–2 detik dan tidak mengirim payload pada setiap pointer move.                                     |
| NFR-REL-001    | P0            | Published snapshot dapat dirender deterministik setelah restart/deploy.                                                |
| NFR-REL-002    | P0            | Kegagalan satu widget tidak membuat seluruh page blank.                                                                |
| NFR-SEC-001    | P0            | Tidak ada arbitrary script/HTML dari data user tanpa sanitization/whitelist.                                           |
| NFR-SEC-002    | P0            | Asset upload divalidasi server dan URL akses mengikuti policy storage.                                                 |
| NFR-A11Y-001   | P1            | Public text semantic, tombol keyboard accessible, alt text untuk image penting, reduced motion.                        |
| NFR-COMP-001   | P0            | Mendukung browser mobile modern: Chrome Android, Safari iOS, dan browser Chromium modern.                              |
| NFR-OBS-001    | P1            | Error server/client penting memiliki requestId dan logging terstruktur.                                                |
| NFR-BACKUP-001 | P1            | Database dan storage mempunyai strategi backup dan restore terdokumentasi sebelum production launch.                   |

# 19. Keamanan dan Privasi

- Gunakan server-side authorization untuk setiap resource berbasis workspace; jangan mengandalkan hidden UI.

- Guest token harus opaque/random; simpan hash jika desain security memilih token bearer yang sensitif.

- Sanitasi semua teks/URL; URL hanya mengizinkan protocol aman yang relevan.

- Tidak mengizinkan user memasukkan arbitrary iframe pada MVP. Embed eksternal harus widget terkontrol.

- Nama tamu, RSVP, dan pesan diperlakukan sebagai data pribadi; batasi field yang disimpan dan sediakan retention policy.

- Public page default noindex agar invitation personal tidak mudah ditemukan search engine.

- Audio/image harus melalui domain/CDN yang dikendalikan atau allowlist.

- Rate limit public RSVP dan endpoint lain yang dapat disalahgunakan.

- Secret storage via environment/secret manager; tidak ditulis ke repository.

# 20. Analytics dan Observability

- Product events minimum: template_created, template_published, invitation_created, invitation_published, preview_opened, public_viewed, map_clicked, rsvp_submitted, music_played.

- Analytics public tidak boleh mengumpulkan data sensitif di luar kebutuhan bisnis tanpa dasar yang jelas.

- Technical telemetry: route latency, public render error rate, upload errors, RSVP errors, autosave failures.

- Published snapshot id dan schemaVersion dicantumkan pada log/error context untuk debugging.

# 21. Testing dan QA

| **Jenis Test**    | **Cakupan**                                                                                                          |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Unit              | Zod schemas, formatters, binding resolver, animation config normalization, scale calculations.                       |
| Component         | Editor inspector, widget runtime, text binding, image element, RSVP form.                                            |
| Integration       | Template save/publish, invitation create/publish, guest import, asset upload.                                        |
| E2E               | Create template → bind variables → add widget → publish → create invitation → data input → publish → open guest URL. |
| Visual regression | Representative template snapshots pada viewport 320, 375, 390, 414, 430.                                             |
| Performance       | Public page with realistic image count; editor with stress fixture elements.                                         |
| Security          | Authorization, injection, unsafe URL, upload MIME spoofing, rate-limit behavior.                                     |
| Migration         | Old schemaVersion fixture tetap render setelah migration code changes.                                               |

# 22. Scope MVP dan Roadmap

## 22.1 MVP (wajib sebelum pilot)

- Auth sederhana + workspace tunggal/roles dasar.

- Template library dan versioning.

- Editor: section, text, image, shape, transform, layer, undo/redo.

- Variable schema + binding + invitation data form.

- Widgets P0: map, countdown, guest greeting.

- Animations P0: enter + text per character/word + viewport trigger.

- Asset upload image.

- HTML public renderer, public slug, guest token, preview.

- Invitation publish snapshot.

- Core E2E tests dan mobile viewport visual checks.

## 22.2 P1 Setelah MVP

- RSVP, gallery, music, gift, event schedule widgets.

- CSV guest import dan dashboard RSVP.

- Advanced animation/exit/loop, animation presets library.

- Asset library search/filter, audio upload.

- Template upgrade flow dan rollback UI.

- Design tokens editor dan reusable style presets.

- Advanced layer grouping/alignment/distribute.

## 22.3 P2 / Roadmap

- Team collaboration lebih lanjut, comments, approvals.

- Marketplace/template sharing.

- Custom domains.

- Analytics dashboard lengkap.

- Localization/multi-language invitation.

- Conditional sections/data logic yang lebih canggih.

- AI-assisted layout/content sebagai fitur terpisah bila dibutuhkan.

# 23. Acceptance Criteria

| **ID** | **Acceptance Criterion**                                                                                                                 |
|--------|------------------------------------------------------------------------------------------------------------------------------------------|
| AC-01  | Designer dapat membuat template minimal 3 section dengan text, image, shape, map, countdown, dan guest greeting tanpa coding.            |
| AC-02  | Nama pengantin yang terikat variable dapat diganti dari data form dan berubah di seluruh elemen terkait tanpa edit manual satu per satu. |
| AC-03  | Template yang sama dapat dipakai membuat dua invitation dengan data berbeda tanpa saling memengaruhi.                                    |
| AC-04  | Map widget menerima koordinat dan klik membuka Google Maps ke lokasi yang sesuai.                                                        |
| AC-05  | Countdown menghitung waktu sesuai timezone yang dipilih.                                                                                 |
| AC-06  | Guest link A dan B menampilkan nama tamu berbeda pada template yang sama.                                                                |
| AC-07  | Text dapat diberi animasi masuk per huruf dan replay di preview.                                                                         |
| AC-08  | Elemen dekorasi dapat drag, resize, rotate, reorder, lock, dan hide di editor.                                                           |
| AC-09  | Publish invitation menghasilkan URL publik yang dapat dibuka tanpa login.                                                                |
| AC-10  | Setelah publish, mengubah draft tidak mengubah tampilan URL live sampai republish.                                                       |
| AC-11  | Public page dirender sebagai HTML/DOM; text bukan bitmap/canvas-only.                                                                    |
| AC-12  | Layout terlihat proporsional dan tidak overflow horizontal pada viewport 320, 375, 390, 414, 430 px.                                     |
| AC-13  | Jika animation dimatikan oleh prefers-reduced-motion, konten tetap terlihat dan usable.                                                  |
| AC-14  | Document JSON invalid ditolak server dan error menunjuk field/element yang bermasalah.                                                   |
| AC-15  | E2E golden path berjalan di CI sebelum release production.                                                                               |

# 24. Risiko dan Mitigasi

| **Risiko**                           | **Level** | **Mitigasi**                                                                                                    |
|--------------------------------------|-----------|-----------------------------------------------------------------------------------------------------------------|
| Perbedaan ukuran teks Canvas vs DOM  | High      | Gunakan canonical frame; preview final via HTML renderer; visual regression tests; font loading dikontrol.      |
| Absolute positioning rapuh di mobile | High      | Base width 390 + uniform scale per section; target viewport terbatas; interactive widget tetap di bounding box. |
| Template schema berkembang           | High      | schemaVersion + migration + immutable snapshots + fixtures.                                                     |
| Animasi menyebabkan jank             | Medium    | Transform/opacity-first animations; lazy initialize; reduced motion; profiling.                                 |
| Autoplay audio diblok browser        | Expected  | UI play/pause selalu tersedia; jangan bergantung pada autoplay.                                                 |
| Guest link mudah ditebak             | Medium    | Opaque random token; jangan sequential ID.                                                                      |
| Large assets membuat page lambat     | High      | Upload limits, compression/variants, responsive images, lazy loading, CDN.                                      |
| Autosave conflict                    | Medium    | Version/updatedAt concurrency check + conflict UX.                                                              |
| Widget error merusak page            | Medium    | Error boundary per widget + runtime validation.                                                                 |

# 25. Definition of Done dan Change Control

## 25.1 Definition of Done per Feature

- Requirement ID tercantum pada issue/PR.

- Functional behavior memenuhi acceptance criterion yang relevan.

- TypeScript strict tanpa error; lint/typecheck/test lulus.

- Server validation dan authorization tersedia untuk operasi write.

- Unit/component/integration test sesuai risiko fitur.

- Editor dan public renderer tidak mengalami regression visual yang diketahui.

- Loading/error/empty state tersedia.

- Tidak ada data klien atau secret hardcoded.

- Dokumentasi contract/schema diperbarui bila berubah.

## 25.2 Change Control

PRD versi 1.0 ini adalah baseline. Fitur atau behavior yang bertentangan dengan PRD tidak boleh ditambahkan secara diam-diam selama implementasi. Perubahan harus dicatat sebagai Change Request (CR) dengan alasan, requirement yang terdampak, risiko migrasi, perubahan acceptance criteria, dan keputusan approve/reject. Setelah disetujui, PRD dinaikkan versi dan prompt implementasi fase berikutnya harus mengacu ke versi terbaru.

# Lampiran A — Keyboard Shortcuts Awal

| **Shortcut**             | **Aksi**                     |
|--------------------------|------------------------------|
| Ctrl/Cmd + Z             | Undo                         |
| Ctrl/Cmd + Shift + Z / Y | Redo                         |
| Ctrl/Cmd + C             | Copy                         |
| Ctrl/Cmd + V             | Paste                        |
| Ctrl/Cmd + D             | Duplicate                    |
| Delete/Backspace         | Delete selection             |
| Arrow                    | Nudge 1 px                   |
| Shift + Arrow            | Nudge 10 px                  |
| Esc                      | Deselect/close tool          |
| Space + drag             | Pan artboard jika diperlukan |

# Lampiran B — Status dan State Machine Ringkas

| **Entitas** | **State**                              | **Transisi penting**                                                      |
|-------------|----------------------------------------|---------------------------------------------------------------------------|
| Template    | draft → published/versioned → archived | Publish membuat TemplateVersion; edit berikutnya kembali pada draft baru. |
| Invitation  | draft → published → archived           | Publish membuat PublishedSnapshot; republish menambah revision.           |
| Guest       | active → responded → archived          | RSVP mengubah response metadata, tidak menghapus guest.                   |
| Asset       | uploading → ready → failed/archived    | Hanya ready asset boleh dipakai renderer.                                 |

# Lampiran C — Validasi Template Sebelum Publish

- Semua element id unik di seluruh document.

- Semua binding key terdapat di variable schema atau runtime guest context yang valid.

- Semua required variables memiliki default atau akan diwajibkan di invitation form.

- Widget type terdaftar dan props lolos schema.

- Asset references valid/ready.

- Frame numbers finite dan ukuran positif.

- Animation preset/trigger valid dan duration dalam batas yang ditentukan.

- Tidak ada URL/protocol yang dilarang.

- Tidak ada overflow horizontal yang terdeteksi pada preview target viewport utama.

# Lampiran D — Open Questions yang Tidak Menghalangi MVP

- Apakah invitation perlu custom domain pada fase komersial?

- Apakah operator boleh melakukan design override per invitation atau hanya data changes? Baseline: limited override dapat ditunda ke P1.

- Apakah QR code invitation dibutuhkan di dashboard? Dapat ditambahkan sebagai utility tanpa mengubah renderer.

- Berapa batas storage/file per workspace dan kebijakan retensi?

- Apakah RSVP harus mendukung multiple event choices atau cukup satu response per invitation pada versi awal?
