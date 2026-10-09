// @vitest-environment node
/**
 * PRD refs: FR-INV-004, FR-PUB-001..003, AC-09, AC-10, P-06, NFR-REL-001.
 * Real (PGlite) DB: publishing creates immutable snapshots; the public read
 * model never leaks the draft.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeWorld } from "../helpers/world";
import { ForbiddenError } from "@/lib/auth/errors";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import { publishedSnapshots } from "@/lib/db/schema";
import {
  InvitationNotFoundError,
  PublishBlockedError,
  RevisionNotFoundError,
  addGuest,
  archiveGuest,
  archiveInvitation,
  createInvitation,
  getPublicInvitation,
  listInvitationSnapshots,
  publishInvitation,
  rollbackInvitation,
  saveInvitationData,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate } from "@/features/templates/service";
import type { ResolvedDocument } from "@/lib/engine";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let world: Awaited<ReturnType<typeof makeWorld>>;
let templateId: string;

const db = () => conn.db;

const REQUIRED = {
  "couple.bride.fullName": "Anindya Putri",
  "couple.groom.fullName": "Raka Pratama",
  "event.ceremony.startAt": "2027-03-14T09:00",
  "venue.name": "Gedung Serbaguna",
  "venue.address": "Jl. Melati No. 1",
};

function allText(resolved: ResolvedDocument): string {
  const out: string[] = [];
  for (const section of resolved.sections) {
    for (const element of section.elements) if (element.type === "text") out.push(element.text);
  }
  return out.join("|");
}

async function readyInvitation(title: string) {
  const invitation = await createInvitation(db(), world.operatorA, {
    workspaceId: world.wsA.id,
    templateId,
    title,
  });
  await saveInvitationData(db(), world.operatorA, {
    invitationId: invitation.id,
    values: REQUIRED,
  });
  return invitation;
}

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);
  const tpl = await createTemplate(db(), world.designerA, {
    workspaceId: world.wsA.id,
    name: "Elegant",
    document: fullDocument(),
  });
  await publishTemplate(db(), world.designerA, {
    templateId: tpl.id,
    expectedRevision: tpl.revision,
  });
  templateId = tpl.id;
});
afterAll(async () => {
  await conn.close();
});

describe("publish gate (FR-INV-004)", () => {
  it("blocks publishing while required data is missing", async () => {
    const invitation = await createInvitation(db(), world.operatorA, {
      workspaceId: world.wsA.id,
      templateId,
      title: "Belum lengkap",
    });
    await expect(publishInvitation(db(), world.ownerA, invitation.id)).rejects.toBeInstanceOf(
      PublishBlockedError,
    );
    expect(await getPublicInvitation(db(), { slug: invitation.slug })).toBeNull();
  });

  it("publishes a ready invitation and serves it by slug without a session", async () => {
    const invitation = await readyInvitation("Siap");
    const snap = await publishInvitation(db(), world.ownerA, invitation.id);
    expect(snap.revisionNo).toBe(1);
    const pub = await getPublicInvitation(db(), { slug: invitation.slug });
    expect(pub?.resolved.ok).toBe(true);
    expect(allText(pub!.resolved)).toContain("GEDUNG SERBAGUNA");
    expect(pub?.hasGuest).toBe(false);
    // No database identifiers leak into the public model.
    expect(JSON.stringify(pub)).not.toContain(invitation.id);
  });

  it("denies publishing to a different workspace and records an audit entry", async () => {
    const invitation = await readyInvitation("Audit");
    await expect(publishInvitation(db(), world.ownerB, invitation.id)).rejects.toBeInstanceOf(
      InvitationNotFoundError,
    );
    await publishInvitation(db(), world.ownerA, invitation.id);
    const logs = await listAuditLogs(db(), world.wsA.id);
    expect(
      logs.some((l) => l.action === "invitation.publish" && l.entityId === invitation.id),
    ).toBe(true);
  });
});

describe("draft isolation and republish (AC-10, P-06)", () => {
  it("keeps live content unchanged after draft edits until republished", async () => {
    const invitation = await readyInvitation("Isolasi");
    await publishInvitation(db(), world.ownerA, invitation.id);
    const before = await getPublicInvitation(db(), { slug: invitation.slug });

    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { ...REQUIRED, "venue.name": "Pendopo Agung" },
    });
    const stillLive = await getPublicInvitation(db(), { slug: invitation.slug });
    expect(allText(stillLive!.resolved)).toBe(allText(before!.resolved));
    expect(allText(stillLive!.resolved)).not.toContain("PENDOPO");

    const snap = await publishInvitation(db(), world.ownerA, invitation.id);
    expect(snap.revisionNo).toBe(2);
    const updated = await getPublicInvitation(db(), { slug: invitation.slug });
    expect(allText(updated!.resolved)).toContain("PENDOPO AGUNG");
  });

  it("keeps old snapshots readable and supports rollback (FR-PUB-003)", async () => {
    const invitation = await readyInvitation("Rollback");
    await publishInvitation(db(), world.ownerA, invitation.id);
    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { ...REQUIRED, "venue.name": "Pendopo Agung" },
    });
    await publishInvitation(db(), world.ownerA, invitation.id);

    const list = await listInvitationSnapshots(db(), world.operatorA, invitation.id);
    expect(list.map((s) => [s.revisionNo, s.active])).toEqual([
      [2, true],
      [1, false],
    ]);

    await rollbackInvitation(db(), world.ownerA, { invitationId: invitation.id, revisionNo: 1 });
    const pub = await getPublicInvitation(db(), { slug: invitation.slug });
    expect(pub?.revisionNo).toBe(1);
    expect(allText(pub!.resolved)).toContain("GEDUNG SERBAGUNA");
    expect(
      (await listInvitationSnapshots(db(), world.operatorA, invitation.id)).find((s) => s.active)
        ?.revisionNo,
    ).toBe(1);

    await expect(
      rollbackInvitation(db(), world.ownerA, { invitationId: invitation.id, revisionNo: 99 }),
    ).rejects.toBeInstanceOf(RevisionNotFoundError);
    const logs = await listAuditLogs(db(), world.wsA.id);
    expect(logs.some((l) => l.action === "invitation.rollback")).toBe(true);
  });

  it("published snapshots are immutable at the database level (P-06)", async () => {
    const invitation = await readyInvitation("Immutable");
    await publishInvitation(db(), world.ownerA, invitation.id);
    await expect(db().update(publishedSnapshots).set({ data: {} })).rejects.toThrow();
  });
});

describe("public read model", () => {
  it("returns null for archived invitations", async () => {
    const invitation = await readyInvitation("Arsip");
    await publishInvitation(db(), world.ownerA, invitation.id);
    await archiveInvitation(db(), world.operatorA, invitation.id);
    expect(await getPublicInvitation(db(), { slug: invitation.slug })).toBeNull();
  });

  it("returns null for unknown slugs", async () => {
    expect(await getPublicInvitation(db(), { slug: "tidak-ada" })).toBeNull();
    expect(await getPublicInvitation(db(), { slug: "" })).toBeNull();
  });

  it("applies guest context only for tokens of the same invitation", async () => {
    const a = await readyInvitation("Konteks A");
    const b = await readyInvitation("Konteks B");
    await publishInvitation(db(), world.ownerA, a.id);
    await publishInvitation(db(), world.ownerA, b.id);
    const guestA = await addGuest(db(), world.operatorA, { invitationId: a.id, name: "Wulan" });
    const guestB = await addGuest(db(), world.operatorA, { invitationId: b.id, name: "Budi" });

    const own = await getPublicInvitation(db(), { slug: a.slug, guestToken: guestA.tokenId });
    expect(own?.hasGuest).toBe(true);
    expect(own?.guestName).toBe("Wulan");

    // Direct name lookup (matching registered guest by name)
    const byRegisteredName = await getPublicInvitation(db(), { slug: a.slug, guestName: "wulan" });
    expect(byRegisteredName?.hasGuest).toBe(true);
    expect(byRegisteredName?.guestName).toBe("Wulan");
    expect(byRegisteredName?.guestToken).toBe(guestA.tokenId);

    // Ad-hoc personalized name (not in guest list, from ?to=Pak+Bambang)
    const adHoc = await getPublicInvitation(db(), { slug: a.slug, guestName: "Pak+Bambang" });
    expect(adHoc?.hasGuest).toBe(true);
    expect(adHoc?.guestName).toBe("Pak Bambang");
    expect(adHoc?.guestToken).toBeUndefined();

    const foreign = await getPublicInvitation(db(), { slug: a.slug, guestToken: guestB.tokenId });
    expect(foreign?.hasGuest).toBe(false);
    expect(allText(foreign!.resolved)).not.toContain("Budi");

    const bogus = await getPublicInvitation(db(), { slug: a.slug, guestToken: "bogus" });
    expect(bogus?.hasGuest).toBe(false);

    await archiveGuest(db(), world.operatorA, { invitationId: a.id, guestId: guestA.id });
    const archived = await getPublicInvitation(db(), { slug: a.slug, guestToken: guestA.tokenId });
    expect(archived?.hasGuest).toBe(false);
  });

  it("allows draft preview with allowDraft: true before publishing for client review", async () => {
    const invitation = await readyInvitation("Review Klien");
    // Standard public read returns null while in draft
    expect(await getPublicInvitation(db(), { slug: invitation.slug })).toBeNull();

    // Draft preview returns the rendered model for client review
    const preview = await getPublicInvitation(db(), { slug: invitation.slug, allowDraft: true });
    expect(preview).not.toBeNull();
    expect(preview?.isDraft).toBe(true);
    expect(preview?.slug).toBe(invitation.slug);
    expect(preview?.resolved.ok).toBe(true);
    expect(allText(preview!.resolved)).toContain("GEDUNG SERBAGUNA");

    // Once published, isDraft becomes false
    await publishInvitation(db(), world.ownerA, invitation.id);
    const pub = await getPublicInvitation(db(), { slug: invitation.slug });
    expect(pub).not.toBeNull();
    expect(pub?.isDraft).toBe(false);
  });
});
