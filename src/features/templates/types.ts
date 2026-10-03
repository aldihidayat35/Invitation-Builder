import type { TemplateStatus } from "@/lib/schema/domain";
import type { CanonicalDocument, DocumentIssue, SemanticIssue } from "@/lib/schema";

/** Library state shown to users (indicator Draft / Published). */
export type TemplateLifecycle = "draft" | "published" | "published-with-changes" | "archived";

export interface TemplateSummary {
  id: string;
  workspaceId: string;
  name: string;
  status: TemplateStatus;
  lifecycle: TemplateLifecycle;
  revision: number;
  publishedVersionNo: number | null;
  hasUnpublishedChanges: boolean;
  updatedAt: Date;
}

export interface TemplateDetail extends TemplateSummary {
  document: CanonicalDocument;
  versions: TemplateVersionInfo[];
}

export interface TemplateVersionInfo {
  id: string;
  versionNo: number;
  schemaVersion: number;
  note: string | null;
  createdAt: Date;
}

export interface PublishedVersion extends TemplateVersionInfo {
  templateId: string;
  document: CanonicalDocument;
}

export interface ValidationReport {
  valid: boolean;
  schemaIssues: DocumentIssue[];
  semanticIssues: SemanticIssue[];
}
