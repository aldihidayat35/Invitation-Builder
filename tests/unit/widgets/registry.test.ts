/**
 * PRD refs: FR-WDG-001, P-05, P-09, NFR-REL-002.
 */
import { z } from "zod";
import {
  createWidgetRegistry,
  defaultWidgetRegistry,
  defineProp,
  getDefaultWidgetStyle,
  getWidgetStyleVariants,
  resolveWidgetStyleVariant,
  WidgetRegistry,
} from "@/features/widgets";
import { createTestRegistry } from "../../helpers/widgets";

describe("widget registry", () => {
  it("resolves registered widgets with their definition", () => {
    const registry = createTestRegistry();
    const resolved = registry.resolve("map");
    expect(resolved.kind).toBe("known");
    if (resolved.kind === "known") {
      expect(resolved.definition.label).toBe("Map");
      expect(resolved.definition.defaultFrame).toEqual({ w: 326, h: 120 });
    }
  });

  it("resolves an unknown widget to a safe fallback instead of throwing", () => {
    const registry = createTestRegistry();
    const resolved = registry.resolve("hologram");
    expect(resolved.kind).toBe("unknown");
    if (resolved.kind === "unknown") {
      expect(resolved.fallback.type).toBe("hologram");
      expect(resolved.fallback.label).toBeTruthy();
    }
    expect(registry.get("hologram")).toBeUndefined();
    expect(registry.has("hologram")).toBe(false);
  });

  it("does not resolve prototype property names as widgets", () => {
    const registry = createTestRegistry();
    expect(registry.resolve("constructor").kind).toBe("unknown");
    expect(registry.resolve("__proto__").kind).toBe("unknown");
    expect(registry.get("toString")).toBeUndefined();
  });

  it("adds a new widget without touching existing registrations (P-09)", () => {
    const registry = createTestRegistry();
    const before = registry.list().map((w) => w.type);
    registry.register({
      type: "eventSchedule",
      version: 1,
      label: "Event schedule",
      defaultFrame: { w: 326, h: 200 },
      defaultProps: {},
      props: { events: defineProp("collection", "Acara", z.array(z.unknown())) },
    });
    expect(registry.list().map((w) => w.type)).toEqual([...before, "eventSchedule"]);
  });

  it("rejects duplicate, malformed and unversioned registrations", () => {
    const base = {
      version: 1,
      label: "x",
      defaultFrame: { w: 1, h: 1 },
      defaultProps: {},
      props: {},
    } as const;
    const registry = new WidgetRegistry().register({ ...base, type: "map" });
    expect(() => registry.register({ ...base, type: "map" })).toThrow(/already registered/);
    expect(() => registry.register({ ...base, type: "Map" })).toThrow(/Invalid widget type/);
    expect(() => registry.register({ ...base, type: "x y" })).toThrow(/Invalid widget type/);
    expect(() => registry.register({ ...base, type: "ok", version: 0 })).toThrow(/version/);
  });

  it("exposes a read-only catalog view used by semantic validation", () => {
    const entry = createTestRegistry().get("map");
    expect(entry?.version).toBe(1);
    expect(Object.keys(entry?.props ?? {})).toEqual([
      "coordinate",
      "label",
      "buttonText",
      "fallbackUrl",
    ]);
    expect(entry?.props.coordinate?.required).toBe(true);
  });

  it("starts empty by default", () => {
    expect(createWidgetRegistry().list()).toEqual([]);
  });

  it("provides unique current variants and a valid explicit default per widget", () => {
    for (const definition of defaultWidgetRegistry.list()) {
      const variants = getWidgetStyleVariants(definition.type);
      const ids = variants.map((variant) => variant.id);
      const expectedCount =
        definition.type === "gift" || definition.type === "gallery" || definition.type === "coupleProfile"
          ? 10
          : definition.type === "ornamentFrame"
            ? 11
            : 5;
      expect(variants).toHaveLength(expectedCount);
      expect(new Set(ids).size).toBe(expectedCount);
      expect(ids).toContain(getDefaultWidgetStyle(definition.type).variant);
      expect(definition.defaultStyle).toEqual(getDefaultWidgetStyle(definition.type));
    }
  });

  it("distinguishes current, legacy, missing, and invalid variant ids", () => {
    expect(resolveWidgetStyleVariant("map", "full-bleed").kind).toBe("current");
    expect(resolveWidgetStyleVariant("map", "luxury").kind).toBe("legacy");
    expect(resolveWidgetStyleVariant("map", undefined)).toMatchObject({
      kind: "legacy",
      variant: { id: "default" },
    });
    expect(resolveWidgetStyleVariant("map", "future-style")).toMatchObject({
      kind: "fallback",
      requestedVariant: "future-style",
      variant: { id: "default" },
    });
  });
});
