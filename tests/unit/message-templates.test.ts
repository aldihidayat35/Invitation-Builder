// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  interpolateMessageTemplate,
  MESSAGE_TEMPLATE_CATEGORIES,
  DEFAULT_MESSAGE_TEMPLATES,
} from "@/lib/db/repositories/message-templates";

describe("Message Templates System", () => {
  it("defines standard event categories with labels and icons", () => {
    const keys = MESSAGE_TEMPLATE_CATEGORIES.map((c) => c.key);
    expect(keys).toContain("wedding");
    expect(keys).toContain("khitanan");
    expect(keys).toContain("aqiqah");
    expect(keys).toContain("birthday");
    expect(keys).toContain("graduation");
    expect(keys).toContain("corporate");
    expect(keys).toContain("general");
  });

  it("contains default presets for each event category", () => {
    expect(DEFAULT_MESSAGE_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    const categoriesWithDefaults = DEFAULT_MESSAGE_TEMPLATES.filter((t) => t.isDefault).map((t) => t.category);
    expect(categoriesWithDefaults).toContain("wedding");
    expect(categoriesWithDefaults).toContain("khitanan");
    expect(categoriesWithDefaults).toContain("aqiqah");
    expect(categoriesWithDefaults).toContain("birthday");
    expect(categoriesWithDefaults).toContain("graduation");
    expect(categoriesWithDefaults).toContain("corporate");
    expect(categoriesWithDefaults).toContain("general");
  });

  it("interpolates variables properly in templates", () => {
    const rawTemplate = "Halo {guestname}, kami mengundang ke acara {event_title} pada {event_date} di {event_location}. Buka {link}";
    const result = interpolateMessageTemplate(rawTemplate, {
      guestName: "Budi Santoso",
      eventTitle: "Sarah & Fajar",
      eventDate: "28 November 2026",
      eventLocation: "Hotel Indonesia",
      link: "https://undangan.id/i/sarah-fajar?to=Budi+Santoso",
    });

    expect(result).toBe(
      "Halo Budi Santoso, kami mengundang ke acara Sarah & Fajar pada 28 November 2026 di Hotel Indonesia. Buka https://undangan.id/i/sarah-fajar?to=Budi+Santoso"
    );
  });

  it("handles case-insensitive variable tags", () => {
    const rawTemplate = "{GUESTNAME} silakan klik {LINK}";
    const result = interpolateMessageTemplate(rawTemplate, {
      guestName: "Ani",
      link: "https://undangan.id/i/ani",
    });
    expect(result).toBe("Ani silakan klik https://undangan.id/i/ani");
  });

  it("falls back gracefully when parameters are missing", () => {
    const rawTemplate = "Halo {guestname}, cek {link}";
    const result = interpolateMessageTemplate(rawTemplate, {});
    expect(result).toBe("Halo Tamu Undangan, cek ");
  });
});
