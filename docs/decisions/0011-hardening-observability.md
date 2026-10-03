# ADR 0011 — Hardening & Observability

Status: Diterima (Fase 11)

## Konteks

Fase 11 butuh jejak error yang bisa ditelusuri, header keamanan, dan titik integrasi telemetri tanpa mengunci vendor.

## Keputusan

1. `requestId` per request API (`X-Request-Id`), disertakan di body error.
2. Logger JSON terstruktur dengan redaksi field sensitif (`src/lib/logger.ts`).
3. Telemetri lewat `setTelemetrySink` (`src/lib/telemetry.ts`); tidak ada vendor ter-hardcode. `instrumentation.ts` meneruskan `onRequestError`.
4. Header keamanan global di `next.config.ts`; CSP ketat ditunda (butuh nonce).
5. `/api/health` melakukan `select 1`, tidak membocorkan detail.
6. Regresi visual memakai asersi overflow per viewport, bukan pixel-diff.

## Konsekuensi

- Sink produksi dipasang saat deploy tanpa mengubah kode fitur.
- Utang: CSP, validasi deadline RSVP di server, limiter terdistribusi, profil editor 100 elemen.
