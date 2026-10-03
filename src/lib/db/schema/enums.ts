/**
 * Postgres enums built from the shared domain constants, so DB values can
 * never drift from the Zod/application types.
 * NOTE: relative imports only - drizzle-kit loads this file without the `@/` alias.
 */
import { pgEnum } from "drizzle-orm/pg-core";
import {
  ASSET_STATUSES,
  GUEST_STATUSES,
  INVITATION_STATUSES,
  RSVP_RESPONSES,
  TEMPLATE_STATUSES,
  USER_STATUSES,
  WORKSPACE_ROLES,
} from "../../schema/domain";

export const workspaceRoleEnum = pgEnum("workspace_role", WORKSPACE_ROLES);
export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
export const templateStatusEnum = pgEnum("template_status", TEMPLATE_STATUSES);
export const invitationStatusEnum = pgEnum("invitation_status", INVITATION_STATUSES);
export const guestStatusEnum = pgEnum("guest_status", GUEST_STATUSES);
export const assetStatusEnum = pgEnum("asset_status", ASSET_STATUSES);
export const rsvpResponseEnum = pgEnum("rsvp_response", RSVP_RESPONSES);
