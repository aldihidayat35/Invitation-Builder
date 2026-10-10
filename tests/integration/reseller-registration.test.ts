// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import { TEST_PASSWORD } from "../helpers/world";
import { hashPassword } from "@/lib/auth/password";
import { login } from "@/lib/auth/sessions";
import { LoginThrottle } from "@/lib/auth/throttle";
import {
  createResellerWithProfile,
  updateResellerStatus,
} from "@/lib/db/repositories/resellers";
import { buildResellerActivationWhatsAppUrl } from "@/features/reseller/whatsapp";

type Conn = Awaited<ReturnType<typeof createMigratedDb>>;
let conn: Conn;

beforeAll(async () => {
  conn = await createMigratedDb();
});
afterAll(async () => {
  await conn.close();
});

const freshThrottle = () => new LoginThrottle({ maxFailures: 3, windowMs: 60_000 });

describe("Reseller Registration and ACC Workflow", () => {
  it("builds correct WhatsApp activation URL with formatted Indonesian phone number and text", () => {
    const waUrl = buildResellerActivationWhatsAppUrl({
      phone: "081234567890",
      resellerName: "Budi Santoso",
      agencyName: "Berkah Invitation",
      loginUrl: "http://localhost:3000/login",
    });

    expect(waUrl).toContain("https://wa.me/6281234567890?text=");
    const decoded = decodeURIComponent(waUrl);
    expect(decoded).toContain("Halo *Budi Santoso* (*Berkah Invitation*)");
    expect(decoded).toContain("disetujui & aktif");
    expect(decoded).toContain("http://localhost:3000/login");
  });

  it("handles phone numbers already formatted with international 62 or dashes", () => {
    const waUrl = buildResellerActivationWhatsAppUrl({
      phone: "+62 812-9876-5432",
      resellerName: "Siti Rahma",
      agencyName: "Royal Invite",
      loginUrl: "https://undangan.me/login",
    });

    expect(waUrl).toContain("https://wa.me/6281298765432?text=");
  });

  it("registers reseller with inactive status (pending ACC) and gives informative error on login", async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const created = await createResellerWithProfile(conn.db, {
      email: "calon.reseller@agency.test",
      name: "Calon Reseller",
      passwordHash,
      agencyName: "Kreatif Invitation",
      slug: "kreatif-invitation",
      whatsappContact: "6281234567890",
      isActive: false,
    });

    expect(created.user.status).toBe("disabled");
    expect(created.profile.isActive).toBe(false);

    // Attempting login while status is disabled
    await expect(
      login(
        conn.db,
        { email: "calon.reseller@agency.test", password: TEST_PASSWORD },
        freshThrottle(),
      ),
    ).rejects.toThrow(
      "Pendaftaran akun Reseller Anda sedang menunggu persetujuan (ACC) dari Admin. Silakan tunggu konfirmasi melalui WhatsApp.",
    );
  });

  it("allows reseller to log in once admin ACCs the account", async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const created = await createResellerWithProfile(conn.db, {
      email: "reseller.acc@agency.test",
      name: "Reseller Siap ACC",
      passwordHash,
      agencyName: "Sukses Media",
      slug: "sukses-media",
      whatsappContact: "628999888777",
      isActive: false,
    });

    // Admin ACCs the account
    await updateResellerStatus(conn.db, created.profile.id, true);

    // Reseller can now log in
    const session = await login(
      conn.db,
      { email: "reseller.acc@agency.test", password: TEST_PASSWORD },
      freshThrottle(),
    );

    expect(session.user.id).toBe(created.user.id);
    expect(session.user.systemRole).toBe("reseller");
  });
});
