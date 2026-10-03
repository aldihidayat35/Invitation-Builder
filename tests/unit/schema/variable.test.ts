/**
 * PRD refs: FR-VAR-001 (types), §10 (keys), Lampiran C.
 */
import {
  lookupVariableType,
  valueSchemaForVariable,
  variableDefinitionSchema,
  VARIABLE_TYPES,
  type VariableDefinition,
} from "@/lib/schema";

const parse = (value: unknown) => variableDefinitionSchema.safeParse(value);

describe("variable definitions (FR-VAR-001)", () => {
  const valid: Record<string, unknown>[] = [
    { key: "couple.bride.fullName", type: "text", label: "Nama", required: true, maxLength: 80 },
    {
      key: "story.body",
      type: "richText",
      label: "Cerita",
      default: [{ text: "Halo", bold: true }],
    },
    {
      key: "event.guestLimit",
      type: "number",
      label: "Batas",
      min: 1,
      max: 5,
      integer: true,
      default: 2,
    },
    { key: "event.date", type: "date", label: "Tanggal", default: "2026-12-12" },
    {
      key: "event.ceremony.startAt",
      type: "datetime",
      label: "Akad",
      default: { local: "2026-12-12T09:00", timeZone: "Asia/Jakarta" },
    },
    { key: "media.coverPhoto", type: "image", label: "Cover" },
    { key: "link.live", type: "url", label: "Live", default: "https://example.com/live" },
    { key: "theme.accent", type: "color", label: "Aksen", default: "#aabbcc" },
    { key: "rsvp.enabled", type: "boolean", label: "RSVP", default: true },
    {
      key: "venue.coordinate",
      type: "coordinate",
      label: "Koordinat",
      default: { lat: -7.8, lng: 110.4 },
    },
    {
      key: "event.dress",
      type: "select",
      label: "Dress code",
      options: [
        { value: "formal", label: "Formal" },
        { value: "batik", label: "Batik" },
      ],
      default: "batik",
    },
    {
      key: "gift.accounts",
      type: "collection",
      label: "Rekening",
      fields: [
        { key: "bank", label: "Bank", type: "text", required: true },
        { key: "number", label: "Nomor", type: "text", required: true },
      ],
      default: [{ bank: "BCA", number: "123" }],
    },
    { key: "guest.name", type: "guest-context", label: "Nama tamu" },
  ];

  it("covers every FR-VAR-001 type plus collection/guest-context", () => {
    const covered = new Set(valid.map((v) => v.type));
    expect([...covered].sort()).toEqual([...VARIABLE_TYPES].sort());
  });

  it.each(valid)("accepts $type ($key)", (def) => {
    expect(parse(def).success).toBe(true);
  });

  it("defaults required to false", () => {
    const result = variableDefinitionSchema.parse({ key: "a.b", type: "text", label: "x" });
    expect(result.required).toBe(false);
  });

  const invalid: ReadonlyArray<[string, Record<string, unknown>]> = [
    ["bad key (space)", { key: "couple bride", type: "text", label: "x" }],
    ["bad key (uppercase start)", { key: "Couple.bride", type: "text", label: "x" }],
    ["bad key (reserved segment)", { key: "a.constructor", type: "text", label: "x" }],
    ["unknown type", { key: "a.b", type: "script", label: "x" }],
    ["unknown field", { key: "a.b", type: "text", label: "x", onChange: "x" }],
    ["empty label", { key: "a.b", type: "text", label: "" }],
    [
      "text default over maxLength",
      { key: "a.b", type: "text", label: "x", maxLength: 3, default: "toolong" },
    ],
    [
      "number default out of range",
      { key: "a.b", type: "number", label: "x", min: 1, max: 5, default: 9 },
    ],
    ["number min > max", { key: "a.b", type: "number", label: "x", min: 5, max: 1 }],
    [
      "non-integer default for integer",
      { key: "a.b", type: "number", label: "x", integer: true, default: 1.5 },
    ],
    ["impossible date default", { key: "a.b", type: "date", label: "x", default: "2026-02-30" }],
    [
      "datetime with unknown zone",
      {
        key: "a.b",
        type: "datetime",
        label: "x",
        default: { local: "2026-12-12T09:00", timeZone: "Mars/Base" },
      },
    ],
    [
      "datetime impossible time",
      {
        key: "a.b",
        type: "datetime",
        label: "x",
        default: { local: "2026-12-12T25:00", timeZone: "Asia/Jakarta" },
      },
    ],
    [
      "url default with javascript:",
      { key: "a.b", type: "url", label: "x", default: "javascript:alert(1)" },
    ],
    ["color default not hex", { key: "a.b", type: "color", label: "x", default: "red" }],
    [
      "coordinate default out of range",
      { key: "a.b", type: "coordinate", label: "x", default: { lat: 99, lng: 0 } },
    ],
    ["select without options", { key: "a.b", type: "select", label: "x", options: [] }],
    [
      "select duplicate options",
      {
        key: "a.b",
        type: "select",
        label: "x",
        options: [
          { value: "a", label: "A" },
          { value: "a", label: "B" },
        ],
      },
    ],
    [
      "select default not in options",
      {
        key: "a.b",
        type: "select",
        label: "x",
        options: [{ value: "a", label: "A" }],
        default: "z",
      },
    ],
    [
      "collection duplicate field keys",
      {
        key: "a.b",
        type: "collection",
        label: "x",
        fields: [
          { key: "bank", label: "A", type: "text" },
          { key: "bank", label: "B", type: "text" },
        ],
      },
    ],
    [
      "collection default missing required field",
      {
        key: "a.b",
        type: "collection",
        label: "x",
        fields: [{ key: "bank", label: "Bank", type: "text", required: true }],
        default: [{}],
      },
    ],
    ["guest-context outside guest.*", { key: "person.name", type: "guest-context", label: "x" }],
    ["guest.* used by non guest-context type", { key: "guest.name", type: "text", label: "x" }],
  ];

  it.each(invalid)("rejects %s", (_name, def) => {
    expect(parse(def).success).toBe(false);
  });

  it("reports invalid defaults at the default's own path", () => {
    const result = parse({ key: "a.b", type: "number", label: "x", min: 1, max: 5, default: 9 });
    expect(result.error?.issues.some((i) => i.path[0] === "default")).toBe(true);
  });
});

describe("valueSchemaForVariable", () => {
  const def = (value: unknown): VariableDefinition => variableDefinitionSchema.parse(value);

  it("validates data values against the definition", () => {
    const select = valueSchemaForVariable(
      def({ key: "a.b", type: "select", label: "x", options: [{ value: "a", label: "A" }] }),
    );
    expect(select.safeParse("a").success).toBe(true);
    expect(select.safeParse("b").success).toBe(false);

    const bounded = valueSchemaForVariable(
      def({ key: "a.b", type: "number", label: "x", min: 0, max: 10 }),
    );
    expect(bounded.safeParse(11).success).toBe(false);

    const url = valueSchemaForVariable(def({ key: "a.b", type: "url", label: "x" }));
    expect(url.safeParse("data:text/html,x").success).toBe(false);
  });
});

describe("lookupVariableType", () => {
  const variables = [{ key: "venue.name", type: "text" as const }];

  it("finds declared variables and runtime guest context", () => {
    expect(lookupVariableType("venue.name", variables)).toBe("text");
    expect(lookupVariableType("guest.name", variables)).toBe("guest-context");
  });

  it("returns undefined for unknown keys, including prototype names", () => {
    expect(lookupVariableType("nope.nothing", variables)).toBeUndefined();
    expect(lookupVariableType("constructor", variables)).toBeUndefined();
    expect(lookupVariableType("toString", variables)).toBeUndefined();
  });
});
