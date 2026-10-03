# ADR 0004 — Auth, Otorisasi Workspace, dan Publish Template

- **Status:** Accepted
- **Tanggal:** 2026-10-03
- **Fase:** 2 — Auth, Workspace, dan Template Library
- **Requirement terkait:** FR-AUTH-001, FR-TPL-001..003, FR-AUD-001, P-06, NFR-SEC-001, PRD §4

## Keputusan

### 1. Auth buatan sendiri, tanpa dependensi baru

Stack tidak memiliki library auth, dan kebutuhan F2 kecil (login/logout, sesi
aman, dashboard terlindungi). Dipilih implementasi minimal berdasarkan panduan
Next.js (Server Actions + cookie + DAL), dengan primitif `node:crypto`:

| Aspek         | Keputusan                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------- |
| Password      | `scrypt` (N=2^16, r=8, p=1) + salt acak; parameter ikut tersimpan di hash                    |
| Sesi          | Server-side: token acak 32 byte; **hanya SHA-256-nya** disimpan di tabel `sessions`          |
| Kedaluwarsa   | Absolut 7 hari; logout menghapus baris sesi (token curian langsung tidak berlaku)            |
| Cookie        | `HttpOnly`, `SameSite=Lax`, `Secure` di production, `Path=/`                                 |
| Login         | Pesan galat sama untuk email salah/password salah/akun nonaktif; hash dummy menyamakan waktu |
| Brute force   | Throttle in-memory per email: 5 gagal / 15 menit                                             |
| Open redirect | `next` hanya path internal (`safeNextPath`)                                                  |

Tidak ada sign-up publik: akun dibuat oleh seed/admin (di luar scope F2).
Jika kelak butuh SSO/MFA, ganti lapisan `src/lib/auth` dengan library tanpa
mengubah service template (service hanya menerima `Actor { userId }`).

### 2. Lapisan pertahanan (defense in depth)

1. `proxy.ts` — pemeriksaan **optimistik** (cookie ada atau tidak) hanya untuk
   `/dashboard/**`. Tidak pernah memverifikasi sesi dan tidak pernah mengalihkan
   dari `/login` (cookie basi akan membuat loop).
2. `requireUser()` / `getCurrentUser()` — verifikasi sesi ke DB di layout,
   halaman, server action, dan route handler.
3. Service template — otorisasi workspace + role di **setiap** operasi.
4. Repository — query berscope `workspaceId` untuk operasi library.
5. DB — trigger immutability, FK, CHECK.

### 3. Otorisasi workspace

- Role → kapabilitas (PRD §4): `owner`/`admin` semua; `designer` baca/tulis/publish;
  `operator` hanya baca template.
- Operasi **berdasar workspace** (list/create), non-anggota → `ForbiddenError`.
- Operasi **berdasar id template**, non-anggota → `TemplateNotFoundError`
  (keberadaan template tidak bocor lintas workspace; UI menampilkan 404/not-found,
  API 404). Anggota dengan role kurang → `ForbiddenError` (403).
- Workspace aktif UI = keanggotaan pertama (pemilih workspace di luar scope F2).

### 4. Lifecycle template dan publish

- `status`: `draft` → `published` → `archived`. Setelah publish, draft **tetap bisa
  diedit**; indikator `published-with-changes` dihitung dari
  `revision > published_revision`.
- Optimistic concurrency: `revision` naik di setiap simpan draft; simpan dengan
  revisi usang → `RevisionConflictError`. Rename tidak menaikkan revisi.
- **Publish** (satu transaksi): kunci baris template (`FOR UPDATE`), cek
  `expectedRevision`, validasi skema + semantik (widget tak dikenal = pemblokir),
  tolak jika tidak ada perubahan sejak publish terakhir, sisipkan
  `template_versions` dengan `versionNo = max + 1`, perbarui state template, tulis
  audit — atomik. Publish bersamaan diserialisasi; versionNo tidak pernah ganda.
- **Immutability di service/API**: tidak ada fungsi update/delete untuk version
  (diuji), ditambah trigger DB dari F1.
- Duplicate menyalin **draft saat ini** menjadi template baru tanpa riwayat versi.
- Archive bersifat soft (read-only). **Restore ditunda** (tidak ada di scope F2).

### 5. Audit (FR-AUD-001)

`audit_logs` (append-only) menerima: `auth.login`, `auth.logout`, `template.create`,
`template.rename`, `template.duplicate`, `template.archive`, `template.publish`
— berisi actor, action, entity, metadata, timestamp. Entri ditulis dalam
transaksi yang sama dengan perubahan; operasi yang ditolak/gagal tidak menulis audit.

### 6. Endpoint validasi

`POST /api/templates/:id/validate` — body opsional `{document}`; tanpa body,
memvalidasi draft tersimpan. Menjalankan skema Zod kanonik + validasi semantik.
Tidak menyimpan apa pun. 401 tanpa sesi, 403 role/origin salah, 404 template tidak
terlihat, 413 payload > 2 MB, 400 JSON rusak; pengecekan `Origin` untuk CSRF.

## Konsekuensi / utang teknis

- Throttle in-memory tidak dibagi antar instance; perlu store bersama di produksi
  multi-instance. Kunci per-email dapat dipakai untuk mengunci akun korban
  (trade-off DoS vs brute force); header IP tidak dipercaya karena dapat dipalsukan.
- Belum ada rotasi sesi, "logout dari semua perangkat", reset password, MFA.
- Widget registry produksi masih kosong (F6): dokumen berisi widget tidak bisa
  dipublish sampai widget terdaftar. Ini disengaja (aman secara default).
