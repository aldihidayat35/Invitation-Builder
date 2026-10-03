/**
 * PRD refs: §9.2 (frame), P-07, FR-WDG-002 (coordinate), Fase 1 design
 * constraints: finite numbers, w/h > 0.
 */
import { coordinateSchema, frameSchema } from "@/lib/schema";

describe("frame schema", () => {
  const valid = { x: 32, y: 220, w: 326, h: 88, rotation: 0 };

  it("accepts a valid frame and defaults rotation to 0", () => {
    expect(frameSchema.parse(valid)).toEqual(valid);
    const withoutRotation = { x: valid.x, y: valid.y, w: valid.w, h: valid.h };
    expect(frameSchema.parse(withoutRotation).rotation).toBe(0);
  });

  it("accepts negative x/y (decorations may bleed off the artboard)", () => {
    expect(frameSchema.safeParse({ ...valid, x: -40, y: -10 }).success).toBe(true);
  });

  it.each([
    ["zero width", { w: 0 }],
    ["negative width", { w: -1 }],
    ["zero height", { h: 0 }],
    ["negative height", { h: -20 }],
    ["NaN x", { x: Number.NaN }],
    ["Infinity y", { y: Number.POSITIVE_INFINITY }],
    ["-Infinity w", { w: Number.NEGATIVE_INFINITY }],
    ["NaN rotation", { rotation: Number.NaN }],
    ["rotation out of range", { rotation: 361 }],
    ["string number", { x: "10" }],
    ["null", { h: null }],
    ["absurd size", { w: 1e9 }],
  ])("rejects %s", (_name, patch) => {
    expect(frameSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it.each(["x", "y", "w", "h"] as const)("rejects a missing %s", (key) => {
    const copy: Record<string, unknown> = { ...valid };
    delete copy[key];
    expect(frameSchema.safeParse(copy).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(frameSchema.safeParse({ ...valid, onClick: "alert(1)" }).success).toBe(false);
  });
});

describe("coordinate schema", () => {
  it("accepts valid coordinates incl. boundaries", () => {
    expect(coordinateSchema.safeParse({ lat: -7.797, lng: 110.37 }).success).toBe(true);
    expect(coordinateSchema.safeParse({ lat: 90, lng: 180 }).success).toBe(true);
    expect(coordinateSchema.safeParse({ lat: -90, lng: -180 }).success).toBe(true);
  });

  it.each([
    { lat: 90.0001, lng: 0 },
    { lat: 0, lng: 180.5 },
    { lat: Number.NaN, lng: 0 },
    { lat: 0, lng: Number.POSITIVE_INFINITY },
    { lat: "1", lng: 2 },
    { lat: 1 },
    { lat: 1, lng: 2, alt: 3 },
  ])("rejects %j", (value) => {
    expect(coordinateSchema.safeParse(value).success).toBe(false);
  });
});
