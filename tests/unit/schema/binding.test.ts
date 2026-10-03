/**
 * PRD refs: FR-VAR-002/003, §10.1, Fase 1 step 5 (binding type compatibility).
 */
import {
  BINDING_SLOT_TYPES,
  bindingSchema,
  FORMATTER_ACCEPTS,
  FORMATTER_NAMES,
  formatterSchema,
  isBindingCompatible,
  isFormatterCompatible,
  propValueSchema,
  SLOT_ACCEPTS,
  VARIABLE_TYPES,
} from "@/lib/schema";

describe("binding schema", () => {
  it("accepts a plain binding, with fallback, hide behavior and formatter", () => {
    expect(bindingSchema.safeParse({ bind: "venue.name" }).success).toBe(true);
    expect(
      bindingSchema.safeParse({
        bind: "couple.bride.nickname",
        fallback: "Mempelai",
        hideWhenMissing: false,
        formatter: { name: "uppercase" },
      }).success,
    ).toBe(true);
  });

  it("rejects free-form interpolation and unknown keys", () => {
    expect(bindingSchema.safeParse({ bind: "${venue.name}" }).success).toBe(false);
    expect(bindingSchema.safeParse({ bind: "venue.name", expr: "1+1" }).success).toBe(false);
    expect(bindingSchema.safeParse({ bind: "venue.name", fallback: { a: 1 } }).success).toBe(false);
  });
});

describe("formatter whitelist (no eval)", () => {
  it("accepts exactly the PRD whitelist", () => {
    expect([...FORMATTER_NAMES].sort()).toEqual(
      [
        "currency",
        "date",
        "datetime",
        "lowercase",
        "phone-display",
        "title-case",
        "uppercase",
      ].sort(),
    );
  });

  it("applies defaults for option-bearing formatters", () => {
    expect(formatterSchema.parse({ name: "date" })).toEqual({ name: "date", style: "long" });
    expect(formatterSchema.parse({ name: "phone-display" })).toEqual({
      name: "phone-display",
      region: "ID",
    });
  });

  it.each([
    { name: "eval", code: "alert(1)" },
    { name: "uppercase", code: "x" },
    { name: "currency" },
    { name: "currency", currency: "idr" },
    { name: "date", timeZone: "Not/AZone" },
    { name: "date", locale: "###" },
    { name: "phone-display", region: "indonesia" },
  ])("rejects %j", (value) => {
    expect(formatterSchema.safeParse(value).success).toBe(false);
  });
});

describe("propValueSchema", () => {
  it("accepts static JSON and valid bindings", () => {
    expect(propValueSchema.safeParse("Buka Maps").success).toBe(true);
    expect(propValueSchema.safeParse({ days: "Hari" }).success).toBe(true);
    expect(propValueSchema.safeParse({ bind: "venue.name" }).success).toBe(true);
  });

  it("treats any object with a bind key as a binding and validates it", () => {
    expect(propValueSchema.safeParse({ bind: "venue.name", anything: 1 }).success).toBe(false);
    expect(propValueSchema.safeParse({ bind: "not valid" }).success).toBe(false);
  });

  it("rejects non-JSON and deeply nested values", () => {
    expect(propValueSchema.safeParse(() => 1).success).toBe(false);
    expect(propValueSchema.safeParse(new Date()).success).toBe(false);
    expect(propValueSchema.safeParse(Number.NaN).success).toBe(false);
    let nested: unknown = "x";
    for (let i = 0; i < 12; i += 1) nested = { a: nested };
    expect(propValueSchema.safeParse(nested).success).toBe(false);
  });
});

describe("binding type compatibility", () => {
  it("is defined for every slot and only references known variable types", () => {
    expect(Object.keys(SLOT_ACCEPTS).sort()).toEqual([...BINDING_SLOT_TYPES].sort());
    for (const accepted of Object.values(SLOT_ACCEPTS)) {
      for (const type of accepted) expect(VARIABLE_TYPES).toContain(type);
    }
  });

  it.each([
    ["text", "text", true],
    ["text", "guest-context", true],
    ["text", "number", true],
    ["text", "datetime", true],
    ["text", "image", false],
    ["text", "coordinate", false],
    ["text", "collection", false],
    ["text", "richText", false],
    ["text", "boolean", false],
    ["image", "image", true],
    ["image", "text", false],
    ["image", "url", false],
    ["coordinate", "coordinate", true],
    ["coordinate", "text", false],
    ["datetime", "datetime", true],
    ["datetime", "date", false],
    ["date", "datetime", true],
    ["url", "url", true],
    ["url", "text", false],
    ["number", "text", false],
    ["boolean", "boolean", true],
    ["color", "color", true],
    ["collection", "collection", true],
    ["select", "select", true],
    ["select", "text", false],
    ["richText", "richText", true],
  ] as const)("slot %s ← variable %s = %s", (slot, variable, expected) => {
    expect(isBindingCompatible(slot, variable)).toBe(expected);
  });

  it("restricts formatters to compatible variable types", () => {
    expect(Object.keys(FORMATTER_ACCEPTS).sort()).toEqual([...FORMATTER_NAMES].sort());
    expect(isFormatterCompatible("date", "datetime")).toBe(true);
    expect(isFormatterCompatible("date", "text")).toBe(false);
    expect(isFormatterCompatible("datetime", "date")).toBe(false);
    expect(isFormatterCompatible("currency", "number")).toBe(true);
    expect(isFormatterCompatible("currency", "text")).toBe(false);
    expect(isFormatterCompatible("uppercase", "guest-context")).toBe(true);
    expect(isFormatterCompatible("uppercase", "image")).toBe(false);
  });
});
