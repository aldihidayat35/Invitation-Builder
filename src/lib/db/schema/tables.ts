/**
 * Relational schema (PRD §15.1, Lampiran B).
 *
 * Conventions:
 * - uuid PKs, snake_case columns, timestamptz everywhere.
 * - Document-bearing jsonb columns are typed `unknown` so every read MUST go
 *   through `migrateDocument` (NFR-REL-001).
 * - Foreign keys default to RESTRICT: records are archived, not hard-deleted.
 * - template_versions / published_snapshots / audit_logs / security_events are immutable; this is
 *   enforced by DB triggers in the `immutability_triggers` migration.
 * - Client data (invitations/guests/rsvps) is separate from template design.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean as pgBoolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  assetStatusEnum,
  businessOrderStatusEnum,
  customerOrderStatusEnum,
  guestStatusEnum,
  invitationStatusEnum,
  paymentStatusEnum,
  productionStatusEnum,
  rsvpResponseEnum,
  systemRoleEnum,
  templateStatusEnum,
  userStatusEnum,
  workspaceRoleEnum,
} from "./enums";
import type { TemplateExtendedMetadata } from "../../../features/templates/types";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

const SLUG_SQL = sql.raw("'^[a-z0-9]+(-[a-z0-9]+)*$'"); // inlined: CHECK cannot take bind params

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** Null for seed/SSO-less users; set by the auth phase (never plaintext). */
    passwordHash: text("password_hash"),
    status: userStatusEnum("status").notNull().default("active"),
    systemRole: systemRoleEnum("system_role").notNull().default("client"),
    resellerId: uuid("reseller_id").references((): AnyPgColumn => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    index("users_reseller_idx").on(t.resellerId),
    index("users_system_role_idx").on(t.systemRole),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("workspaces_slug_uq").on(t.slug),
    check("workspaces_slug_format", sql`${t.slug} ~ ${SLUG_SQL}`),
  ],
);

/**
 * Server-side sessions (FR-AUTH-001). The cookie carries a random opaque token;
 * only its SHA-256 hash is stored, so a DB leak cannot be replayed as a session.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: workspaceRoleEnum("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("workspace_members_user_idx").on(t.userId),
  ],
);

export const templates = pgTable(
  "templates",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    status: templateStatusEnum("status").notNull().default("draft"),
    /** Public URL slug for catalog preview and shareable links */
    slug: text("slug").unique(),
    /** Brief marketing/template description */
    description: text("description"),
    /** Event type category (wedding, engagement, birthday, etc.) */
    category: text("category").notNull().default("wedding"),
    /** Visual aesthetic style (modern_minimalist, rustic_boho, traditional_jawa, etc.) */
    style: text("style").notNull().default("modern_minimalist"),
    /** Primary cover preview image (3:4 or 9:16 aspect ratio) */
    thumbnailUrl: text("thumbnail_url"),
    /** Smartphone 3D mockup frame image */
    previewMockupUrl: text("preview_mockup_url"),
    /** Access tier: free | standard | premium | exclusive */
    tier: text("tier").notNull().default("standard"),
    /** Price in IDR (0 for free) */
    price: integer("price").notNull().default(0),
    /** Whether visible in public catalog */
    isPublic: pgBoolean("is_public").notNull().default(false),
    /** Whether featured in homepage / editor picks */
    isFeatured: pgBoolean("is_featured").notNull().default(false),
    /** Search tags/keywords */
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    /** Extended metadata (colorPalette, supportedFeatures, galleryUrls, etc.) */
    metadata: jsonb("metadata").$type<TemplateExtendedMetadata>().notNull().default({}),
    /** Total view count in catalog */
    viewCount: integer("view_count").notNull().default(0),
    /** Total invitations created using this template */
    useCount: integer("use_count").notNull().default(0),
    /** Working draft. `unknown`: always read through migrateDocument. */
    draftDocument: jsonb("draft_document").$type<unknown>().notNull(),
    /** Optimistic concurrency counter, bumped on every draft save. */
    revision: integer("revision").notNull().default(1),
    /** Latest published version number (null = never published). */
    publishedVersionNo: integer("published_version_no"),
    /** Draft `revision` captured at the last publish; revision > this = unpublished changes. */
    publishedRevision: integer("published_revision"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("templates_workspace_idx").on(t.workspaceId, t.status),
    index("templates_catalog_filter_idx").on(t.isPublic, t.category, t.style, t.tier),
    index("templates_catalog_sort_idx").on(t.isPublic, t.isFeatured, t.useCount),
    check("templates_revision_positive", sql`${t.revision} >= 1`),
    check("templates_price_non_negative", sql`${t.price} >= 0`),
    check(
      "templates_published_pair",
      sql`(${t.publishedVersionNo} is null) = (${t.publishedRevision} is null)`,
    ),
  ],
);

/** Immutable once inserted (trigger-enforced). */
export const templateVersions = pgTable(
  "template_versions",
  {
    id: id(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id),
    versionNo: integer("version_no").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    document: jsonb("document").$type<unknown>().notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("template_versions_template_no_uq").on(t.templateId, t.versionNo),
    check("template_versions_no_positive", sql`${t.versionNo} >= 1`),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => templateVersions.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: invitationStatusEnum("status").notNull().default("draft"),
    /** Client data only (variable values). Never contains design. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    activePublishedSnapshotId: uuid("active_published_snapshot_id").references(
      (): AnyPgColumn => publishedSnapshots.id,
    ),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("invitations_slug_uq").on(t.slug),
    index("invitations_workspace_idx").on(t.workspaceId, t.status),
    check("invitations_slug_format", sql`${t.slug} ~ ${SLUG_SQL}`),
  ],
);

/** Immutable once inserted (trigger-enforced). Public pages render only these. */
export const publishedSnapshots = pgTable(
  "published_snapshots",
  {
    id: id(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references((): AnyPgColumn => invitations.id),
    revisionNo: integer("revision_no").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    /** Resolved design document at publish time. */
    document: jsonb("document").$type<unknown>().notNull(),
    /** Client data at publish time. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("published_snapshots_invitation_rev_uq").on(t.invitationId, t.revisionNo),
    check("published_snapshots_rev_positive", sql`${t.revisionNo} >= 1`),
  ],
);

export const guests = pgTable(
  "guests",
  {
    id: id(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id),
    name: text("name").notNull(),
    /** Opaque random id used in guest links; unique and non-sequential. */
    tokenId: text("token_id").notNull(),
    status: guestStatusEnum("status").notNull().default("active"),
    maxParty: integer("max_party").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("guests_token_uq").on(t.tokenId),
    index("guests_invitation_idx").on(t.invitationId),
    check("guests_max_party_range", sql`${t.maxParty} between 1 and 20`),
  ],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: id(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id),
    guestId: uuid("guest_id").references(() => guests.id),
    name: text("name").notNull(),
    response: rsvpResponseEnum("response").notNull(),
    partySize: integer("party_size").notNull().default(1),
    message: text("message"),
    createdAt: createdAt(),
  },
  (t) => [
    index("rsvps_invitation_idx").on(t.invitationId, t.createdAt),
    check("rsvps_party_size_range", sql`${t.partySize} between 0 and 20`),
    check("rsvps_message_length", sql`${t.message} is null or char_length(${t.message}) <= 1000`),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    status: assetStatusEnum("status").notNull().default("uploading"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    /** Storage key/path (opaque); delivery URL is derived, never user-supplied. */
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("assets_storage_key_uq").on(t.storageKey),
    index("assets_workspace_idx").on(t.workspaceId, t.status),
    check("assets_bytes_positive", sql`${t.bytes} > 0`),
    check(
      "assets_dimensions_valid",
      sql`(${t.width} is null and ${t.height} is null) or (${t.width} between 1 and 8000 and ${t.height} between 1 and 8000)`,
    ),
  ],
);

/** Append-only (trigger-enforced). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_workspace_idx").on(t.workspaceId, t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const resellerProfiles = pgTable(
  "reseller_profiles",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    agencyName: text("agency_name").notNull(),
    slug: text("slug").notNull(),
    whatsappContact: text("whatsapp_contact").notNull(),
    logoUrl: text("logo_url"),
    customDomain: text("custom_domain"),
    domainStatus: text("domain_status").notNull().default("unconfigured"),
    domainVerificationToken: text("domain_verification_token"),
    domainVerifiedAt: timestamp("domain_verified_at", { withTimezone: true }),
    domainLastCheckedAt: timestamp("domain_last_checked_at", { withTimezone: true }),
    tlsStatus: text("tls_status").notNull().default("unconfigured"),
    tlsActivatedAt: timestamp("tls_activated_at", { withTimezone: true }),
    brandColor: text("brand_color").notNull().default("#3b82f6"),
    hideWatermark: pgBoolean("hide_watermark").notNull().default(true),
    isActive: pgBoolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("reseller_profiles_user_uq").on(t.userId),
    uniqueIndex("reseller_profiles_slug_uq").on(t.slug),
    uniqueIndex("reseller_profiles_custom_domain_lower_uq")
      .on(sql`lower(${t.customDomain})`)
      .where(sql`${t.customDomain} is not null`),
    check("reseller_profiles_slug_format", sql`${t.slug} ~ ${SLUG_SQL}`),
    check(
      "reseller_profiles_domain_status_check",
      sql`${t.domainStatus} in ('unconfigured', 'pending', 'verified', 'active', 'failed')`,
    ),
    check(
      "reseller_profiles_tls_status_check",
      sql`${t.tlsStatus} in ('unconfigured', 'pending', 'active', 'failed')`,
    ),
  ],
);

export const customerOrders = pgTable(
  "customer_orders",
  {
    id: id(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => resellerProfiles.id),
    idempotencyKey: text("idempotency_key"),
    clientUserId: uuid("client_user_id").references(() => users.id),
    invitationId: uuid("invitation_id").references(() => invitations.id),
    templateId: uuid("template_id").references(() => templates.id),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerWhatsapp: text("customer_whatsapp").notNull(),
    groomBrideNames: text("groom_bride_names"),
    eventDate: timestamp("event_date", { withTimezone: true }),
    eventLocation: text("event_location"),
    notes: text("notes"),
    status: customerOrderStatusEnum("status").notNull().default("new"),
    /** Fase 1 separates commercial, production, and payment lifecycles. */
    orderStatus: businessOrderStatusEnum("order_status").notNull().default("new"),
    productionStatus: productionStatusEnum("production_status")
      .notNull()
      .default("awaiting_client"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    templateVersionId: uuid("template_version_id").references(() => templateVersions.id),
    assignedTo: uuid("assigned_to").references(() => users.id),
    dueAt: timestamp("due_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    adminNotes: text("admin_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("customer_orders_seller_idx").on(t.sellerId, t.createdAt),
    index("customer_orders_status_idx").on(t.status, t.createdAt),
    index("customer_orders_business_status_idx").on(t.orderStatus, t.createdAt),
    index("customer_orders_production_status_idx").on(t.productionStatus, t.dueAt),
    index("customer_orders_workspace_idx").on(t.workspaceId),
    index("customer_orders_assignee_idx").on(t.assignedTo, t.productionStatus),
    uniqueIndex("customer_orders_idempotency_uq")
      .on(t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
  ],
);

/** Append-only commercial/production/payment/approval timeline. */
export const orderWorkflowEvents = pgTable(
  "order_workflow_events",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => customerOrders.id),
    actorId: uuid("actor_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    fromValue: text("from_value"),
    toValue: text("to_value"),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("order_workflow_events_order_idx").on(t.orderId, t.createdAt)],
);

/** Append-only security signal ledger; identifiers are hashed before storage. */
export const securityEvents = pgTable(
  "security_events",
  {
    id: id(),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull().default("warning"),
    subjectHash: text("subject_hash"),
    clientHash: text("client_hash"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("security_events_type_created_idx").on(t.eventType, t.createdAt),
    index("security_events_subject_created_idx").on(t.subjectHash, t.createdAt),
    check("security_events_severity_check", sql`${t.severity} in ('info', 'warning', 'critical')`),
  ],
);

/** Non-destructive privacy request workflow; deletion is reviewed before execution. */
export const privacyRequests = pgTable(
  "privacy_requests",
  {
    id: id(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id),
    requestType: text("request_type").notNull(),
    status: text("status").notNull().default("pending"),
    reason: text("reason"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    retentionDueAt: timestamp("retention_due_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("privacy_requests_status_created_idx").on(t.status, t.createdAt),
    index("privacy_requests_target_idx").on(t.targetUserId, t.createdAt),
    check("privacy_requests_type_check", sql`${t.requestType} in ('export', 'delete')`),
    check(
      "privacy_requests_status_check",
      sql`${t.status} in ('pending', 'in_progress', 'completed', 'rejected')`,
    ),
  ],
);

/** Evidence register for backup/restore and disaster-recovery drills. */
export const recoveryDrills = pgTable(
  "recovery_drills",
  {
    id: id(),
    drillType: text("drill_type").notNull().default("restore"),
    status: text("status").notNull().default("planned"),
    performedBy: uuid("performed_by")
      .notNull()
      .references(() => users.id),
    environment: text("environment").notNull(),
    backupReference: text("backup_reference"),
    measuredRpoMinutes: integer("measured_rpo_minutes"),
    measuredRtoMinutes: integer("measured_rto_minutes"),
    notes: text("notes"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("recovery_drills_status_created_idx").on(t.status, t.createdAt),
    check(
      "recovery_drills_status_check",
      sql`${t.status} in ('planned', 'running', 'passed', 'failed')`,
    ),
    check("recovery_drills_type_check", sql`${t.drillType} in ('backup', 'restore', 'failover')`),
  ],
);

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey().default("global"),
  appName: text("app_name").notNull().default("Undangan.id"),
  appTagline: text("app_tagline").notNull().default("Undangan Digital, Lebih Berkesan"),
  appLogo: text("app_logo"),
  companyName: text("company_name").notNull().default("Undangan.id"),
  contactPhone: text("contact_phone").notNull().default("+62 812-3456-7890"),
  contactWhatsapp: text("contact_whatsapp").notNull().default("6281234567890"),
  contactEmail: text("contact_email").notNull().default("support@undangan.id"),
  address: text("address")
    .notNull()
    .default("Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190"),
  footerDescription: text("footer_description")
    .notNull()
    .default(
      "Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.",
    ),
  heroBackgroundImage: text("hero_background_image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const templateCategories = pgTable(
  "template_categories",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("template_categories_slug_uq").on(t.slug),
    index("template_categories_sort_idx").on(t.sortOrder),
  ],
);

export const testimonials = pgTable(
  "testimonials",
  {
    id: id(),
    name: text("name").notNull(),
    role: text("role").notNull().default("Pelanggan Premium"),
    quote: text("quote").notNull(),
    rating: integer("rating").notNull().default(5),
    avatarUrl: text("avatar_url"),
    initials: text("initials"),
    shade: text("shade").notNull().default("#e7c9b3"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: pgBoolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("testimonials_sort_idx").on(t.isActive, t.sortOrder)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ResellerProfile = typeof resellerProfiles.$inferSelect;
export type NewResellerProfile = typeof resellerProfiles.$inferInsert;
export type CustomerOrder = typeof customerOrders.$inferSelect;
export type NewCustomerOrder = typeof customerOrders.$inferInsert;
export type OrderWorkflowEvent = typeof orderWorkflowEvents.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type PrivacyRequest = typeof privacyRequests.$inferSelect;
export type RecoveryDrill = typeof recoveryDrills.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type TemplateRow = typeof templates.$inferSelect;
export type NewTemplateRow = typeof templates.$inferInsert;
export type TemplateVersionRow = typeof templateVersions.$inferSelect;
export type InvitationRow = typeof invitations.$inferSelect;
export type PublishedSnapshotRow = typeof publishedSnapshots.$inferSelect;
export type GuestRow = typeof guests.$inferSelect;
export type RsvpRow = typeof rsvps.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type AppSettingRow = typeof appSettings.$inferSelect;
export type NewAppSettingRow = typeof appSettings.$inferInsert;
export type TemplateCategoryRow = typeof templateCategories.$inferSelect;
export type NewTemplateCategoryRow = typeof templateCategories.$inferInsert;
export type TestimonialRow = typeof testimonials.$inferSelect;
export type NewTestimonialRow = typeof testimonials.$inferInsert;
