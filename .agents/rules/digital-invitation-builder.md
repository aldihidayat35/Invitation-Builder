# Digital Invitation Builder — Repository Rules & Architecture Guardrails

## 1. CLI on Windows PowerShell
- Always use `npm.cmd` and `npx.cmd` instead of raw `npm`/`npx` to prevent PowerShell script execution policy errors (`SecurityError: PSSecurityException`).
- If route type errors occur after switching branches or stashing, clear the `.next` directory cache (`Remove-Item -Recurse -Force .next`) before running typecheck.

## 2. Architectural Boundaries (Strict ESLint Enforced)
- **Renderer Independence (P-04 / AC-11)**: `src/features/renderer/**` and `src/app/(public)/**` must NEVER import `konva`, `react-konva`, or `@/features/editor`. The public runtime and preview are pure DOM/HTML/CSS.
- **Database Encapsulation**: `src/app/**` and `src/features/*/components/**` must NEVER import `@/lib/db`, `drizzle-orm`, `pg`, or `@electric-sql/pglite` directly. All database access must go through feature service layers or Server Actions.
- **Security & Eval (NFR-SEC-001)**: Never use `eval()`, `new Function()`, or untyped `any` without strict necessity.

## 3. Canonical Design Model
- The artboard base width is always **390 px** (`src/lib/schema/constants.ts`).
- Coordinates and layout are relative to 390 px; the runtime scales via `clamp(viewport / 390)`.
- All template & invitation designs are validated through Zod canonical schemas (`src/lib/schema/document.ts`).
- Never serialize functions, event handlers, or raw executable scripts into JSON documents.

## 4. Immutability & Publishing
- Published invitations (`published_snapshots`) and template versions (`template_versions`) are strictly immutable (enforced by PostgreSQL DB triggers).
- Save draft must never alter the live published version.
- Content data (`invitations.data`) is decoupled from reusable template designs.
