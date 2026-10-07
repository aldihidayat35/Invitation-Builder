"use server";

import { z } from "zod";
import {
  RevisionConflictError,
  TemplateArchivedError,
  TemplateNotFoundError,
  describeTemplateError,
  openTemplate,
  saveTemplateDraft,
} from "@/features/templates/api";
import type { SaveResult } from "@/features/editor/core/autosave";
import { ForbiddenError } from "@/lib/auth/errors";
import { DocumentValidationError } from "@/lib/schema";

const idSchema = z.uuid();
const revisionSchema = z.number().int().min(1);

/**
 * Autosave endpoint (FR-TPL-002). The document is re-validated against the
 * canonical schema on the server; the client is never trusted (P-03).
 */
export async function saveDraftAction(
  templateId: string,
  expectedRevision: number,
  document: unknown,
): Promise<SaveResult> {
  const id = idSchema.safeParse(templateId);
  const revision = revisionSchema.safeParse(expectedRevision);
  if (!id.success || !revision.success) {
    return { ok: false, kind: "invalid", message: "Permintaan tidak valid." };
  }
  try {
    const saved = await saveTemplateDraft(id.data, revision.data, document);
    return { ok: true, revision: saved.revision };
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      let currentRevision: number | undefined;
      try {
        currentRevision = (await openTemplate(id.data)).revision;
      } catch {
        // ignore
      }
      return {
        ok: false,
        kind: "conflict",
        message: describeTemplateError(error),
        currentRevision,
      };
    }
    if (error instanceof DocumentValidationError || error instanceof TemplateArchivedError) {
      return { ok: false, kind: "invalid", message: describeTemplateError(error) };
    }
    if (error instanceof ForbiddenError || error instanceof TemplateNotFoundError) {
      return { ok: false, kind: "forbidden", message: describeTemplateError(error) };
    }
    console.error("saveDraftAction failed", error);
    return { ok: false, kind: "error", message: describeTemplateError(error) };
  }
}

/** Used by "overwrite with my version" after a conflict: returns the server's current revision. */
export async function currentRevisionAction(templateId: string): Promise<number | null> {
  const id = idSchema.safeParse(templateId);
  if (!id.success) return null;
  try {
    return (await openTemplate(id.data)).revision;
  } catch {
    return null;
  }
}
