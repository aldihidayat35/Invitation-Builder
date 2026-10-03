# Audit Keamanan â€” Fase 11

Referensi PRD: NFR-SEC-001, NFR-SEC-002, Â§13 (keamanan), P-04.

## 1. Authorization (workspace isolation)

| Area                        | Kontrol                                                         | Bukti tes                                                            |
| --------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dashboard & server actions  | Sesi wajib; redirect ke login jika tidak ada                    | `tests/unit/auth/auth.test.ts`, `tests/e2e/templates.spec.ts`        |
| Template/version            | Semua query difilter `workspaceId`; lintas workspace â†’ NotFound | integration template tests                                           |
| Invitation/guest/publish    | Idem; publish & rollback hanya milik workspace                  | `tests/integration/invitation-service.test.ts`, `publishing.test.ts` |
| RSVP list/import/export CSV | Dibatasi workspace pemilik invitation                           | `tests/integration/rsvp-import.test.ts`                              |
| Asset                       | Upload & daftar per workspace                                   | asset integration tests                                              |
| Endpoint publik             | Hanya `/i/[slug]`, `/api/public/rsvp`, `/api/health`, file asset       | `tests/e2e/golden-path.spec.ts`                                      |

## 2. Input, URL, escaping, MIME, widget props

- URL aman (skema allowlist, tanpa `javascript:`): `tests/unit/schema/url.test.ts`.
- Escaping teks (tanpa `dangerouslySetInnerHTML` dari data user): `document-renderer.test.tsx`.
- MIME sniffing byte-level, bukan percaya header klien: `src/lib/storage/image-sniff.ts`, `tests/unit/assets/sniff-fit.test.ts`.
- Props widget divalidasi Zod: `p0-widgets.test.ts`, `p1-widgets.test.tsx`.
- Document JSON invalid ditolak server per-field (AC-14).

## 3. Rate limit & error handling

- `POST /api/public/rsvp`: limiter per-IP/token, batas ukuran body, error generik + `requestId`.
- Header keamanan global (`next.config.ts`): `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`; `poweredByHeader` mati.
- Halaman publik `noindex`; cookie sesi HttpOnly + SameSite=Lax.

## 4. Secret scan

Pemindaian file ter-track (pola AWS key, private key, `sk_live`, `ghp_`, kredensial postgres) â†’ **tidak ada temuan**. Hanya `.env.example` yang ter-track; `.env*` dan `/.data/` di-ignore.

## 5. Risiko diterima / utang

| Item                                                    | Status                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| CSP ketat (butuh nonce) belum diaktifkan                | Utang â€” tindak lanjut                                       |
| Deadline RSVP hanya divalidasi di klien                 | Utang â€” validasi server                                     |
| Rate limiter in-memory per proses (tidak terdistribusi) | Diterima untuk MVP; ganti store bersama saat multi-instance |
| `/api/assets/[id]/file` publik tanpa rate limit         | Utang â€” pasang CDN/limit                                    |

Tidak ada blocker keamanan terbuka yang belum diterima secara tertulis.
