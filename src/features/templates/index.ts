/**
 * Public (client-safe) entry point for `src/features/templates`: types and
 * pure schemas only. The server-only service/facade are imported by path:
 * `@/features/templates/service` (db-injected) and `@/features/templates/api` (bound to session).
 */
export { templateNameSchema } from "./schemas";
export type {
  PublishedVersion,
  TemplateDetail,
  TemplateLifecycle,
  TemplateSummary,
  TemplateVersionInfo,
  ValidationReport,
} from "./types";
