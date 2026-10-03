// @vitest-environment node
/**
 * PRD refs: FR-WDG-005, FR-GST-001 (CSV), NFR-SEC (no leaks, rate limit).
 * Real (PGlite) DB: RSVP policy, public endpoint behavior, CSV import, dashboard authz.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { makeWorld } from "../helpers/world";
import { listAuditLogs } from "@/lib/db/repositories/audit";
import { createRateLimiter } from "@/lib/rate-limit";
import { handleRsvpRequest } from "@/features/rsvp/handler";
import { totalsOf } from "@/features/rsvp/schemas";
import { listInvitationRsvps, submitRsvp } from "@/features/rsvp/service";
import { importGuests } from "@/features/invitations/guest-import";
import {
  InvitationNotFoundError,
  addGuest,
  createInvitation,
  listInvitationGuests,
  publishInvitation,
  saveInvitationData,
} from "@/features/invitations/service";
import { createTemplate, publishTemplate } from "@/features/templates/service";

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

async function invitation(title: string, published = true) {
  const inv = await createInvitation(db(), world.operatorA, {
    workspaceId: world.wsA.id,
    templateId,
    title,
  });
  await saveInvitationData(db(), world.operatorA, { invitationId: inv.id, values: REQUIRED });
  if (published) await publishInvitation(db(), world.operatorA, inv.id);
  return inv;
}

describe("submitRsvp policy", () => {
  it("saves a generic RSVP and dedupes by case-insensitive name (idempotent)", async () => {
    const inv = await invitation("RSVP generik");
    const first = await submitRsvp(db(), {
      slug: inv.slug,
      name: "Budi",
      response: "attending",
      partySize: 2,
      message: "Selamat!",
    });
    const again = await submitRsvp(db(), {
      slug: inv.slug,
      name: "BUDI",
      response: "not_attending",
    });
    expect(first.status).toBe("created");
    expect(again.status).toBe("updated");
    const rows = await listInvitationRsvps(db(), world.operatorA, inv.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ response: "not_attending", partySize: 0, message: null });
  });

  it("guest token: one RSVP per guest, trusted name, party capped, guest marked responded", async () => {
    const inv = await invitation("RSVP tamu");
    const guest = await addGuest(db(), world.operatorA, {
      invitationId: inv.id,
      name: "Wulan",
      maxParty: 2,
    });
    await expect(
      submitRsvp(db(), {
        slug: inv.slug,
        guestToken: guest.tokenId,
        name: "Spoof",
        response: "attending",
        partySize: 3,
      }),
    ).rejects.toThrow(/antara 1 dan 2/);

    await submitRsvp(db(), {
      slug: inv.slug,
      guestToken: guest.tokenId,
      name: "Spoof",
      response: "attending",
      partySize: 2,
    });
    const second = await submitRsvp(db(), {
      slug: inv.slug,
      guestToken: guest.tokenId,
      name: "Spoof",
      response: "attending",
      partySize: 1,
    });
    expect(second.status).toBe("updated");
    const rows = await listInvitationRsvps(db(), world.operatorA, inv.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Wulan", guestName: "Wulan", partySize: 1 });
    const guests = await listInvitationGuests(db(), world.operatorA, inv.id);
    expect(guests[0]?.status).toBe("responded");
    expect(totalsOf(rows)).toEqual({ attending: 1, notAttending: 0, attendingParty: 1 });
  });

  it("ignores a token of another invitation (treated as generic)", async () => {
    const a = await invitation("Token A");
    const b = await invitation("Token B");
    const guestB = await addGuest(db(), world.operatorA, { invitationId: b.id, name: "Budi B" });
    await submitRsvp(db(), {
      slug: a.slug,
      guestToken: guestB.tokenId,
      name: "Orang Lain",
      response: "attending",
    });
    const rows = await listInvitationRsvps(db(), world.operatorA, a.id);
    expect(rows[0]).toMatchObject({ name: "Orang Lain", guestName: null });
    expect(await listInvitationRsvps(db(), world.operatorA, b.id)).toHaveLength(0);
  });

  it("rejects unpublished, unknown and invalid submissions", async () => {
    const draft = await invitation("Draft RSVP", false);
    await expect(
      submitRsvp(db(), { slug: draft.slug, name: "X", response: "attending" }),
    ).rejects.toThrow("Undangan tidak tersedia.");
    await expect(
      submitRsvp(db(), { slug: "nope", name: "X", response: "attending" }),
    ).rejects.toThrow("Undangan tidak tersedia.");
    await expect(
      submitRsvp(db(), { slug: "x", name: "", response: "attending" }),
    ).rejects.toThrow();
    await expect(submitRsvp(db(), { slug: "x", name: "X", response: "maybe" })).rejects.toThrow();
    await expect(
      submitRsvp(db(), { slug: "x", name: "X", response: "attending", extra: 1 }),
    ).rejects.toThrow();
  });

  it("dashboard list is workspace-scoped", async () => {
    const inv = await invitation("RSVP authz");
    await expect(listInvitationRsvps(db(), world.ownerB, inv.id)).rejects.toBeInstanceOf(
      InvitationNotFoundError,
    );
  });
});

describe("public endpoint handler", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request("http://test/api/public/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("returns 200 on success and generic errors otherwise (no internals)", async () => {
    const inv = await invitation("Handler");
    const limiter = createRateLimiter({ limit: 100, windowMs: 1000 });
    const ok = await handleRsvpRequest(
      post({ slug: inv.slug, name: "Budi", response: "attending" }),
      { db: db(), limiter },
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true, status: "created" });

    const missing = await handleRsvpRequest(
      post({ slug: "nope", name: "Budi", response: "attending" }),
      { db: db(), limiter },
    );
    expect(missing.status).toBe(404);
    expect(missing.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    const missingBody = (await missing.clone().json()) as { requestId: string };
    expect(missingBody.requestId).toBe(missing.headers.get("X-Request-Id"));
    expect(JSON.stringify(await missing.json())).not.toMatch(/select|drizzle|stack|uuid/i);

    const invalid = await handleRsvpRequest(post("{not json"), { db: db(), limiter });
    expect(invalid.status).toBe(400);

    const wrongType = await handleRsvpRequest(
      new Request("http://test/x", { method: "POST", body: "x" }),
      { db: db(), limiter },
    );
    expect(wrongType.status).toBe(415);
  });

  it("rejects oversized bodies and rate-limits repeated submissions", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const big = await handleRsvpRequest(
      post({ slug: "x", name: "a".repeat(9000), response: "attending" }),
      { db: db(), limiter },
    );
    expect(big.status).toBe(413);

    const body = { slug: "nope", name: "Budi", response: "attending" };
    const headers = { "x-forwarded-for": "9.9.9.9" };
    const statuses: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await handleRsvpRequest(post(body, headers), { db: db(), limiter })).status);
    }
    expect(statuses).toEqual([404, 404, 429, 429]);
    const blocked = await handleRsvpRequest(post(body, headers), { db: db(), limiter });
    expect(blocked.headers.get("Retry-After")).not.toBeNull();
  });
});

describe("guest CSV import (FR-GST-001)", () => {
  it("previews without writing, then commits valid rows and skips duplicates", async () => {
    const inv = await invitation("CSV", false);
    await addGuest(db(), world.operatorA, { invitationId: inv.id, name: "Budi" });
    const csv = "nama,jumlah\nBudi,2\nWulan,3\nSari,x\nWulan,1";

    const preview = await importGuests(db(), world.operatorA, {
      invitationId: inv.id,
      csv,
      dryRun: true,
    });
    expect(preview.created).toBe(0);
    expect(preview.plan.summary).toEqual({ total: 4, ok: 1, duplicate: 2, invalid: 1 });
    expect(await listInvitationGuests(db(), world.operatorA, inv.id)).toHaveLength(1);

    const done = await importGuests(db(), world.operatorA, {
      invitationId: inv.id,
      csv,
      dryRun: false,
    });
    expect(done.created).toBe(1);
    const guests = await listInvitationGuests(db(), world.operatorA, inv.id);
    expect(guests.map((g) => g.name).sort()).toEqual(["Budi", "Wulan"]);
    expect(guests.find((g) => g.name === "Wulan")?.maxParty).toBe(3);
    expect(new Set(guests.map((g) => g.tokenId)).size).toBe(2);

    const logs = await listAuditLogs(db(), world.wsA.id);
    expect(logs.some((l) => l.action === "guest.import")).toBe(true);
  });

  it("is denied across workspaces", async () => {
    const inv = await invitation("CSV authz", false);
    await expect(
      importGuests(db(), world.ownerB, { invitationId: inv.id, csv: "nama\nX", dryRun: false }),
    ).rejects.toBeInstanceOf(InvitationNotFoundError);
  });
});
