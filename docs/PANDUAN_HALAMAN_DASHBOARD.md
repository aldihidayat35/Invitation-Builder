# Panduan Lengkap Halaman Dashboard & Arsitektur Sistem Digital Invitation Builder

Dokumen ini mendeskripsikan secara menyeluruh setiap rute, antarmuka, hak akses (RBAC), alur kerja pemesanan (*order pipeline*), etalase toko seller (*storefront*), serta ketentuan pengelolaan data sesuai mandat Pemilik Platform (Owner).

---

## Ketentuan Akses & Pengelolaan Data (Mandat Owner)

1. **Admin memiliki akses penuh** untuk mengelola, mendesain di kanvas visual, mengubah data mempelai, dan menerbitkan (*publish*) website undangan customer.
2. **Seller berperan sebagai pihak kedua** yang membantu proses pemesanan (*order intake & assistance*), tetapi **TIDAK memiliki akses untuk mengubah data website undangan** yang menjadi kewenangan mutlak Admin (*strictly read-only / locked* bagi seller).
3. **Perubahan data tertentu hanya dapat dilakukan oleh Admin** untuk menjaga keamanan, integritas visual, dan keakuratan data customer.
4. **Setiap seller memiliki website toko publik / domain khusus** (`/seller/[slug]` atau custom domain) sebagai identitas resmi agensi dan sarana melayani pemesanan langsung dari calon pengantin.
5. **Website undangan yang dibuat untuk customer tetap menjadi bagian dari sistem utama platform** (`/i/[slug]`) dan dikelola berdasarkan hak akses masing-masing pihak.
6. **Sistem kredit kuota, ledger koin, top-up manual, dan rekening bank platform telah dihapus sepenuhnya** dari sistem demi efisiensi operasional dan kepastian layanan terpusat.

---

## Daftar Isi
1. [Struktur Peran Pengguna & Hirarki Akses (RBAC)](#1-struktur-peran-pengguna--hirarki-akses-rbac)
2. [Pipa Alur Kerja Pemesanan (Order Flow Lifecycle)](#2-pipa-alur-kerja-pemesanan-order-flow-lifecycle)
3. [Etalase Toko Publik Seller (/seller/[slug])](#3-etalase-toko-publik-seller-sellerslug)
4. [Halaman Umum & Workspace (/dashboard/*)](#4-halaman-umum--workspace-dashboard)
   - [/dashboard — Ringkasan Workspace](#dashboard--ringkasan-workspace)
   - [/dashboard/templates — Katalog Template Desain](#dashboardtemplates--katalog-template-desain)
   - [/dashboard/templates/[id] — Detail & Kontrol Versi Template](#dashboardtemplatesid--detail--kontrol-versi-template)
   - [/editor/[id] — Visual Canvas Editor (Canva-like Engine)](#editorid--visual-canvas-editor-canva-like-engine)
   - [/dashboard/invitations — Daftar Website Undangan](#dashboardinvitations--daftar-website-undangan)
   - [/dashboard/invitations/[id] — Detail & Data Mempelai (Admin Exclusive Write)](#dashboardinvitationsid--detail--data-mempelai-admin-exclusive-write)
   - [/dashboard/invitations/[id]/preview — Pratinjau Undangan Interaktif](#dashboardinvitationsidpreview--pratinjau-undangan-interaktif)
   - [/dashboard/invitations/[id]/rsvp — Manajemen Tamu & RSVP](#dashboardinvitationsidrsvp--manajemen-tamu--rsvp)
5. [Portal Mitra Reseller / Seller (/dashboard/reseller/*)](#5-portal-mitra-reseller--seller-dashboardreseller)
   - [/dashboard/reseller — Ringkasan Performa & Pesanan Masuk](#dashboardreseller--ringkasan-performa--pesanan-masuk)
   - [/dashboard/reseller/orders — Manajemen Pesanan Customer Masuk](#dashboardresellerorders--manajemen-pesanan-customer-masuk)
   - [/dashboard/reseller/storefront — Tautan & Konfigurasi Toko Publik](#dashboardresellerstorefront--tautan--konfigurasi-toko-publik)
   - [/dashboard/reseller/clients — Daftar Klien Pasangan Pengantin](#dashboardresellerclients--daftar-klien-pasangan-pengantin)
   - [/dashboard/reseller/branding — Kustomisasi White-Label & Domain Toko](#dashboardresellerbranding--kustomisasi-white-label--domain-toko)
6. [Portal Super Admin / Owner (/dashboard/admin/*)](#6-portal-super-admin--owner-dashboardadmin)
   - [/dashboard/admin/orders — Pusat Pipa Pesanan Seluruh Platform](#dashboardadminorders--pusat-pipa-pesanan-seluruh-platform)
   - [/dashboard/admin/resellers — Manajemen Mitra Seller & Domain](#dashboardadminresellers--manajemen-mitra-seller--domain)
7. [Tabel Matriks Hak Akses Antar Peran](#7-tabel-matriks-hak-akses-antar-peran)

---

## 1. Struktur Peran Pengguna & Hirarki Akses (RBAC)

Platform memisahkan tanggung jawab secara tegas (*Separation of Concerns*):

```mermaid
graph TD
    Admin["Super Admin / Platform Owner (owner)"] -->|Otoritas Penuh Desain & Penerbitan Undangan| MainSystem["Platform Undangan (/i/[slug])"]
    Seller["Mitra Seller (reseller)"] -->|Memiliki Website Toko & Terima Booking| Storefront["Toko Seller (/seller/[slug])"]
    Customer["Calon Pengantin (Customer)"] -->|Kirim Pesanan & Hubungi Seller| Storefront
    Storefront -->|Tercatat di Pipa Pesanan| Admin
    Admin -->|Proses Pesanan & Hubungkan Undangan| Customer
    Seller -.->|Terkunci: Dilarang Mengubah Undangan (Admin Authority Lock)| MainSystem
```

1. **Super Admin / Platform Owner (`owner`)**:
   - Memiliki wewenang mutlak atas seluruh template desain, visual editor, manipulasi data undangan, dan penerbitan website undangan customer.
   - Mengelola dan memproses seluruh antrean pesanan dari semua seller.
2. **Mitra Seller (`reseller`)**:
   - Berperan sebagai garda depan pemasaran dan asisten pemesanan customer.
   - Memiliki website toko online publik (`/seller/[slug]` atau custom domain) untuk menjangkau calon pengantin.
   - Dapat melihat antrean pesanan customer yang masuk lewat tokonya.
   - **Terkunci secara ketat (*Admin Authority Lock*)**: Tidak memiliki izin untuk mengedit atau menerbitkan data website undangan customer.
3. **Klien Pasangan Pengantin (`client` / customer)**:
   - Pasangan calon pengantin yang memesan melalui seller atau platform utama.

---

## 2. Pipa Alur Kerja Pemesanan (Order Flow Lifecycle)

1. **Eksplorasi Katalog**: Customer mengunjungi website toko seller (`/seller/[slug]`). Customer melihat katalog template premium, informasi paket, dan kontak WhatsApp seller.
2. **Pengisian Booking**: Customer mengisi form booking (nama mempelai, tanggal akad/resepsi, lokasi, kontak WhatsApp, catatan khusus, dan tema yang dipilih).
3. **Pencatatan Pesanan**:
   - Pesanan tersimpan di database dalam tabel `customer_orders` dengan status awal `new` dan terafiliasi dengan ID seller.
   - Customer diarahkan ke WhatsApp seller dengan pesan resmi yang telah terformat otomatis.
4. **Pemrosesan oleh Admin**:
   - Admin melihat pesanan di `/dashboard/admin/orders`.
   - Admin mengubah status menjadi `in_progress`, membuat atau menduplikasi website undangan di visual editor, dan mengisi data mempelai sesuai instruksi.
5. **Penerbitan & Penyelesaian**:
   - Admin menerbitkan (*publish*) website undangan di `/dashboard/invitations/[id]`.
   - Admin menautkan `invitationId` ke pesanan dan menandai status sebagai `completed`.
   - Customer menerima tautan undangan resmi platform (`/i/[slug]`) dengan identitas agensi seller tetap terjaga (*white-label*).

---

## 3. Etalase Toko Publik Seller (`/seller/[slug]`)

- **Akses**: Publik (Bebas diakses calon pengantin tanpa login).
- **Tujuan**: Halaman etalase toko mandiri bagi setiap seller sebagai sarana branding dan penerimaan order digital.
- **Fitur Utama**:
  - **Identitas Agensi**: Menampilkan logo agensi, nama brand seller, dan tombol kontak WhatsApp resmi.
  - **Katalog Tema Desain**: Grid kartu tema undangan aktif lengkap dengan thumbnail preview.
  - **Formulir Pemesanan Interaktif**: Form input data calon pengantin dengan validasi real-time.
  - **Redirect WhatsApp Otomatis**: Menghubungkan langsung pembeli ke nomor WhatsApp seller dengan teks konfirmasi yang rapi.
  - **Dukungan Domain Khusus**: Dapat diakses via domain kustom milik seller (contoh: `undangan.agensiku.com`).

---

## 4. Halaman Umum & Workspace (`/dashboard/*`)

### `/dashboard` — Ringkasan Workspace
- **Akses**: Semua pengguna terotentikasi.
- **Fitur**: Ringkasan template aktif, undangan tersimpan, dan panduan langkah kerja.

### `/dashboard/templates` — Katalog Template Desain
- **Akses**: Semua pengguna terotentikasi.
- **Fitur**: Menampilkan pustaka desain undangan. Admin memiliki tombol edit kanvas dan publikasi template; Seller memiliki akses pratinjau.

### `/dashboard/templates/[id]` — Detail & Kontrol Versi Template
- **Akses**: Admin / Workspace Owner.
- **Fitur**: Pengaturan variabel dinamis, skema metadata, dan rilis versi desain (*version control*).

### `/editor/[id]` — Visual Canvas Editor (Canva-like Engine)
- **Akses**: Khusus Admin / Desainer Platform.
- **Fitur**: Kanvas visual interaktif, manipulasi elemen multi-layer, animasi frame, tipografi Google Fonts, pemilihan palet warna tema, pengaturan opening screen, galeri media, dan transisi layar.

### `/dashboard/invitations` — Daftar Website Undangan
- **Akses**: Semua anggota workspace.
- **Fitur**: Menampilkan daftar seluruh website undangan yang dibuat di workspace.

### `/dashboard/invitations/[id]` — Detail & Data Mempelai (Admin Exclusive Write)
- **Akses**: Admin memiliki izin edit & terbit (*write & publish*); Seller berstatus *read-only*.
- **Fitur**:
  - Formulir pengisian data spesifik mempelai (nama lengkap, nama panggilan, orang tua, waktu akad/resepsi, lokasi Google Maps, rekening amplop digital).
  - Tombol **"Terbitkan Undangan"** (*Publish*) bebas kuota bagi Admin.

### `/dashboard/invitations/[id]/preview` — Pratinjau Undangan Interaktif
- **Akses**: Semua pengguna dengan akses baca.
- **Fitur**: Simulator smartphone menampilkan hasil render HTML DOM murni dengan animasi pembuka, musik latar, dan transisi seksi.

### `/dashboard/invitations/[id]/rsvp` — Manajemen Tamu & RSVP
- **Akses**: Pemilik undangan / Admin.
- **Fitur**: Manajemen daftar nama tamu, impor CSV massal, pembagian sesi, pembuatan tautan personal (`?to=Nama+Tamu`), serta moderasi ucapan doa restu.

---

## 5. Portal Mitra Reseller / Seller (`/dashboard/reseller/*`)

Menu ini khusus ditampilkan bagi pengguna dengan peran `reseller`.

### `/dashboard/reseller` — Ringkasan Performa & Pesanan Masuk
- **Akses**: Mitra Reseller.
- **Fitur**:
  - Kartu metrik: Total Pesanan Masuk, Pesanan Baru, Sedang Diproses, dan Pesanan Selesai.
  - Link langsung ke etalase toko publik (`/seller/[slug]`).
  - Navigasi cepat ke manajemen pesanan dan pengaturan branding.

### `/dashboard/reseller/orders` — Manajemen Pesanan Customer Masuk
- **Akses**: Mitra Reseller.
- **Fitur**:
  - Tabel pesanan customer yang masuk khusus melalui toko seller bersangkutan.
  - Informasi lengkap: nama customer, calon pengantin, tanggal acara, kontak WhatsApp, catatan, dan status pengerjaan oleh Admin.
  - Badge informasi hak akses: Menegaskan bahwa pembuatan dan penerbitan website undangan dikerjakan langsung oleh Admin platform.

### `/dashboard/reseller/storefront` — Tautan & Konfigurasi Toko Publik
- **Akses**: Mitra Reseller.
- **Fitur**:
  - Pratinjau link website toko publik seller.
  - Petunjuk integrasi custom domain atau sub-domain pribadi.

### `/dashboard/reseller/clients` — Daftar Klien Pasangan Pengantin
- **Akses**: Mitra Reseller.
- **Fitur**: Daftar akun pasangan pengantin yang terdaftar di bawah naungan agensi seller.

### `/dashboard/reseller/branding` — Kustomisasi White-Label & Domain Toko
- **Akses**: Mitra Reseller.
- **Fitur**:
  - Pengaturan nama agensi dan upload logo toko.
  - Nomor WhatsApp resmi layanan pelanggan.
  - Konfigurasi domain khusus (*custom domain*) untuk etalase toko publik seller.

---

## 6. Portal Super Admin / Owner (`/dashboard/admin/*`)

Menu ini khusus ditampilkan bagi pengguna dengan peran platform `owner`.

### `/dashboard/admin/orders` — Pusat Pipa Pesanan Seluruh Platform
- **Akses**: Super Admin / Owner.
- **Fitur**:
  - Tabel antrean seluruh pesanan customer dari seluruh seller di platform.
  - Filter status pesanan: *Semua*, *Baru (New)*, *Diproses (In Progress)*, *Selesai (Completed)*, *Dibatalkan (Cancelled)*.
  - Modal aksi pembaruan status: Memperbarui tahapan kerja, menambahkan catatan internal admin, dan menautkan ID undangan resmi yang telah selesai dibuat.
  - Akses langsung untuk menghubungi WhatsApp customer atau seller terkait.

### `/dashboard/admin/resellers` — Manajemen Mitra Seller & Domain
- **Akses**: Super Admin / Owner.
- **Fitur**:
  - Tabel seluruh mitra seller: nama pemilik, nama agensi, slug etalase toko, custom domain, kontak WhatsApp, dan status aktif.
  - Tombol tambah mitra seller baru (nama, email, password, slug, domain).
  - Tautan langsung untuk membuka website toko masing-masing seller.
  - Toggle status keaktifan akun seller (*suspend / activate*).

---

## 7. Tabel Matriks Hak Akses Antar Peran

| Halaman / Fitur | Path URL | Customer (`client`) | Mitra Seller (`reseller`) | Super Admin (`owner`) |
| :--- | :--- | :---: | :---: | :---: |
| **Etalase Toko Publik Seller** | `/seller/[slug]` | ✅ Bebas Akses (Order) | ✅ (Pemilik Toko) | ✅ |
| **Ringkasan Workspace** | `/dashboard` | ✅ *(White-label)* | ✅ | ✅ |
| **Katalog Template Desain** | `/dashboard/templates` | ✅ (Lihat) | ✅ (Lihat) | ✅ (Kelola Penuh) |
| **Visual Canvas Editor** | `/editor/[id]` | ❌ | ❌ *(Terkunci)* | ✅ (Akses Penuh) |
| **Daftar Undangan** | `/dashboard/invitations` | ✅ | ✅ (Lihat Saja) | ✅ (Kelola Penuh) |
| **Edit Data & Terbitkan Undangan** | `/dashboard/invitations/[id]` | ❌ *(Dikelola Admin)* | ❌ *(Admin Authority Lock)* | ✅ (Bebas / Tanpa Kuota) |
| **Pratinjau Undangan Interaktif** | `/dashboard/invitations/[id]/preview` | ✅ | ✅ | ✅ |
| **Manajemen Tamu & RSVP** | `/dashboard/invitations/[id]/rsvp` | ✅ | ✅ | ✅ |
| **Ringkasan & Metrik Seller** | `/dashboard/reseller` | ❌ | ✅ | ❌ |
| **Pesanan Toko Seller** | `/dashboard/reseller/orders` | ❌ | ✅ (Hanya Miliknya) | ❌ |
| **Informasi Toko Publik Seller** | `/dashboard/reseller/storefront` | ❌ | ✅ | ❌ |
| **Kustomisasi Branding & Domain** | `/dashboard/reseller/branding` | ❌ | ✅ | ❌ |
| **Pusat Pipa Pesanan Platform** | `/dashboard/admin/orders` | ❌ | ❌ | ✅ (Semua Pesanan) |
| **Manajemen Mitra Seller** | `/dashboard/admin/resellers` | ❌ | ❌ | ✅ |
