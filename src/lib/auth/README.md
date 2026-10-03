# lib/auth

Authentication (sesi server-side) dan workspace authorization. **Fase: F2 (selesai).**

- PRD: FR-AUTH-001, §16.1, §19. ADR: `docs/decisions/0004-auth-authorization-and-template-publishing.md`.
- Semua write endpoint dashboard memerlukan auth + workspace authorization di server.
- Public invitation tidak memerlukan login.

## Modul

| File               | Isi                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `password.ts`      | Hash scrypt (parameter tertanam di hash); `verifyPassword` tidak pernah throw                                 |
| `sessions.ts`      | `login`, `logout`, `validateSession`, `createSession`; token opaque 32 byte, hanya SHA-256 disimpan           |
| `throttle.ts`      | `LoginThrottle` (5 gagal / 15 menit per email, in-memory)                                                     |
| `authorization.ts` | `CAPABILITIES`, `roleCan`, `requireCapability`; owner/admin semua, designer read/write/publish, operator read |
| `redirect.ts`      | `safeNextPath` (anti open redirect)                                                                           |
| `server.ts`        | `server-only`: cookie `session`, `requireUser`, `getWorkspaceContext`, `signIn`, `signOut`                    |

## Aturan

- Cookie HttpOnly, SameSite=Lax, `Secure` di production (kecuali `AUTH_INSECURE_COOKIES=1`, hanya e2e/lokal http).
- Sesi absolut 7 hari; logout menghapus baris sesi di DB.
- `src/proxy.ts` hanya gerbang optimistik; otorisasi sebenarnya selalu di server (service/DAL).
- Tidak ada sign-up; akun dibuat via seed/admin.
