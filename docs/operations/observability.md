# Observability & Monitoring Minimum

## Sinyal yang sudah ada di aplikasi

- **Log terstruktur** (JSON per baris, `src/lib/logger.ts`): `level, time, message, requestId, route, errorName, errorMessage`.
  Key sensitif (`token|password|secret|cookie|authorization|session`) otomatis `[redacted]`.
- **requestId**: dibaca dari `X-Request-Id` (jika aman) atau dibuat baru; dikembalikan di header `X-Request-Id`
  dan dalam body error API (`requestId`). Pengguna cukup menyebut id ini ke support.
- **Health**: `GET /api/health` → `200 {"status":"ok"}` atau `503` (cek DB `select 1`). Dipakai load balancer & smoke test.
- **Security event ledger**: kegagalan login dan rate limit disimpan append-only di `security_events`.
  Email dan alamat klien dipseudonimkan dengan SHA-256 + `SECURITY_EVENT_HASH_SALT`; nilai mentah tidak disimpan.
- **Operations control center**: `/dashboard/admin/operations` menampilkan sinyal keamanan 24 jam,
  antrean produksi/SLA, domain, privasi, recovery drill, dan pencarian audit lintas workspace.
- **Telemetry integration point**: `src/lib/telemetry.ts` (`setTelemetrySink`) + `src/instrumentation.ts`
  (`onRequestError` untuk error RSC/route/server action). Belum ada vendor: pasang Sentry/OpenTelemetry dengan
  satu panggilan `setTelemetrySink(...)` di `instrumentation.ts` setelah vendor dipilih.

## Monitor minimal (alert) yang harus dibuat di platform hosting/log

| Metrik                           | Sumber                                                   | Ambang awal                      |
| -------------------------------- | -------------------------------------------------------- | -------------------------------- |
| Error rate (5xx)                 | log `level=error` / metrik load balancer                 | > 2% selama 5 menit              |
| Latensi API (p95)                | metrik platform                                          | `/api/public/rsvp` p95 > 1 detik |
| Public render error              | log `unhandled request error` dengan route `/i/[slug]`   | ≥ 1 dalam 5 menit                |
| Upload error                     | log error route `/api/assets/*`                          | > 5 dalam 10 menit               |
| RSVP error                       | log `rsvp submit failed` & status 5xx `/api/public/rsvp` | ≥ 3 dalam 5 menit                |
| Rate limit RSVP (indikasi abuse) | log `rsvp rate limited`                                  | lonjakan > 100/mnt               |
| Health                           | probe `/api/health` tiap 1 menit                         | 3 kegagalan berturut-turut       |
| Failed login unik                | tabel `security_events`, `auth.login_failed`             | > 20 subjek/15 menit             |
| Login rate-limited               | tabel `security_events`, `auth.rate_limited`             | ≥ 5 dalam 10 menit               |
| Order produksi overdue           | `/dashboard/admin/operations`                            | ≥ 1 melewati `due_at`            |

## Catatan

- Rate limiter RSVP bersifat per-proses; untuk banyak instance gunakan limit di edge/WAF atau store bersama.
- Rate limiter login juga masih per-proses. Sebelum horizontal scaling, pindahkan state limiter ke Redis/edge WAF;
  ledger database tetap menjadi bukti terpusat setelah event terjadi.
- Jangan log body RSVP (ada nama & pesan tamu); log hanya requestId/route/status.
