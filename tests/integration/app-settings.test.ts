// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "../helpers/db";
import {
  getAppSettings,
  updateAppSettings,
  DEFAULT_APP_SETTINGS,
} from "@/lib/db/repositories/settings";
import { insertAuditLog } from "@/lib/db/repositories/audit";
import { seedDev } from "@/lib/db/seed";

let conn: Awaited<ReturnType<typeof createMigratedDb>>;
const db = () => conn.db;

beforeAll(async () => {
  conn = await createMigratedDb();
});

afterAll(async () => {
  await conn.close();
});

describe("App Settings Management Repository & Workflows", () => {
  it("initializes default application settings when database is clean", async () => {
    const settings = await getAppSettings(db());
    expect(settings).toBeDefined();
    expect(settings.appName).toBe(DEFAULT_APP_SETTINGS.appName);
    expect(settings.companyName).toBe(DEFAULT_APP_SETTINGS.companyName);
    expect(settings.contactWhatsapp).toBe(DEFAULT_APP_SETTINGS.contactWhatsapp);
  });

  it("updates app name, logo, contacts, and address dynamically", async () => {
    const updated = await updateAppSettings(db(), {
      appName: "Kencana Studio Digital",
      appTagline: "Seni Undangan Mewah Berkelas",
      appLogo: "https://example.com/logo-kencana.png",
      companyName: "PT Kencana Digital Niaga",
      contactPhone: "+62 821-9988-7766",
      contactWhatsapp: "6282199887766",
      contactEmail: "halo@kencanastudio.id",
      address: "Jl. Senopati Raya No. 88, Kebayoran Baru, Jakarta Selatan",
      footerDescription: "Penyedia solusi undangan pernikahan adat dan modern terdepan.",
    });

    expect(updated.appName).toBe("Kencana Studio Digital");
    expect(updated.appTagline).toBe("Seni Undangan Mewah Berkelas");
    expect(updated.appLogo).toBe("https://example.com/logo-kencana.png");
    expect(updated.companyName).toBe("PT Kencana Digital Niaga");
    expect(updated.contactWhatsapp).toBe("6282199887766");
    expect(updated.contactEmail).toBe("halo@kencanastudio.id");

    // Re-fetching retrieves updated values
    const fresh = await getAppSettings(db());
    expect(fresh.appName).toBe("Kencana Studio Digital");
    expect(fresh.address).toBe("Jl. Senopati Raya No. 88, Kebayoran Baru, Jakarta Selatan");
  });

  it("records audit logs for settings update", async () => {
    const seed = await seedDev(db());

    await expect(
      insertAuditLog(db(), {
        workspaceId: seed.workspaceId,
        actorId: seed.userId,
        action: "settings.update",
        entityType: "app_settings",
        entityId: "global",
        metadata: {
          appName: "Kencana Studio Digital",
        },
      }),
    ).resolves.not.toThrow();
  });
});
