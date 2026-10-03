import { and, asc, desc, eq, ne } from "drizzle-orm";
import {
  guests,
  invitations,
  templates,
  templateVersions,
  type GuestRow,
  type InvitationRow,
  type TemplateVersionRow,
} from "../schema";
import type { Database } from "../types";

/**
 * Invitation + guest persistence (FR-INV-001..003, FR-GST-002..003).
 * Unscoped `*ById` lookups exist ONLY so the service can resolve the owning
 * workspace and authorize membership. Never expose them to UI code.
 */
export async function insertInvitation(
  db: Database,
  input: {
    workspaceId: string;
    templateVersionId: string;
    slug: string;
    title: string;
    data: Record<string, unknown>;
    createdBy?: string;
  },
): Promise<InvitationRow> {
  const [row] = await db.insert(invitations).values(input).returning();
  if (!row) throw new Error("insertInvitation returned no row");
  return row;
}

export async function findInvitationById(
  db: Database,
  invitationId: string,
): Promise<InvitationRow | undefined> {
  const [row] = await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1);
  return row;
}

export async function findInvitationBySlug(
  db: Database,
  slug: string,
): Promise<InvitationRow | undefined> {
  const [row] = await db.select().from(invitations).where(eq(invitations.slug, slug)).limit(1);
  return row;
}

export async function listInvitations(
  db: Database,
  workspaceId: string,
  options: { archived?: boolean } = {},
): Promise<InvitationRow[]> {
  const statusFilter = options.archived
    ? eq(invitations.status, "archived")
    : ne(invitations.status, "archived");
  return db
    .select()
    .from(invitations)
    .where(and(eq(invitations.workspaceId, workspaceId), statusFilter))
    .orderBy(desc(invitations.updatedAt));
}

/** Autosave of client data only; the template/version columns are never touched. */
export async function updateInvitationData(
  db: Database,
  input: { invitationId: string; data: Record<string, unknown> },
): Promise<InvitationRow | undefined> {
  const [row] = await db
    .update(invitations)
    .set({ data: input.data, updatedAt: new Date() })
    .where(and(eq(invitations.id, input.invitationId), ne(invitations.status, "archived")))
    .returning();
  return row;
}

export async function updateInvitationTitle(
  db: Database,
  invitationId: string,
  title: string,
): Promise<InvitationRow | undefined> {
  const [row] = await db
    .update(invitations)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(invitations.id, invitationId), ne(invitations.status, "archived")))
    .returning();
  return row;
}

export async function archiveInvitationRow(
  db: Database,
  invitationId: string,
): Promise<InvitationRow | undefined> {
  const [row] = await db
    .update(invitations)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(invitations.id, invitationId), ne(invitations.status, "archived")))
    .returning();
  return row;
}

/** Template version + its owning workspace (for same-workspace checks). */
export async function findTemplateVersionWithWorkspace(
  db: Database,
  templateVersionId: string,
): Promise<{ version: TemplateVersionRow; workspaceId: string } | undefined> {
  const [row] = await db
    .select({ version: templateVersions, workspaceId: templates.workspaceId })
    .from(templateVersions)
    .innerJoin(templates, eq(templates.id, templateVersions.templateId))
    .where(eq(templateVersions.id, templateVersionId))
    .limit(1);
  return row;
}

/* ------------------------------------------------------------------ guests */

export async function insertGuest(
  db: Database,
  input: { invitationId: string; name: string; tokenId: string; maxParty: number },
): Promise<GuestRow> {
  const [row] = await db.insert(guests).values(input).returning();
  if (!row) throw new Error("insertGuest returned no row");
  return row;
}

export async function listGuests(
  db: Database,
  invitationId: string,
  options: { includeArchived?: boolean } = {},
): Promise<GuestRow[]> {
  const where = options.includeArchived
    ? eq(guests.invitationId, invitationId)
    : and(eq(guests.invitationId, invitationId), ne(guests.status, "archived"));
  return db.select().from(guests).where(where).orderBy(asc(guests.name), asc(guests.createdAt));
}

export async function findGuest(
  db: Database,
  invitationId: string,
  guestId: string,
): Promise<GuestRow | undefined> {
  const [row] = await db
    .select()
    .from(guests)
    .where(and(eq(guests.invitationId, invitationId), eq(guests.id, guestId)))
    .limit(1);
  return row;
}

export async function findGuestByToken(
  db: Database,
  tokenId: string,
): Promise<GuestRow | undefined> {
  const [row] = await db.select().from(guests).where(eq(guests.tokenId, tokenId)).limit(1);
  return row;
}

export async function updateGuestRow(
  db: Database,
  input: { invitationId: string; guestId: string; name?: string; maxParty?: number },
): Promise<GuestRow | undefined> {
  const { invitationId, guestId, ...changes } = input;
  const [row] = await db
    .update(guests)
    .set({
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.maxParty !== undefined && { maxParty: changes.maxParty }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(guests.invitationId, invitationId), eq(guests.id, guestId), ne(guests.status, "archived")),
    )
    .returning();
  return row;
}

export async function archiveGuestRow(
  db: Database,
  invitationId: string,
  guestId: string,
): Promise<GuestRow | undefined> {
  const [row] = await db
    .update(guests)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(eq(guests.invitationId, invitationId), eq(guests.id, guestId), ne(guests.status, "archived")),
    )
    .returning();
  return row;
}
