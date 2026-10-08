import type {
  TemplateCategory,
  TemplateLayoutFormat,
  TemplateStatus,
  TemplateStyle,
  TemplateTier,
} from "@/lib/schema/domain";
import type { CanonicalDocument, DocumentIssue, SemanticIssue } from "@/lib/schema";

/** Library state shown to users (indicator Draft / Published). */
export type TemplateLifecycle = "draft" | "published" | "published-with-changes" | "archived";

export interface TemplateColorSwatch {
  hex: string;
  name: string;
  isPrimary?: boolean;
}

export type TemplateSupportedFeature =
  | "rsvp"
  | "google_maps"
  | "digital_gift"
  | "audio_player"
  | "countdown"
  | "gallery_slider"
  | "guest_book"
  | "video_embed"
  | "story_timeline"
  | "envelope_cover";

export interface TemplateExtendedMetadata {
  demoInvitationSlug?: string;
  galleryUrls?: string[];
  colorPalette?: TemplateColorSwatch[];
  supportedFeatures?: TemplateSupportedFeature[];
  layoutFormat?: TemplateLayoutFormat;
  recommendedAudioTitle?: string;
  ratingScore?: number;
  ratingCount?: number;
}

export interface TemplateCatalogMetadata {
  slug: string | null;
  description: string | null;
  category: TemplateCategory;
  style: TemplateStyle;
  thumbnailUrl: string | null;
  previewMockupUrl: string | null;
  tier: TemplateTier;
  price: number;
  isPublic: boolean;
  isFeatured: boolean;
  tags: string[];
  metadata: TemplateExtendedMetadata;
  viewCount: number;
  useCount: number;
}

export interface CatalogTemplateItem {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: TemplateCategory;
  style: TemplateStyle;
  thumbnailUrl: string | null;
  previewMockupUrl: string | null;
  tier: TemplateTier;
  price: number;
  isFeatured: boolean;
  tags: string[];
  colorPalette: TemplateColorSwatch[];
  supportedFeatures: TemplateSupportedFeature[];
  demoInvitationSlug?: string;
  useCount: number;
  viewCount: number;
}

export interface UpdateTemplateMetadataInput
  extends Partial<Omit<TemplateCatalogMetadata, "metadata">> {
  metadata?: TemplateExtendedMetadata;
  colorPalette?: TemplateColorSwatch[];
  supportedFeatures?: TemplateSupportedFeature[];
  galleryUrls?: string[];
  demoInvitationSlug?: string | null;
  layoutFormat?: TemplateLayoutFormat;
}

export interface TemplateSummary extends Partial<TemplateCatalogMetadata> {
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
