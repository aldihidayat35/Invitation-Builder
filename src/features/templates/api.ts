/**
 * Server-side facade used by pages, server actions and route handlers.
 * Binds the verified session user + DB to the injected-db service, so UI code
 * never touches the database (ESLint-enforced) or forgets authorization.
 */
import "server-only";
import { requireUser } from "@/lib/auth/server";
import { ForbiddenError } from "@/lib/auth/errors";
import { getDb } from "@/lib/db/client";
import { DocumentValidationError } from "@/lib/schema";
import * as service from "./service";
import type { Database } from "@/lib/db/types";
import type { Actor } from "@/lib/auth/authorization";

async function context(): Promise<{ db: Database; actor: Actor }> {
  const user = await requireUser();
  return { db: await getDb(), actor: { userId: user.id, systemRole: user.systemRole } };
}

export async function listLibrary(workspaceId: string, options: { archived?: boolean } = {}) {
  const { db, actor } = await context();
  return service.listTemplates(db, actor, workspaceId, options);
}

export async function createInLibrary(workspaceId: string, name: string) {
  const { db, actor } = await context();
  return service.createTemplate(db, actor, { workspaceId, name });
}

export async function openTemplate(templateId: string) {
  const { db, actor } = await context();
  return service.getTemplate(db, actor, templateId);
}

export async function permissionsFor(workspaceId: string) {
  const { db, actor } = await context();
  return service.templatePermissions(db, actor, workspaceId);
}

/** Persists the editor document (validated, optimistic concurrency via `expectedRevision`). */
export async function saveTemplateDraft(
  templateId: string,
  expectedRevision: number,
  document: unknown,
) {
  const { db, actor } = await context();
  return service.saveDraft(db, actor, { templateId, expectedRevision, document });
}

export async function rename(templateId: string, name: string) {
  const { db, actor } = await context();
  return service.renameTemplate(db, actor, templateId, name);
}

export async function duplicate(templateId: string) {
  const { db, actor } = await context();
  return service.duplicateTemplate(db, actor, templateId);
}

export async function archive(templateId: string) {
  const { db, actor } = await context();
  return service.archiveTemplate(db, actor, templateId);
}

export async function publish(templateId: string, expectedRevision: number, note?: string) {
  const { db, actor } = await context();
  return service.publishTemplate(db, actor, { templateId, expectedRevision, note });
}

export async function validate(templateId: string, document?: unknown) {
  const { db, actor } = await context();
  return service.validateTemplate(db, actor, templateId, document);
}

export {
  NothingToPublishError,
  PublishBlockedError,
  RevisionConflictError,
  TemplateArchivedError,
  TemplateInputError,
  TemplateNotFoundError,
} from "./service";

/** Maps domain errors to messages that are safe to show; unknown errors are not leaked. */
export function describeTemplateError(error: unknown): string {
  if (
    error instanceof service.TemplateInputError ||
    error instanceof service.TemplateArchivedError ||
    error instanceof service.RevisionConflictError ||
    error instanceof service.NothingToPublishError ||
    error instanceof ForbiddenError
  ) {
    return error.message;
  }
  if (error instanceof service.TemplateNotFoundError) return "Template tidak ditemukan.";
  if (error instanceof service.PublishBlockedError) {
    return `Publish diblokir oleh validasi: ${error.semanticIssues
      .slice(0, 3)
      .map((i) => i.message)
      .join("; ")}`;
  }
  if (error instanceof DocumentValidationError) return "Dokumen template tidak valid.";
  return "Terjadi kesalahan. Silakan coba lagi.";
}
