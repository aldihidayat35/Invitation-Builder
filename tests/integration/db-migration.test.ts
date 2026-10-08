// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createMigratedDb } from "../helpers/db";
import { fullDocument } from "../helpers/documents";
import { migrateDocument } from "@/lib/schema";
import { seedDev } from "@/lib/db/seed";
import {
  publishedSnapshots,
  templateVersions,
  auditLogs,
  invitations,
  securityEvents,
  users,
} from "@/lib/db/schema";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
let conn: Conn;

const EXPECTED_TABLES = [
  "assets",
  "audit_logs",
  "guests",
  "invitations",
  "published_snapshots",
  "rsvps",
  "template_versions",
  "templates",
  "users",
  "workspace_members",
  "workspaces",
  "reseller_profiles",
  "customer_orders",
  "order_workflow_events",
  "security_events",
  "privacy_requests",
  "recovery_drills",
];

beforeAll(async () => {
  conn = await createMigratedDb();
});
afterAll(async () => {
  await conn.close();
});

describe("migration from an empty database (acceptance gate)", () => {
  it("creates every application table", async () => {
    const res = await conn.client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema='public' order by 1`,
    );
    expect(res.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(EXPECTED_TABLES));
  });

  it("creates enums and immutability triggers", async () => {
    const enums = await conn.client.query<{ typname: string }>(
      `select typname from pg_type where typtype='e'`,
    );
    expect(enums.rows.map((r) => r.typname)).toEqual(
      expect.arrayContaining(["workspace_role", "template_status", "rsvp_response"]),
    );
    const triggers = await conn.client.query<{ tgname: string }>(
      `select tgname from pg_trigger where not tgisinternal`,
    );
    expect(triggers.rows.map((r) => r.tgname).sort()).toEqual([
      "audit_logs_immutable",
      "order_workflow_events_immutable",
      "published_snapshots_immutable",
      "security_events_immutable",
      "template_versions_immutable",
    ]);
  });
});

describe("immutability + round trip (NFR-REL-001)", () => {
  it("snapshots/versions/audit logs reject UPDATE and DELETE; jsonb round trips", async () => {
    const { db } = conn;
    const seed = await seedDev(db);
    const doc = fullDocument();

    const [version] = await db
      .insert(templateVersions)
      .values({ templateId: seed.templateId, versionNo: 1, schemaVersion: 1, document: doc })
      .returning();
    if (!version) throw new Error("no version");

    const [inv] = await db
      .insert(invitations)
      .values({
        workspaceId: seed.workspaceId,
        templateVersionId: version.id,
        slug: "ana-budi",
        title: "Ana & Budi",
      })
      .returning();
    if (!inv) throw new Error("no invitation");

    const [snap] = await db
      .insert(publishedSnapshots)
      .values({ invitationId: inv.id, revisionNo: 1, schemaVersion: 1, document: doc, data: {} })
      .returning();
    if (!snap) throw new Error("no snapshot");
    const [log] = await db
      .insert(auditLogs)
      .values({ workspaceId: seed.workspaceId, action: "x", entityType: "template" })
      .returning();
    if (!log) throw new Error("no log");
    const [securityEvent] = await db
      .insert(securityEvents)
      .values({ eventType: "auth.login_failed", subjectHash: "hash" })
      .returning();
    if (!securityEvent) throw new Error("no security event");

    expect(migrateDocument(snap.document)).toEqual(migrateDocument(doc));
    expect(migrateDocument(version.document)).toEqual(migrateDocument(doc));

    await expect(
      db.execute(sql`update published_snapshots set revision_no = 9 where id = ${snap.id}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`delete from published_snapshots where id = ${snap.id}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`update template_versions set note = 'x' where id = ${version.id}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`delete from template_versions where id = ${version.id}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`update audit_logs set action = 'y' where id = ${log.id}`),
    ).rejects.toThrow();
    await expect(db.execute(sql`delete from audit_logs where id = ${log.id}`)).rejects.toThrow();
    await expect(
      db.execute(
        sql`update security_events set severity = 'critical' where id = ${securityEvent.id}`,
      ),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`delete from security_events where id = ${securityEvent.id}`),
    ).rejects.toThrow();
  });

  it("enforces check constraints (slug format, unique lower(email))", async () => {
    const { db } = conn;
    await expect(
      db.execute(sql`insert into workspaces (name, slug) values ('x', 'Bad Slug')`),
    ).rejects.toThrow();
    const [seededUser] = await db.select({ email: users.email }).from(users).limit(1);
    await expect(
      db.execute(
        sql`insert into users (email, name) values (${seededUser!.email.toUpperCase()}, 'dup')`,
      ),
    ).rejects.toThrow();
  });
});
