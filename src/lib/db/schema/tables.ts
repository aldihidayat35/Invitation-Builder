/**
 * Relational schema (PRD §15.1, Lampiran B). 11 tables.
 *
 * Conventions:
 * - uuid PKs, snake_case columns, timestamptz everywhere.
 * - Document-bearing jsonb columns are typed `unknown` so every read MUST go
 *   through `migrateDocument` (NFR-REL-001).
 * - Foreign keys default to RESTRICT: records are archived, not hard-deleted.
 * - template_versions / published_snapshots / audit_logs are immutable; this is
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
  creditTransactionTypeEnum,
  guestStatusEnum,
  invitationStatusEnum,
  rsvpResponseEnum,
  systemRoleEnum,
  templateStatusEnum,
  userStatusEnum,
  workspaceRoleEnum,
} from "./enums";

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
    check("templates_revision_positive", sql`${t.revision} >= 1`),
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
    creditQuota: integer("credit_quota").notNull().default(0),
    customDomain: text("custom_domain"),
    brandColor: text("brand_color").notNull().default("#3b82f6"),
    hideWatermark: pgBoolean("hide_watermark").notNull().default(true),
    isActive: pgBoolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("reseller_profiles_user_uq").on(t.userId),
    uniqueIndex("reseller_profiles_slug_uq").on(t.slug),
    check("reseller_profiles_slug_format", sql`${t.slug} ~ ${SLUG_SQL}`),
    check("reseller_profiles_credit_quota_non_negative", sql`${t.creditQuota} >= 0`),
  ],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: id(),
    resellerId: uuid("reseller_id")
      .notNull()
      .references(() => resellerProfiles.id),
    type: creditTransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceId: text("reference_id"),
    notes: text("notes"),
    performedBy: uuid("performed_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("credit_transactions_reseller_idx").on(t.resellerId, t.createdAt),
    check(
      "credit_transactions_balances_valid",
      sql`${t.balanceBefore} + ${t.amount} = ${t.balanceAfter}`,
    ),
  ],
);

export const bankAccounts = pgTable("bank_accounts", {
  id: id(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolder: text("account_holder").notNull(),
  qrCodeUrl: text("qr_code_url"),
  instructions: text("instructions"),
  isActive: pgBoolean("is_active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const topupRequests = pgTable(
  "topup_requests",
  {
    id: id(),
    resellerId: uuid("reseller_id")
      .notNull()
      .references(() => resellerProfiles.id),
    creditAmount: integer("credit_amount").notNull(),
    amountPaid: integer("amount_paid").notNull(),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
    senderBank: text("sender_bank").notNull(),
    senderAccountName: text("sender_account_name").notNull(),
    proofFileUrl: text("proof_file_url").notNull(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("topup_requests_reseller_idx").on(t.resellerId, t.createdAt),
    index("topup_requests_status_idx").on(t.status, t.createdAt),
    check("topup_requests_credit_amount_positive", sql`${t.creditAmount} > 0`),
    check("topup_requests_amount_paid_positive", sql`${t.amountPaid} > 0`),
    check(
      "topup_requests_status_valid",
      sql`${t.status} in ('pending', 'approved', 'rejected', 'cancelled')`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ResellerProfile = typeof resellerProfiles.$inferSelect;
export type NewResellerProfile = typeof resellerProfiles.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type NewBankAccount = typeof bankAccounts.$inferInsert;
export type TopupRequest = typeof topupRequests.$inferSelect;
export type NewTopupRequest = typeof topupRequests.$inferInsert;
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


