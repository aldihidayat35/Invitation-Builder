/**
 * Domain enumerations shared by Zod contracts and the database schema.
 * Single source of truth so DB enums can never drift from application types.
 *
 * PRD refs: §4 (roles), §15.1, Lampiran B (state machines).
 */

export const WORKSPACE_ROLES = ["owner", "admin", "designer", "operator"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Platform-wide account layers: Owner (Super Admin), Reseller (Agency), Client (End user). */
export const SYSTEM_ROLES = ["owner", "reseller", "client"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Reseller credit transaction ledger types. */
export const CREDIT_TRANSACTION_TYPES = [
  "owner_grant",
  "purchase_topup",
  "publish_deduct",
  "unpublish_refund",
  "manual_adjustment",
] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];


/** Template: draft → published/versioned → archived (Lampiran B). */
export const TEMPLATE_STATUSES = ["draft", "published", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

/** Invitation: draft → published → archived (Lampiran B). */
export const INVITATION_STATUSES = ["draft", "published", "archived"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Guest: active → responded → archived (Lampiran B). */
export const GUEST_STATUSES = ["active", "responded", "archived"] as const;
export type GuestStatus = (typeof GUEST_STATUSES)[number];

/** Asset: uploading → ready → failed/archived (Lampiran B). Only `ready` is renderable. */
export const ASSET_STATUSES = ["uploading", "ready", "failed", "archived"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const RSVP_RESPONSES = ["attending", "not_attending"] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

/** Audit actions (FR-AUD-001). Stored as text; validated in code. */
export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.logout",
  "template.create",
  "template.rename",
  "template.duplicate",
  "template.archive",
  "template.publish",
  "asset.upload",
  "invitation.create",
  "invitation.rename",
  "invitation.archive",
  "guest.create",
  "guest.archive",
  "invitation.publish",
  "invitation.rollback",
  "guest.import",
  "reseller.create",
  "reseller.update",
  "reseller.credit_adjust",
  "reseller.client_create",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
