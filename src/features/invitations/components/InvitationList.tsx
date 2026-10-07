import type { InvitationSummary } from "../types";
import { InvitationsView } from "./InvitationsView";

export function InvitationList({
  invitations,
  emptyMessage,
}: {
  readonly invitations: readonly InvitationSummary[];
  readonly emptyMessage: string;
}) {
  return <InvitationsView invitations={invitations} emptyMessage={emptyMessage} />;
}
