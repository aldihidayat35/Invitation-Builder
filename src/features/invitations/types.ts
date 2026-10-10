import type { DataIssue, ResolvedDocument } from "@/lib/engine";
import type { CanonicalDocument } from "@/lib/schema";
import type { GuestStatus, InvitationStatus } from "@/lib/schema/domain";

export interface InvitationSummary {
  readonly id: string;
  readonly workspaceId: string;
  readonly title: string;
  readonly slug: string;
  readonly status: InvitationStatus;
  readonly templateVersionId: string;
  readonly clientAccessToken?: string | null;
  readonly publishedAt?: Date | null;
  readonly expiresAt?: Date | null;
  readonly isManuallyClosed?: boolean;
  readonly isClosed?: boolean;
  readonly updatedAt: Date;
}

export interface InvitationDetail extends InvitationSummary {
  /** Client data only (variable values). Never contains design. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Immutable template version this invitation was created from. */
  readonly template: {
    readonly templateId: string;
    readonly name: string;
    readonly versionNo: number;
  };
  /** The pinned (immutable) template version document, migrated to the latest schema. */
  readonly document: CanonicalDocument;
}

export interface GuestSummary {
  readonly id: string;
  readonly invitationId: string;
  readonly name: string;
  /** Opaque random token used in guest links (never sequential). */
  readonly tokenId: string;
  readonly maxParty: number;
  readonly status: GuestStatus;
}

export interface SaveDataResult {
  readonly invitation: InvitationSummary;
  /** All validation issues for the submitted data (required/type), not only blocking ones. */
  readonly issues: readonly DataIssue[];
}

export interface ReadinessReport {
  /** True when no required variable is missing and no value is invalid. */
  readonly ready: boolean;
  readonly issues: readonly DataIssue[];
}

export interface SnapshotSummary {
  readonly revisionNo: number;
  readonly schemaVersion: number;
  readonly createdAt: Date;
  /** True when this revision is what the public URL currently serves. */
  readonly active: boolean;
}

/** Everything the public page needs; never carries DB ids or the draft (P-06). */
export interface PublicInvitationModel {
  readonly title: string;
  readonly slug: string;
  readonly revisionNo: number;
  readonly resolved: ResolvedDocument;
  /** Display name of the recognized guest (undefined = generic context). */
  readonly guestName?: string;
  /** Recognized guest token ID from database when applicable. */
  readonly guestToken?: string;
  /** True only when a valid guest token or name was supplied for this invitation. */
  readonly hasGuest: boolean;
  /** True when rendered from an active draft prior to publication. */
  readonly isDraft?: boolean;
  /** True when the invitation has reached its expiry date or was manually closed. */
  readonly isClosed?: boolean;
  readonly closedReason?: "expired" | "manual";
  readonly publishedAt?: Date | null;
  readonly expiresAt?: Date | null;
  readonly groomBrideNames?: string;
}
