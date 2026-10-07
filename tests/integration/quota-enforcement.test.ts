// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeUser } from "../helpers/world";
import {
  createResellerClient,
  createResellerWithProfile,
} from "@/lib/db/repositories/resellers";
import { createWorkspaceWithOwner } from "@/lib/db/repositories/workspaces";
import {
  createInvitation,
  publishInvitation,
  saveInvitationData,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate } from "@/features/templates/service";
import { getClientAgencyBranding } from "@/features/reseller/api";
import { ForbiddenError } from "@/lib/auth/errors";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;

const db = () => conn.db;

const REQUIRED_DATA = {
  "couple.bride.fullName": "Siti Nurhaliza",
  "couple.groom.fullName": "Ahmad Fauzi",
  "event.ceremony.startAt": "2027-05-20T09:00",
  "venue.name": "Grand Ballroom Hotel Harmoni",
  "venue.address": "Jl. Gatot Subroto No. 45, Jakarta",
};

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("Admin Authority & Invitation Publishing (No Credit Quota Restrictions)", () => {
  it("allows direct platform users to publish invitations freely without quota restrictions", async () => {
    const directUser = await makeUser(db(), "direct-user");
    const directWs = await createWorkspaceWithOwner(db(), {
      name: "Direct Workspace",
      slug: "direct-ws",
      ownerUserId: directUser.id,
    });

    const tpl = await createTemplate(db(), { userId: directUser.id }, {
      workspaceId: directWs.id,
      name: "Direct Template",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: directUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: directUser.id }, {
      workspaceId: directWs.id,
      templateId: tpl.id,
      title: "Direct Invitation",
    });

    await saveInvitationData(db(), { userId: directUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    const snapshot = await publishInvitation(
      db(),
      { userId: directUser.id },
      invitation.id,
    );

    expect(snapshot.revisionNo).toBe(1);
    expect(snapshot.active).toBe(true);
  });

  it("allows publishing multiple revisions freely without quota deduction", async () => {
    const adminUser = await makeUser(db(), "admin-republish");
    const ws = await createWorkspaceWithOwner(db(), {
      name: "Republish WS",
      slug: "republish-ws",
      ownerUserId: adminUser.id,
    });

    const tpl = await createTemplate(db(), { userId: adminUser.id }, {
      workspaceId: ws.id,
      name: "Republish Template",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: adminUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: adminUser.id }, {
      workspaceId: ws.id,
      templateId: tpl.id,
      title: "Wedding of Client Edit",
    });

    await saveInvitationData(db(), { userId: adminUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    // Revision 1
    const rev1 = await publishInvitation(db(), { userId: adminUser.id }, invitation.id);
    expect(rev1.revisionNo).toBe(1);

    // Update draft data
    await saveInvitationData(db(), { userId: adminUser.id }, {
      invitationId: invitation.id,
      values: {
        ...REQUIRED_DATA,
        "venue.name": "Updated Ballroom 2027",
      },
    });

    // Revision 2
    const rev2 = await publishInvitation(db(), { userId: adminUser.id }, invitation.id);
    expect(rev2.revisionNo).toBe(2);
    expect(rev2.active).toBe(true);
  });

  it("blocks reseller from directly publishing or editing invitations (Admin Authority Lock)", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "reseller.lock@agency.test",
      name: "Lock Reseller",
      agencyName: "Lock Agency",
      slug: "lock-agency",
      whatsappContact: "62899001122",
    });

    const client = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Client Alpha",
      clientEmail: "alpha@client.test",
      workspaceSlug: "alpha-wedding",
    });

    const tpl = await createTemplate(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      name: "Template Alpha",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: client.clientUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      templateId: tpl.id,
      title: "Wedding of Alpha",
    });

    // Attempt by reseller to modify invitation data must be blocked
    await expect(
      saveInvitationData(
        db(),
        { userId: reseller.user.id, systemRole: "reseller" },
        {
          invitationId: invitation.id,
          values: REQUIRED_DATA,
        },
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("resolves white-label agency branding for reseller clients", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "branding-whitelabel@agency.test",
      name: "Branding Owner",
      agencyName: "Lestari Wedding Art",
      slug: "lestari-wedding",
      whatsappContact: "62812345678",
    });

    const client = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Klien Lestari",
      clientEmail: "klien@lestari.test",
      workspaceSlug: "lestari-client-ws",
    });

    const branding = await getClientAgencyBranding(client.clientUser.resellerId!, db());
    expect(branding).toBeDefined();
    expect(branding?.agencyName).toBe("Lestari Wedding Art");
    expect(branding?.whatsappContact).toBe("62812345678");
  });
});
