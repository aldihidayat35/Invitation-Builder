// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeWorld } from "../helpers/world";
import {
  createInvitation,
  archiveInvitation,
  deleteInvitation,
  permanentDeleteInvitation,
  getInvitation,
  addGuest,
  publishInvitation,
  saveInvitationData,
  InvitationNotFoundError,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate } from "@/features/templates/service";
import { hasPublishedSnapshots } from "@/lib/db/repositories/invitations";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
let world: Awaited<ReturnType<typeof makeWorld>>;
let publishedTemplateId: string;

const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
  world = await makeWorld(conn.db);

  const published = await createTemplate(db(), world.designerA, {
    workspaceId: world.wsA.id,
    name: "Master Template Test",
    document: fullDocument(),
  });
  await publishTemplate(db(), world.designerA, {
    templateId: published.id,
    expectedRevision: published.revision,
  });
  publishedTemplateId = published.id;
});

afterAll(async () => {
  await conn.close();
});

describe("Permanent Deletion of Archived Invitations", () => {
  it("permanently deletes an archived invitation including its published snapshots and guests", async () => {
    // 1. Buat undangan
    const inv = await createInvitation(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      templateId: publishedTemplateId,
      title: "Pernikahan Budi & Ani",
    });

    // 2. Isi data required dan tambah tamu
    await saveInvitationData(db(), world.ownerA, {
      invitationId: inv.id,
      values: {
        "couple.bride.fullName": "Anindya Putri",
        "couple.groom.fullName": "Raka Pratama",
        "event.ceremony.startAt": "2027-03-14T09:00",
        "venue.name": "Gedung Serbaguna",
        "venue.address": "Jl. Melati No. 1",
      },
    });

    await addGuest(db(), world.ownerA, {
      invitationId: inv.id,
      name: "Tamu Kehormatan",
      maxParty: 2,
    });

    // 3. Publish undangan (menghasilkan published snapshot)
    await publishInvitation(db(), world.ownerA, inv.id);

    expect(await hasPublishedSnapshots(db(), inv.id)).toBe(true);

    // 4. Arsipkan undangan
    const archived = await archiveInvitation(db(), world.ownerA, inv.id);
    expect(archived.status).toBe("archived");

    // 5. Hapus permanen undangan yang sudah diarsip
    const delResult = await deleteInvitation(db(), world.ownerA, inv.id);
    expect(delResult.deleted).toBe(true);
    expect(delResult.archived).toBe(false);

    // 6. Verifikasi undangan sudah lenyap dari database
    await expect(getInvitation(db(), world.ownerA, inv.id)).rejects.toThrow(
      InvitationNotFoundError,
    );

    // 7. Verifikasi snapshot sudah tidak ada
    expect(await hasPublishedSnapshots(db(), inv.id)).toBe(false);
  });

  it("permanentDeleteInvitation helper directly hard-deletes an invitation", async () => {
    const inv = await createInvitation(db(), world.ownerA, {
      workspaceId: world.wsA.id,
      templateId: publishedTemplateId,
      title: "Pernikahan Langsung Hapus",
    });

    const res = await permanentDeleteInvitation(db(), world.ownerA, inv.id);
    expect(res.deleted).toBe(true);

    await expect(getInvitation(db(), world.ownerA, inv.id)).rejects.toThrow(
      InvitationNotFoundError,
    );
  });
});
