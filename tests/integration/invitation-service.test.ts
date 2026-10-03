// @vitest-environment node
/**
 * PRD refs: FR-INV-001..003, FR-GST-002..003, FR-PRV-001, AC-02, AC-03, AC-06, P-02.
 * Real (PGlite) DB: invitations pin a published TemplateVersion; client data
 * never touches the template.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeWorld } from "../helpers/world";
import { ForbiddenError } from "@/lib/auth/errors";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import { findTemplateById, listTemplateVersions } from "@/lib/db/repositories/templates";
import {
  GuestNotFoundError,
  InvitationArchivedError,
  InvitationInputError,
  InvitationNotFoundError,
  SAMPLE_GUEST_NAME,
  TemplateNotPublishedError,
  addGuest,
  archiveGuest,
  archiveInvitation,
  buildPreview,
  createInvitation,
  getInvitation,
  getInvitationReadiness,
  listInvitationGuests,
  listInvitations,
  saveInvitationData,
  updateGuest,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate, saveDraft } from "@/features/templates/service";
import type { ResolvedDocument } from "@/lib/engine";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let world: Awaited<ReturnType<typeof makeWorld>>;
let publishedTemplateId: string;
let draftOnlyTemplateId: string;

const db = () => conn.db;

const REQUIRED_VALUES = {
  "couple.bride.fullName": "Anindya Putri",
  "couple.groom.fullName": "Raka Pratama",
  "event.ceremony.startAt": "2027-03-14T09:00",
  "venue.name": "Gedung Serbaguna",
  "venue.address": "Jl. Melati No. 1",
};

function texts(resolved: ResolvedDocument): Map<string, string> {
  const out = new Map<string, string>();
  for (const section of resolved.sections) {
    for (const element of section.elements) {
      if (element.type === "text") out.set(element.id, element.text);
    }
  }
  return out;
}

function widgetProps(resolved: ResolvedDocument, id: string): Readonly<Record<string, unknown>> {
  for (const section of resolved.sections) {
    for (const element of section.elements) {
      if (element.type === "widget" && element.id === id) return element.props;
    }
  }
  throw new Error(`widget ${id} not found`);
}

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);

  const published = await createTemplate(db(), world.designerA, {
    workspaceId: world.wsA.id,
    name: "Elegant",
    document: fullDocument(),
  });
  await publishTemplate(db(), world.designerA, {
    templateId: published.id,
    expectedRevision: published.revision,
  });
  publishedTemplateId = published.id;

  const draftOnly = await createTemplate(db(), world.designerA, {
    workspaceId: world.wsA.id,
    name: "Belum publish",
    document: fullDocument(),
  });
  draftOnlyTemplateId = draftOnly.id;
});
afterAll(async () => {
  await conn.close();
});

async function newInvitation(title: string, actor = world.operatorA) {
  return createInvitation(db(), actor, {
    workspaceId: world.wsA.id,
    templateId: publishedTemplateId,
    title,
  });
}

describe("create invitation from a TemplateVersion (FR-INV-001)", () => {
  it("lets an operator create an invitation without Design Mode and pins the published version", async () => {
    const invitation = await newInvitation("Pernikahan Anin & Raka");
    expect(invitation.status).toBe("draft");
    expect(invitation.slug).toMatch(/^pernikahan-anin-raka-[0-9a-f]{8}$/);

    const detail = await getInvitation(db(), world.operatorA, invitation.id);
    expect(detail.template).toMatchObject({ templateId: publishedTemplateId, versionNo: 1 });
    expect(detail.document.variables.length).toBeGreaterThan(0);
    expect(detail.data).toEqual({});

    const listed = await listInvitations(db(), world.operatorA, world.wsA.id);
    expect(listed.map((i) => i.id)).toContain(invitation.id);
  });

  it("generates unique slugs for identical titles", async () => {
    const a = await newInvitation("Sama");
    const b = await newInvitation("Sama");
    expect(a.slug).not.toBe(b.slug);
  });

  it("rejects unpublished, cross-workspace and invalid templates, and bad titles", async () => {
    await expect(
      createInvitation(db(), world.operatorA, {
        workspaceId: world.wsA.id,
        templateId: draftOnlyTemplateId,
        title: "X",
      }),
    ).rejects.toBeInstanceOf(TemplateNotPublishedError);

    // owner of workspace B cannot use workspace A's template in workspace B
    await expect(
      createInvitation(db(), world.ownerB, {
        workspaceId: world.wsB.id,
        templateId: publishedTemplateId,
        title: "X",
      }),
    ).rejects.toBeInstanceOf(InvitationInputError);

    // non-member of workspace A
    await expect(
      createInvitation(db(), world.ownerB, {
        workspaceId: world.wsA.id,
        templateId: publishedTemplateId,
        title: "X",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(newInvitation("   ")).rejects.toBeInstanceOf(InvitationInputError);
    await expect(
      createInvitation(db(), world.operatorA, {
        workspaceId: world.wsA.id,
        templateId: "not-a-uuid",
        title: "X",
      }),
    ).rejects.toBeInstanceOf(InvitationInputError);
  });

  it("hides invitations from other workspaces (existence is not leaked)", async () => {
    const invitation = await newInvitation("Rahasia");
    await expect(getInvitation(db(), world.ownerB, invitation.id)).rejects.toBeInstanceOf(
      InvitationNotFoundError,
    );
    await expect(listInvitations(db(), world.ownerB, world.wsA.id)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await expect(getInvitation(db(), world.ownerA, "not-a-uuid")).rejects.toBeInstanceOf(
      InvitationNotFoundError,
    );
  });
});

describe("Data Mode autosave (FR-INV-002, AC-02)", () => {
  it("stores typed values, reports required gaps and keeps saving partial data", async () => {
    const invitation = await newInvitation("Partial");
    const result = await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { "couple.bride.fullName": "Anindya Putri", "couple.bride.nickname": "Anin" },
    });
    expect(result.issues.some((i) => i.code === "missing_required")).toBe(true);

    const detail = await getInvitation(db(), world.operatorA, invitation.id);
    expect(detail.data).toMatchObject({
      "couple.bride.fullName": "Anindya Putri",
      "couple.bride.nickname": "Anin",
    });
  });

  it("does not persist values of the wrong type but still reports them", async () => {
    const invitation = await newInvitation("Salah tipe");
    const result = await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { "venue.coordinate": "bukan koordinat", "venue.name": "Aula" },
    });
    expect(result.issues.some((i) => i.key === "venue.coordinate" && i.code === "wrong_type")).toBe(
      true,
    );
    const detail = await getInvitation(db(), world.operatorA, invitation.id);
    expect(detail.data).not.toHaveProperty("venue.coordinate");
    expect(detail.data["venue.name"]).toBe("Aula");
  });

  it("gates readiness on required variables (FR-INV-003 groundwork)", async () => {
    const invitation = await newInvitation("Kesiapan");
    const before = await getInvitationReadiness(db(), world.operatorA, invitation.id);
    expect(before.ready).toBe(false);
    expect(before.issues.map((i) => i.key)).toEqual(
      expect.arrayContaining(Object.keys(REQUIRED_VALUES)),
    );

    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: REQUIRED_VALUES,
    });
    const after = await getInvitationReadiness(db(), world.operatorA, invitation.id);
    expect(after).toEqual({ ready: true, issues: [] });
  });

  it("changing one variable updates every bound element (one edit, many places)", async () => {
    const invitation = await newInvitation("Satu edit");
    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { ...REQUIRED_VALUES, "couple.bride.nickname": "Anin" },
    });
    const first = await buildPreview(db(), world.operatorA, { invitationId: invitation.id });
    expect(texts(first.resolved).get("el_title")).toContain("Anin");
    expect(texts(first.resolved).get("el_venue_name")).toBe("GEDUNG SERBAGUNA");
    expect(widgetProps(first.resolved, "wdg_map").label).toBe("Gedung Serbaguna");

    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: {
        ...REQUIRED_VALUES,
        "couple.bride.nickname": "Dinda",
        "venue.name": "Hotel Mawar",
      },
    });
    const second = await buildPreview(db(), world.operatorA, { invitationId: invitation.id });
    expect(texts(second.resolved).get("el_title")).toContain("Dinda");
    expect(texts(second.resolved).get("el_venue_name")).toBe("HOTEL MAWAR");
    expect(widgetProps(second.resolved, "wdg_map").label).toBe("Hotel Mawar");
  });

  it("rejects writes by readers outside the workspace and on archived invitations", async () => {
    const invitation = await newInvitation("Arsip");
    await expect(
      saveInvitationData(db(), world.ownerB, { invitationId: invitation.id, values: {} }),
    ).rejects.toBeInstanceOf(InvitationNotFoundError);

    await archiveInvitation(db(), world.ownerA, invitation.id);
    await expect(
      saveInvitationData(db(), world.operatorA, {
        invitationId: invitation.id,
        values: { "venue.name": "X" },
      }),
    ).rejects.toBeInstanceOf(InvitationArchivedError);
    const active = await listInvitations(db(), world.ownerA, world.wsA.id);
    expect(active.map((i) => i.id)).not.toContain(invitation.id);
    const archived = await listInvitations(db(), world.ownerA, world.wsA.id, { archived: true });
    expect(archived.map((i) => i.id)).toContain(invitation.id);
  });
});

describe("two invitations from one template (AC-03, P-02)", () => {
  it("previews differ per invitation while the template stays unchanged", async () => {
    const templateBefore = await findTemplateById(db(), publishedTemplateId);
    const versionsBefore = await listTemplateVersions(db(), publishedTemplateId);

    const a = await newInvitation("Undangan A");
    const b = await newInvitation("Undangan B");
    await saveInvitationData(db(), world.operatorA, {
      invitationId: a.id,
      values: { ...REQUIRED_VALUES, "couple.bride.nickname": "Anin", "couple.groom.nickname": "Raka" },
    });
    await saveInvitationData(db(), world.operatorA, {
      invitationId: b.id,
      values: {
        ...REQUIRED_VALUES,
        "couple.bride.fullName": "Sekar Ayu",
        "couple.bride.nickname": "Sekar",
        "couple.groom.nickname": "Bima",
        "venue.name": "Pendopo Agung",
      },
    });

    const previewA = await buildPreview(db(), world.operatorA, { invitationId: a.id });
    const previewB = await buildPreview(db(), world.operatorA, { invitationId: b.id });
    expect(texts(previewA.resolved).get("el_title")).toBe("Anin & Raka");
    expect(texts(previewB.resolved).get("el_title")).toBe("Sekar & Bima");
    expect(texts(previewA.resolved).get("el_venue_name")).not.toBe(
      texts(previewB.resolved).get("el_venue_name"),
    );

    const templateAfter = await findTemplateById(db(), publishedTemplateId);
    expect(templateAfter?.draftDocument).toEqual(templateBefore?.draftDocument);
    expect(templateAfter?.revision).toBe(templateBefore?.revision);
    expect(templateAfter?.publishedVersionNo).toBe(templateBefore?.publishedVersionNo);
    expect(await listTemplateVersions(db(), publishedTemplateId)).toEqual(versionsBefore);
  });

  it("keeps the pinned version when the template is republished later", async () => {
    const invitation = await newInvitation("Pinned");
    const draft = await findTemplateById(db(), publishedTemplateId);
    if (!draft) throw new Error("template missing");
    const changed = fullDocument();
    changed.variables = (changed.variables ?? []).filter((v) => v.key !== "venue.address");
    // venue.address is bound nowhere in the fixture, so the draft stays semantically valid.
    const saved = await saveDraft(db(), world.designerA, {
      templateId: publishedTemplateId,
      expectedRevision: draft.revision,
      document: changed,
    });
    await publishTemplate(db(), world.designerA, {
      templateId: publishedTemplateId,
      expectedRevision: saved.revision,
    });

    const pinned = await getInvitation(db(), world.operatorA, invitation.id);
    expect(pinned.template.versionNo).toBe(1);
    expect(pinned.document.variables.some((v) => v.key === "venue.address")).toBe(true);

    const fresh = await newInvitation("Versi baru");
    expect((await getInvitation(db(), world.operatorA, fresh.id)).template.versionNo).toBe(2);
  });
});

describe("guests (FR-GST-002) and preview context (FR-GST-003, AC-06)", () => {
  it("adds guests with unique opaque tokens, lists, updates and archives them", async () => {
    const invitation = await newInvitation("Tamu");
    const budi = await addGuest(db(), world.operatorA, {
      invitationId: invitation.id,
      name: "  Budi   Santoso ",
      maxParty: 2,
    });
    const siti = await addGuest(db(), world.operatorA, {
      invitationId: invitation.id,
      name: "Siti",
    });
    expect(budi.name).toBe("Budi Santoso");
    expect(budi.maxParty).toBe(2);
    expect(siti.maxParty).toBe(1);
    expect(budi.tokenId).not.toBe(siti.tokenId);
    expect(budi.tokenId).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(budi.tokenId).not.toContain(budi.id);

    const renamed = await updateGuest(db(), world.operatorA, {
      invitationId: invitation.id,
      guestId: siti.id,
      name: "Siti Aminah",
      maxParty: 4,
    });
    expect(renamed).toMatchObject({ name: "Siti Aminah", maxParty: 4, tokenId: siti.tokenId });

    const list = await listInvitationGuests(db(), world.operatorA, invitation.id);
    expect(list.map((g) => g.name)).toEqual(["Budi Santoso", "Siti Aminah"]);

    await archiveGuest(db(), world.operatorA, { invitationId: invitation.id, guestId: budi.id });
    expect((await listInvitationGuests(db(), world.operatorA, invitation.id)).map((g) => g.id)).toEqual([
      siti.id,
    ]);
    await expect(
      archiveGuest(db(), world.operatorA, { invitationId: invitation.id, guestId: budi.id }),
    ).rejects.toBeInstanceOf(GuestNotFoundError);
  });

  it("validates guest input and isolates guests across invitations and workspaces", async () => {
    const one = await newInvitation("Satu");
    const two = await newInvitation("Dua");
    await expect(
      addGuest(db(), world.operatorA, { invitationId: one.id, name: "" }),
    ).rejects.toBeInstanceOf(InvitationInputError);
    await expect(
      addGuest(db(), world.operatorA, { invitationId: one.id, name: "Ok", maxParty: 21 }),
    ).rejects.toBeInstanceOf(InvitationInputError);
    await expect(
      addGuest(db(), world.ownerB, { invitationId: one.id, name: "Penyusup" }),
    ).rejects.toBeInstanceOf(InvitationNotFoundError);

    const guest = await addGuest(db(), world.operatorA, { invitationId: one.id, name: "Tamu Satu" });
    // a guest of invitation one cannot be touched through invitation two
    await expect(
      updateGuest(db(), world.operatorA, { invitationId: two.id, guestId: guest.id, name: "X" }),
    ).rejects.toBeInstanceOf(GuestNotFoundError);
    await expect(
      buildPreview(db(), world.operatorA, {
        invitationId: two.id,
        guest: { kind: "guest", guestId: guest.id },
      }),
    ).rejects.toBeInstanceOf(GuestNotFoundError);
  });

  it("Guest A and Guest B see different names; generic and sample contexts work (AC-06)", async () => {
    const invitation = await newInvitation("Konteks tamu");
    await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: REQUIRED_VALUES,
    });
    const guestA = await addGuest(db(), world.operatorA, { invitationId: invitation.id, name: "Ani" });
    const guestB = await addGuest(db(), world.operatorA, { invitationId: invitation.id, name: "Budi" });

    const forA = await buildPreview(db(), world.operatorA, {
      invitationId: invitation.id,
      guest: { kind: "guest", guestId: guestA.id },
    });
    const forB = await buildPreview(db(), world.operatorA, {
      invitationId: invitation.id,
      guest: { kind: "guest", guestId: guestB.id },
    });
    const generic = await buildPreview(db(), world.operatorA, { invitationId: invitation.id });
    const sample = await buildPreview(db(), world.operatorA, {
      invitationId: invitation.id,
      guest: { kind: "sample" },
    });

    expect(widgetProps(forA.resolved, "wdg_greeting").guestName).toBe("Ani");
    expect(widgetProps(forB.resolved, "wdg_greeting").guestName).toBe("Budi");
    expect(widgetProps(generic.resolved, "wdg_greeting").guestName).toBeNull();
    expect(widgetProps(sample.resolved, "wdg_greeting").guestName).toBe(SAMPLE_GUEST_NAME);
    expect(forA.guestLabel).toBe("Tamu: Ani");

    // guest.name is runtime context only: it is never written into invitation data
    const detail = await getInvitation(db(), world.operatorA, invitation.id);
    expect(detail.data).not.toHaveProperty("guest.name");
  });

  it("does not let guest.name be injected through invitation data", async () => {
    const invitation = await newInvitation("Injeksi");
    const result = await saveInvitationData(db(), world.operatorA, {
      invitationId: invitation.id,
      values: { ...REQUIRED_VALUES, "guest.name": "Palsu" },
    });
    expect(result.invitation.id).toBe(invitation.id);
    const detail = await getInvitation(db(), world.operatorA, invitation.id);
    expect(detail.data).not.toHaveProperty("guest.name");
    const preview = await buildPreview(db(), world.operatorA, { invitationId: invitation.id });
    expect(widgetProps(preview.resolved, "wdg_greeting").guestName).toBeNull();
  });
});

describe("audit trail (FR-AUD-001)", () => {
  it("records invitation and guest lifecycle events", async () => {
    const invitation = await newInvitation("Audit");
    const guest = await addGuest(db(), world.operatorA, { invitationId: invitation.id, name: "Dewi" });
    await archiveGuest(db(), world.operatorA, { invitationId: invitation.id, guestId: guest.id });
    await archiveInvitation(db(), world.ownerA, invitation.id);

    const invitationLogs = await listAuditLogs(db(), world.wsA.id, {
      entityType: "invitation",
      entityId: invitation.id,
    });
    expect(invitationLogs.map((l) => l.action).sort()).toEqual([
      "invitation.archive",
      "invitation.create",
    ]);
    const guestLogs = await listAuditLogs(db(), world.wsA.id, {
      entityType: "guest",
      entityId: guest.id,
    });
    expect(guestLogs.map((l) => l.action).sort()).toEqual(["guest.archive", "guest.create"]);
  });
});
