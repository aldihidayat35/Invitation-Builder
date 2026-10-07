// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeUser } from "../helpers/world";
import {
  createResellerClient,
  createResellerWithProfile,
  findResellerProfileById,
  listCreditTransactions,
} from "@/lib/db/repositories/resellers";
import { listUsersByReseller } from "@/lib/db/repositories/users";
import { createWorkspaceWithOwner } from "@/lib/db/repositories/workspaces";
import { InsufficientQuotaError } from "@/lib/auth/errors";
import {
  createInvitation,
  publishInvitation,
  saveInvitationData,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate } from "@/features/templates/service";
import { getClientAgencyBranding } from "@/features/reseller/api";

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

describe("Phase 4: Enforcement Kuota & Isolasi Akses Multi-Tenant", () => {
  it("allows direct platform users to publish invitations without quota deduction", async () => {
    // 1. Create a direct client user and workspace (no reseller affiliation)
    const directUser = await makeUser(db(), "direct-user");
    const directWs = await createWorkspaceWithOwner(db(), {
      name: "Direct Workspace",
      slug: "direct-ws",
      ownerUserId: directUser.id,
    });

    // Create and publish a template in this workspace
    const tpl = await createTemplate(db(), { userId: directUser.id }, {
      workspaceId: directWs.id,
      name: "Direct Template",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: directUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    // Create invitation & fill required data
    const invitation = await createInvitation(db(), { userId: directUser.id }, {
      workspaceId: directWs.id,
      templateId: tpl.id,
      title: "Direct Client Wedding",
    });
    await saveInvitationData(db(), { userId: directUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    // Direct publish succeeds without any reseller quota check
    const published = await publishInvitation(db(), { userId: directUser.id }, invitation.id);
    expect(published.revisionNo).toBe(1);
    expect(published.active).toBe(true);
  });

  it("atomically deducts 1 credit when a reseller-affiliated client publishes an invitation", async () => {
    // 1. Provision Reseller A with 5 credits
    const resellerA = await createResellerWithProfile(db(), {
      email: "reseller.alpha@agency.test",
      name: "Reseller Alpha",
      agencyName: "Alpha Wedding Agency",
      slug: "alpha-agency",
      whatsappContact: "62811223344",
      initialCredits: 5,
    });

    // 2. Reseller creates a client with dedicated workspace
    const client = await createResellerClient(db(), {
      resellerUserId: resellerA.user.id,
      clientName: "Budi & Ani",
      clientEmail: "budi.ani@client.test",
      workspaceSlug: "budi-ani-wedding",
    });

    // Client creates template and invitation in client workspace
    const clientTpl = await createTemplate(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      name: "Budi Ani Wedding Design",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: client.clientUser.id }, {
      templateId: clientTpl.id,
      expectedRevision: clientTpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      templateId: clientTpl.id,
      title: "The Wedding of Budi & Ani",
    });

    await saveInvitationData(db(), { userId: client.clientUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    // 3. Client publishes invitation
    const snapshot = await publishInvitation(
      db(),
      { userId: client.clientUser.id },
      invitation.id,
    );
    expect(snapshot.revisionNo).toBe(1);
    expect(snapshot.active).toBe(true);

    // 4. Verify Reseller quota is decremented from 5 -> 4
    const profile = await findResellerProfileById(db(), resellerA.profile.id);
    expect(profile?.creditQuota).toBe(4);

    // 5. Verify credit ledger recorded the deduction
    const txs = await listCreditTransactions(db(), resellerA.profile.id);
    const deductTx = txs.find((t) => t.type === "publish_deduct");
    expect(deductTx).toBeDefined();
    expect(deductTx?.amount).toBe(-1);
    expect(deductTx?.balanceBefore).toBe(5);
    expect(deductTx?.balanceAfter).toBe(4);
    expect(deductTx?.referenceId).toBe(invitation.id);
  });

  it("does not deduct additional quota when updating and re-publishing an already published invitation", async () => {
    // 1. Reseller with 3 credits
    const reseller = await createResellerWithProfile(db(), {
      email: "reseller.republish@agency.test",
      name: "Republish Reseller",
      agencyName: "Republish Agency",
      slug: "republish-agency",
      whatsappContact: "62899001122",
      initialCredits: 3,
    });

    const client = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Client Edit",
      clientEmail: "edit@client.test",
      workspaceSlug: "edit-wedding",
    });

    const tpl = await createTemplate(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      name: "Template Edit",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: client.clientUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      templateId: tpl.id,
      title: "Wedding of Client Edit",
    });

    await saveInvitationData(db(), { userId: client.clientUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    // First publish (consumes 1 credit: 3 -> 2)
    const rev1 = await publishInvitation(db(), { userId: client.clientUser.id }, invitation.id);
    expect(rev1.revisionNo).toBe(1);

    const profileAfterRev1 = await findResellerProfileById(db(), reseller.profile.id);
    expect(profileAfterRev1?.creditQuota).toBe(2);

    // Update draft data
    await saveInvitationData(db(), { userId: client.clientUser.id }, {
      invitationId: invitation.id,
      values: {
        ...REQUIRED_DATA,
        "venue.name": "Updated Ballroom 2027",
      },
    });

    // Re-publish (Revision 2)
    const rev2 = await publishInvitation(db(), { userId: client.clientUser.id }, invitation.id);
    expect(rev2.revisionNo).toBe(2);

    // Quota remains 2 (re-publishing does NOT deduct quota again!)
    const profileAfterRev2 = await findResellerProfileById(db(), reseller.profile.id);
    expect(profileAfterRev2?.creditQuota).toBe(2);

    // Total publish_deduct ledger entries is exactly 1
    const txs = await listCreditTransactions(db(), reseller.profile.id);
    const publishTxs = txs.filter((t) => t.type === "publish_deduct");
    expect(publishTxs.length).toBe(1);
  });

  it("blocks publishing and throws InsufficientQuotaError when reseller quota is 0", async () => {
    // 1. Reseller with 0 credits
    const resellerZero = await createResellerWithProfile(db(), {
      email: "reseller.zero@agency.test",
      name: "Reseller Zero",
      agencyName: "Zero Credit Agency",
      slug: "zero-credit-agency",
      whatsappContact: "62877665544",
      initialCredits: 0,
    });

    const client = await createResellerClient(db(), {
      resellerUserId: resellerZero.user.id,
      clientName: "Client Zero",
      clientEmail: "zero@client.test",
      workspaceSlug: "zero-ws",
    });

    const tpl = await createTemplate(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      name: "Template Zero",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: client.clientUser.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: client.clientUser.id }, {
      workspaceId: client.workspace.id,
      templateId: tpl.id,
      title: "Wedding of Zero Quota",
    });

    await saveInvitationData(db(), { userId: client.clientUser.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    // 2. Attempt to publish should fail with InsufficientQuotaError
    await expect(
      publishInvitation(db(), { userId: client.clientUser.id }, invitation.id),
    ).rejects.toThrow(InsufficientQuotaError);

    // Verify quota remains 0 and no publish_deduct transaction was inserted
    const profile = await findResellerProfileById(db(), resellerZero.profile.id);
    expect(profile?.creditQuota).toBe(0);

    const txs = await listCreditTransactions(db(), resellerZero.profile.id);
    expect(txs.length).toBe(0);
  });

  it("enforces multi-tenant isolation between Reseller A and Reseller B", async () => {
    // Reseller A
    const resellerA = await createResellerWithProfile(db(), {
      email: "reseller.a@agency.test",
      name: "Reseller A",
      agencyName: "Agency A",
      slug: "agency-a",
      whatsappContact: "62811111111",
      initialCredits: 10,
    });

    // Reseller B
    const resellerB = await createResellerWithProfile(db(), {
      email: "reseller.b@agency.test",
      name: "Reseller B",
      agencyName: "Agency B",
      slug: "agency-b",
      whatsappContact: "62822222222",
      initialCredits: 10,
    });

    // Client under Reseller A
    const clientA = await createResellerClient(db(), {
      resellerUserId: resellerA.user.id,
      clientName: "Client of A",
      clientEmail: "client.a@test.test",
      workspaceSlug: "ws-client-a",
    });

    // Client under Reseller B
    const clientB = await createResellerClient(db(), {
      resellerUserId: resellerB.user.id,
      clientName: "Client of B",
      clientEmail: "client.b@test.test",
      workspaceSlug: "ws-client-b",
    });

    // 1. Reseller A's client list only contains Client A
    const clientsForA = await listUsersByReseller(db(), resellerA.user.id);
    expect(clientsForA.map((c) => c.id)).toContain(clientA.clientUser.id);
    expect(clientsForA.map((c) => c.id)).not.toContain(clientB.clientUser.id);

    // 2. Reseller B's client list only contains Client B
    const clientsForB = await listUsersByReseller(db(), resellerB.user.id);
    expect(clientsForB.map((c) => c.id)).toContain(clientB.clientUser.id);
    expect(clientsForB.map((c) => c.id)).not.toContain(clientA.clientUser.id);

    // 3. Create invitation in Client A's workspace
    const tplA = await createTemplate(db(), { userId: clientA.clientUser.id }, {
      workspaceId: clientA.workspace.id,
      name: "Template A",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: clientA.clientUser.id }, {
      templateId: tplA.id,
      expectedRevision: tplA.revision,
    });

    const invA = await createInvitation(db(), { userId: clientA.clientUser.id }, {
      workspaceId: clientA.workspace.id,
      templateId: tplA.id,
      title: "Wedding A",
    });

    // Reseller B cannot publish or access Client A's invitation
    await expect(
      publishInvitation(db(), { userId: resellerB.user.id }, invA.id),
    ).rejects.toThrow();
  });

  it("fetches white-label agency branding for client views", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "branding.owner@agency.test",
      name: "Branding Agency Owner",
      agencyName: "Mahar Cantik Production",
      slug: "mahar-cantik",
      whatsappContact: "6281299887766",
      initialCredits: 5,
    });

    const client = await createResellerClient(db(), {
      resellerUserId: reseller.user.id,
      clientName: "Rian & Rina",
      clientEmail: "rian.rina@test.test",
      workspaceSlug: "rian-rina-ws",
    });

    // Look up branding using client's resellerId and db()
    const branding = await getClientAgencyBranding(client.clientUser.resellerId!, db());
    expect(branding).toBeDefined();
    expect(branding?.agencyName).toBe("Mahar Cantik Production");
    expect(branding?.whatsappContact).toBe("6281299887766");
  });

  it("deducts quota when a reseller publishes an invitation directly within their agency workspace", async () => {
    const reseller = await createResellerWithProfile(db(), {
      email: "direct.agency@test.test",
      name: "Direct Agency",
      agencyName: "Direct Studio",
      slug: "direct-studio",
      whatsappContact: "62855566677",
      initialCredits: 2,
    });

    const tpl = await createTemplate(db(), { userId: reseller.user.id }, {
      workspaceId: reseller.workspace.id,
      name: "Studio Template",
      document: fullDocument(),
    });
    await publishTemplate(db(), { userId: reseller.user.id }, {
      templateId: tpl.id,
      expectedRevision: tpl.revision,
    });

    const invitation = await createInvitation(db(), { userId: reseller.user.id }, {
      workspaceId: reseller.workspace.id,
      templateId: tpl.id,
      title: "Agency Direct Invitation",
    });

    await saveInvitationData(db(), { userId: reseller.user.id }, {
      invitationId: invitation.id,
      values: REQUIRED_DATA,
    });

    const pub = await publishInvitation(db(), { userId: reseller.user.id }, invitation.id);
    expect(pub.revisionNo).toBe(1);

    const profile = await findResellerProfileById(db(), reseller.profile.id);
    expect(profile?.creditQuota).toBe(1);
  });
});

