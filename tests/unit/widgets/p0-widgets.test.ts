/**
 * PRD refs: FR-WDG-001..004, AC-04..06, P-05, P-09.
 */
import { describe, expect, it } from "vitest";
import {
  computeCountdown,
  countdownTargetInstant,
  defaultWidgetRegistry,
  greetingParts,
  mapUrl,
  mapEmbedUrl,
  P0_WIDGETS,
} from "@/features/widgets";
import { createWidgetElement } from "@/features/editor/core/ops";
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  validateDocumentSemantics,
} from "@/lib/schema";
import { addSection } from "@/features/editor/core/ops";

describe("mapUrl and mapEmbedUrl (FR-WDG-002)", () => {
  it("builds the exact Google Maps coordinate URL", () => {
    expect(mapUrl({ lat: -7.797068, lng: 110.370529 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-7.797068,110.370529",
    );
  });
  it("builds the exact Google Maps embed iframe URL", () => {
    expect(mapEmbedUrl({ lat: -7.797068, lng: 110.370529 })).toBe(
      "https://maps.google.com/maps?q=-7.797068,110.370529&hl=id&z=15&output=embed",
    );
  });
  it("returns null for anything that is not a valid coordinate", () => {
    for (const bad of [null, undefined, "x", { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: 1 }]) {
      expect(mapUrl(bad)).toBeNull();
      expect(mapEmbedUrl(bad)).toBeNull();
    }
  });
});

describe("computeCountdown (FR-WDG-003)", () => {
  const local = "2026-12-12T08:00";
  it("is timezone aware: the same wall clock is a different instant per zone", () => {
    const jkt = countdownTargetInstant({ local, timeZone: "Asia/Jakarta" });
    const utc = countdownTargetInstant({ local, timeZone: "UTC" });
    expect(jkt).not.toBeNull();
    expect(utc! - jkt!).toBe(7 * 3600 * 1000);
    expect(jkt).toBe(Date.UTC(2026, 11, 12, 1, 0, 0));
  });
  it("counts down to the second", () => {
    const target = { local, timeZone: "Asia/Jakarta" };
    const now = Date.UTC(2026, 11, 12, 1, 0, 0) - (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000;
    expect(computeCountdown(target, now)).toEqual({
      state: "counting",
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
    });
  });
  it("reports elapsed at and after the target, and invalid for bad input", () => {
    const target = { local, timeZone: "Asia/Jakarta" };
    const at = Date.UTC(2026, 11, 12, 1, 0, 0);
    expect(computeCountdown(target, at).state).toBe("elapsed");
    expect(computeCountdown(target, at + 1).state).toBe("elapsed");
    expect(computeCountdown(null, at).state).toBe("invalid");
    expect(computeCountdown({ local: "nope", timeZone: "Asia/Jakarta" }, at).state).toBe("invalid");
    expect(computeCountdown({ local, timeZone: "Mars/Base" }, at).state).toBe("invalid");
  });
});

describe("greetingParts (FR-WDG-004 / AC-06)", () => {
  it("uses the guest name when present", () => {
    expect(greetingParts({ guestName: "  Budi ", prefix: "Dear" })).toEqual({
      prefix: "Dear",
      name: "Budi",
      usedFallback: false,
    });
  });
  it("falls back to a generic greeting, never blank or 'null'", () => {
    for (const guestName of [undefined, null, "", "   ", 42]) {
      const g = greetingParts({ guestName });
      expect(g).toEqual({ prefix: "Kepada Yth.", name: "Tamu Undangan", usedFallback: true });
    }
    expect(greetingParts({ guestName: null, fallback: "Sahabat" }).name).toBe("Sahabat");
  });
});

describe("defaultWidgetRegistry (FR-WDG-001, P-05, P-09)", () => {
  it("registers the P0 and P1 widgets once each", () => {
    expect(
      defaultWidgetRegistry
        .list()
        .map((w) => w.type)
        .sort(),
    ).toEqual(["countdown", "gallery", "gift", "guestGreeting", "map", "music", "rsvp"]);
    expect(P0_WIDGETS).toHaveLength(3);
  });

  it("resolves an unknown type to a safe fallback without throwing", () => {
    const r = defaultWidgetRegistry.resolve("does-not-exist");
    expect(r.kind).toBe("unknown");
  });

  it("every definition's default props are valid and its default frame fits the artboard", () => {
    for (const def of defaultWidgetRegistry.list()) {
      expect(def.defaultFrame.w).toBeGreaterThan(0);
      expect(def.defaultFrame.w).toBeLessThanOrEqual(390);
      expect(def.defaultFrame.h).toBeGreaterThan(0);
    }
  });

  it("the same definition can be placed in two documents (no duplicated logic)", () => {
    const make = () => {
      let doc = addSection(createEmptyDocument(), {}).document;
      const sectionId = doc.sections[0]!.id;
      for (const def of defaultWidgetRegistry.list()) {
        doc = createWidgetElement(doc, sectionId, def).document;
      }
      return doc;
    };
    for (const doc of [make(), make()]) {
      expect(canonicalDocumentSchema.safeParse(doc).success).toBe(true);
      const widgets = doc.sections.flatMap((s) => s.elements).filter((e) => e.type === "widget");
      expect(widgets).toHaveLength(7);
    }
  });

  it("semantic validation rejects invalid static props and unknown widgets", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;
    const map = defaultWidgetRegistry.list().find((w) => w.type === "map")!;
    doc = createWidgetElement(doc, sectionId, {
      ...map,
      defaultProps: { coordinate: { lat: 500, lng: 0 } },
    }).document;
    doc = createWidgetElement(doc, sectionId, {
      type: "mystery",
      version: 1,
      label: "Mystery",
      defaultFrame: { w: 100, h: 40 },
      defaultProps: {},
    }).document;
    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.some((i) => i.code === "unknown_widget_type")).toBe(true);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });
});
