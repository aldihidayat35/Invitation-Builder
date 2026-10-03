# Digital Invitation Builder

Editor undangan digital reusable (Canva-like) dengan output **HTML mobile-first**.
Source of truth: [`docs/PRD_BASELINE.md`](docs/PRD_BASELINE.md) (PRD v1.0).

## Dokumen penting

| Dokumen                                                                                               | Isi                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [`docs/PRD_BASELINE.md`](docs/PRD_BASELINE.md)                                                        | Salinan verbatim PRD v1.0 (checksum-verified)       |
| [`docs/requirements-matrix.md`](docs/requirements-matrix.md)                                          | Traceability: requirement ID → fase → test → status |
| [`docs/decisions/0001-architecture-baseline.md`](docs/decisions/0001-architecture-baseline.md)        | ADR arsitektur baseline                             |
| [`Prompt_Implementasi_Bertahap_…md`](Prompt_Implementasi_Bertahap_Digital_Invitation_Builder_v1.0.md) | Playbook implementasi per fase                      |

## Prasyarat

- Node.js ≥ 20.9 (dikembangkan dengan Node 24+), npm (lockfile: `package-lock.json`).
- Windows PowerShell dengan execution policy terbatas: gunakan `npm.cmd` / `npx.cmd`.

## Perintah

```bash
npm install            # install dependencies
npm run dev            # dev server → http://localhost:3000
npm run typecheck      # next typegen + tsc --noEmit (strict)
npm run lint           # ESLint (max-warnings 0)
npm run format:check   # Prettier
npm run check:cycles   # madge: deteksi circular import
npm run test           # Vitest (unit + component)
npm run test:e2e       # Playwright (butuh: npx playwright install chromium)
npm run build          # production build
npm run verify         # typecheck + lint + cycles + test + build
npm run sync:prd       # regenerate docs/PRD_BASELINE.md dari file PRD
```

## Route

| Route                                               | Keterangan                                                     |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `/`                                                 | Redirect ke `/dashboard`                                       |
| `/login`                                            | Login (sesi server-side)                                       |
| `/dashboard`                                        | Dashboard terlindungi (roadmap fase)                           |
| `/dashboard/templates`, `/dashboard/templates/[id]` | Template Library & detail/publish (F2)                         |
| `POST /api/templates/[id]/validate`                 | Validasi dokumen (schema + semantik), auth + workspace         |
| `/smoke/renderer`                                   | Smoke route runtime publik — DOM/HTML, tanpa canvas, `noindex` |

## Struktur

```
src/
  app/
    (dashboard)/        # root layout dashboard (CSS terisolasi)
    (public)/           # root layout runtime publik (tanpa CSS dashboard)
  features/
    editor/             # F4  — React-Konva interaction surface
    templates/          # F2  — library, draft, version
    invitations/        # F8/F9 — data mode, guest, publish
    widgets/            # F6/F10 — widget registry
    renderer/           # F9  — HTML renderer (preview + public)
  lib/
    schema/             # F1  — Zod contracts; konstanta kanonik (390px)
    db/                 # F1  — repository/service layer
    auth/               # F2  — sesi & workspace authorization
tests/
  unit/  component/  e2e/
docs/
  decisions/
```

## Aturan kontribusi

- Setiap PR mencantumkan requirement ID PRD (P-01, PRD §25.1).
- Perubahan yang bertentangan dengan PRD → Change Request (PRD §25.2).
- `features/renderer` dilarang mengimpor `konva`, `react-konva`, atau `features/editor` (ESLint).
