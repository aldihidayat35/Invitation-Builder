/**
 * PRD refs: FR-VAR-002, FR-VAR-003, FR-INV-002, P-02.
 * Unit tests for formatters, resolver, document resolution and registry.
 */
import fullFixture from "../../fixtures/documents/v1/valid-full.json";
import sampleCouple from "../../fixtures/data/sample-couple.json";
import {
  applyDefaults,
  applyFormatter,
  createResolver,
  createVariableRegistry,
  defineVariable,
  formattersFor,
  isFormatterWhitelisted,
  phoneDisplay,
  resolveDocument,
  titleCase,
  validateInvitationData,
  zonedLocalToInstant,
} from "@/lib/engine";
import { createSampleTemplate, SAMPLE_DATASETS } from "@/lib/engine/samples";
import { canonicalDocumentSchema, type Binding, type VariableDefinition } from "@/lib/schema";

const defs: VariableDefinition[] = [
  defineVariable({ key: "couple.bride.fullName", type: "text", label: "Bride", required: true }),
  defineVariable({ key: "couple.bride.nickname", type: "text", label: "Bride nick" }),
  defineVariable({ key: "venue.name", type: "text", label: "Venue", required: true }),
  defineVariable({ key: "guest.name", type: "guest-context", label: "Guest" }),
  defineVariable({ key: "gift.amount", type: "number", label: "Amount", min: 0 }),
  defineVariable({
    key: "event.ceremony.startAt",
    type: "datetime",
    label: "Ceremony",
    required: true,
  }),
  defineVariable({ key: "event.party.on", type: "date", label: "Party" }),
  defineVariable({ key: "theme.color", type: "color", label: "Color", default: "#112233" }),
];
const registry = createVariableRegistry(defs);
const resolver = createResolver(registry);
const bind = (b: Binding) => b;

describe("zonedLocalToInstant / formatters (FR-VAR-003)", () => {
  it("converts wall-clock time of a zone to the right instant, including DST", () => {
    expect(new Date(zonedLocalToInstant("2026-12-12T08:00", "Asia/Jakarta")).toISOString()).toBe(
      "2026-12-12T01:00:00.000Z",
    );
    // US DST starts 2026-03-08 -> New York is UTC-4 at noon that day.
    expect(
      new Date(zonedLocalToInstant("2026-03-08T12:00", "America/New_York")).toISOString(),
    ).toBe("2026-03-08T16:00:00.000Z");
    expect(
      new Date(zonedLocalToInstant("2026-01-08T12:00", "America/New_York")).toISOString(),
    ).toBe("2026-01-08T17:00:00.000Z");
    expect(zonedLocalToInstant("not a date", "UTC")).toBeNaN();
  });

  it("formats datetime in its own zone, or converts to the requested zone", () => {
    const value = { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" };
    const own = applyFormatter(
      { name: "datetime", style: "medium", locale: "en-US" },
      "datetime",
      value,
    );
    expect(own).toContain("8:00");
    const converted = applyFormatter(
      { name: "datetime", style: "medium", locale: "en-US", timeZone: "Asia/Makassar" },
      "datetime",
      value,
    );
    expect(converted).toContain("9:00");
    const utc = applyFormatter(
      { name: "datetime", style: "medium", locale: "en-US", timeZone: "UTC" },
      "datetime",
      value,
    );
    expect(utc).toContain("1:00");
    expect(utc).toContain("Dec 12, 2026");
  });

  it("date formatter works on date and on datetime values without shifting the day", () => {
    expect(
      applyFormatter({ name: "date", style: "long", locale: "en-US" }, "date", "2026-12-12"),
    ).toBe("December 12, 2026");
    expect(
      applyFormatter({ name: "date", style: "long", locale: "en-US" }, "datetime", {
        local: "2026-12-12T23:30",
        timeZone: "Asia/Jakarta",
      }),
    ).toBe("December 12, 2026");
  });

  it("covers case, title-case, phone and currency formatters", () => {
    expect(applyFormatter({ name: "uppercase" }, "text", "gedung kartini")).toBe("GEDUNG KARTINI");
    expect(applyFormatter({ name: "lowercase" }, "text", "ABC")).toBe("abc");
    expect(titleCase("budi sANTOSO-putra o'neil")).toBe("Budi Santoso-Putra O'neil");
    expect(phoneDisplay("081234567890", "ID")).toBe("+62 812-3456-7890");
    expect(phoneDisplay("+62 812 3456 7890", "ID")).toBe("+62 812-3456-7890");
    expect(phoneDisplay("12345", "ID")).toBe("12345");
    expect(phoneDisplay("081234567890", "US")).toBe("081234567890");
    const idr = applyFormatter(
      { name: "currency", currency: "IDR", locale: "id-ID" },
      "number",
      150000,
    );
    expect(idr).toMatch(/150\.000/);
    expect(idr).toMatch(/Rp/);
  });

  it("refuses incompatible formatter/type combinations instead of guessing", () => {
    expect(applyFormatter({ name: "uppercase" }, "number", 5)).toBeUndefined();
    expect(applyFormatter({ name: "currency", currency: "IDR" }, "text", "x")).toBeUndefined();
  });

  it("exposes only the whitelist (no dynamic formatter names)", () => {
    expect(isFormatterWhitelisted("uppercase")).toBe(true);
    expect(isFormatterWhitelisted("eval")).toBe(false);
    expect(isFormatterWhitelisted("constructor")).toBe(false);
    expect(formattersFor("number")).toEqual(["currency"]);
  });
});

describe("variable registry helpers (FR-VAR-001)", () => {
  it("defineVariable validates and throws a readable error", () => {
    expect(() => defineVariable({ key: "Bad Key", type: "text", label: "x" })).toThrow(
      /Invalid variable definition/,
    );
    expect(() =>
      defineVariable({ key: "a.b", type: "number", label: "x", min: 5, max: 1 }),
    ).toThrow(/min must be/);
  });

  it("rejects duplicate keys, exposes required/default/type lookups", () => {
    expect(() => createVariableRegistry([defs[0]!, defs[0]!])).toThrow(/Duplicate/);
    expect(registry.required().map((d) => d.key)).toEqual([
      "couple.bride.fullName",
      "venue.name",
      "event.ceremony.startAt",
    ]);
    expect(registry.defaultFor("theme.color")).toBe("#112233");
    expect(registry.typeOf("guest.name")).toBe("guest-context");
    expect(registry.typeOf("nope.nope")).toBeUndefined();
  });

  it("validates data: missing required, wrong type, unknown key; defaults satisfy required", () => {
    const issues = validateInvitationData(registry, {
      "couple.bride.fullName": "  ",
      "gift.amount": "lots",
      "stale.key": 1,
      "venue.name": "OK",
      "event.ceremony.startAt": { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" },
    });
    expect(issues.map((i) => `${i.code}:${i.key}`).sort()).toEqual([
      "missing_required:couple.bride.fullName",
      "unknown_key:stale.key",
      "wrong_type:gift.amount",
    ]);
  });

  it("applyDefaults fills only missing values and does not mutate input", () => {
    const input = { "theme.color": "", "venue.name": "X" };
    const frozen = Object.freeze({ ...input });
    const out = applyDefaults(registry, frozen);
    expect(out["theme.color"]).toBe("#112233");
    expect(out["venue.name"]).toBe("X");
    expect(frozen["theme.color"]).toBe("");
  });
});

describe("binding resolver (FR-VAR-002/003, P-02)", () => {
  it("resolves a present value and applies the formatter", () => {
    const r = resolver.resolve(
      bind({ bind: "venue.name", formatter: { name: "uppercase" } }),
      { "venue.name": "Gedung Kartini" },
      {},
    );
    expect(r).toMatchObject({ status: "ok", text: "GEDUNG KARTINI", hidden: false });
  });

  it("reports a missing required variable as a blocking issue", () => {
    const r = resolver.resolve(bind({ bind: "venue.name" }), {}, {});
    expect(r.status).toBe("missing_required");
    expect(r.issue?.code).toBe("missing_required");
  });

  it("uses fallback for optional values, empty text otherwise, hide wins over fallback", () => {
    const data = {};
    expect(
      resolver.resolve(bind({ bind: "couple.bride.nickname", fallback: "Mempelai" }), data, {}),
    ).toMatchObject({ status: "fallback", text: "Mempelai", hidden: false });
    expect(resolver.resolve(bind({ bind: "couple.bride.nickname" }), data, {})).toMatchObject({
      status: "empty",
      text: "",
    });
    expect(
      resolver.resolve(
        bind({ bind: "couple.bride.nickname", fallback: "x", hideWhenMissing: true }),
        data,
        {},
      ),
    ).toMatchObject({ status: "hidden", hidden: true, text: "" });
  });

  it("falls back / flags wrong typed values instead of rendering them", () => {
    const optional = resolver.resolve(
      bind({ bind: "gift.amount", fallback: "-" }),
      { "gift.amount": "lots" },
      {},
    );
    expect(optional).toMatchObject({ status: "fallback", text: "-" });
    expect(optional.issue?.code).toBe("invalid_value");

    const required = resolver.resolve(bind({ bind: "venue.name" }), { "venue.name": 42 }, {});
    expect(required.status).toBe("invalid");
    expect(required.issue?.code).toBe("invalid_value");
  });

  it("uses declared defaults before fallback logic", () => {
    expect(resolver.resolve(bind({ bind: "theme.color" }), {}, {})).toMatchObject({
      status: "default",
      value: "#112233",
    });
  });

  it("reads guest.name only from the runtime guest context", () => {
    const b = bind({ bind: "guest.name", fallback: "Tamu" });
    expect(resolver.resolve(b, {}, { name: "Budi" })).toMatchObject({ status: "ok", text: "Budi" });
    expect(resolver.resolve(b, {}, {})).toMatchObject({ status: "fallback", text: "Tamu" });
    // Invitation data must never be able to impersonate runtime guest context.
    expect(resolver.resolve(b, { "guest.name": "Injected" }, {}).text).toBe("Tamu");
  });

  it("resolves undeclared runtime guest.name without a definition", () => {
    const bare = createResolver(createVariableRegistry([]));
    expect(bare.resolve({ bind: "guest.name" }, {}, { name: "Siti" }).text).toBe("Siti");
    expect(bare.resolve({ bind: "venue.name" }, {}, {}).status).toBe("unknown_variable");
  });

  it("ignores inherited properties on data objects", () => {
    const inherited = Object.create({ "venue.name": "Leaked" }) as Record<string, unknown>;
    expect(resolver.resolve(bind({ bind: "venue.name" }), inherited, {}).status).toBe(
      "missing_required",
    );
  });

  it("falls back to plain text and reports an incompatible formatter", () => {
    const r = resolver.resolve(
      bind({ bind: "gift.amount", formatter: { name: "currency", currency: "IDR" } }),
      { "gift.amount": 5 },
      {},
    );
    expect(r.status).toBe("ok");
    expect(r.text).toMatch(/5/);
    const bad = resolver.resolve(
      { bind: "venue.name", formatter: { name: "currency", currency: "IDR" } },
      { "venue.name": "X" },
      {},
    );
    expect(bad.text).toBe("X");
    expect(bad.issue?.code).toBe("formatter_incompatible");
  });

  it("is deterministic and does not mutate its inputs", () => {
    const data = Object.freeze({ "venue.name": "A" });
    const guest = Object.freeze({ name: "G" });
    const b = Object.freeze({ bind: "venue.name" });
    expect(resolver.resolve(b, data, guest)).toEqual(resolver.resolve(b, data, guest));
  });
});

describe("resolveDocument (P-02 acceptance)", () => {
  it("one template + two datasets => two different resolved models, template untouched", () => {
    const template = createSampleTemplate();
    const before = JSON.stringify(template);
    const [a, b] = SAMPLE_DATASETS;
    const ra = resolveDocument(template, a!.data, a!.guest);
    const rb = resolveDocument(template, b!.data, b!.guest);

    expect(JSON.stringify(template)).toBe(before);
    expect(JSON.stringify(ra)).not.toBe(JSON.stringify(rb));

    const text = (r: typeof ra, id: string) =>
      r.sections.flatMap((s) => s.elements).find((e) => e.id === id);
    expect(text(ra, "el_title")).toMatchObject({ text: "Anin & Bagas" });
    expect(text(rb, "el_title")).toMatchObject({ text: "Mempelai Wanita & Mempelai Pria" });
    expect(text(ra, "el_greeting")).toMatchObject({ text: "Kepada Yth. Budi Santoso" });
    expect(text(rb, "el_greeting")).toMatchObject({ text: "Kepada Yth. Tamu Undangan" });
    expect(text(ra, "el_where")).toMatchObject({ text: "GEDUNG KARTINI" });
    expect(text(rb, "el_where")).toMatchObject({ text: "PANTAI LOSARI HALL" });
    expect(ra.ok).toBe(true);
    expect(rb.ok).toBe(true);
  });

  it("hides an element whose hideWhenMissing binding is empty, and keeps layout otherwise", () => {
    const template = createSampleTemplate();
    const [a, b] = SAMPLE_DATASETS;
    const find = (r: ReturnType<typeof resolveDocument>, id: string) =>
      r.sections.flatMap((s) => s.elements).find((e) => e.id === id);
    expect(find(resolveDocument(template, a!.data), "el_phone")).toMatchObject({
      hidden: false,
      text: "Info: +62 812-3456-7890",
    });
    expect(find(resolveDocument(template, b!.data), "el_phone")).toMatchObject({ hidden: true });
  });

  it("reports missing required data with section/element pointers", () => {
    const template = createSampleTemplate();
    const resolved = resolveDocument(template, {}, {});
    expect(resolved.ok).toBe(false);
    const codes = resolved.issues.map((i) => `${i.code}:${i.key}`);
    expect(codes).toContain("missing_required:venue.name");
    const issue = resolved.issues.find((i) => i.key === "venue.name");
    expect(issue?.elementId).toBe("el_where");
    expect(issue?.sectionId).toBe("sec_event");
    expect(issue?.path).toEqual(["sections", 1, "elements", 1, "content", "segments", 0]);
  });

  it("does not share mutable references with the template", () => {
    const template = createSampleTemplate();
    const resolved = resolveDocument(template, SAMPLE_DATASETS[0]!.data);
    const el = resolved.sections[0]!.elements[0]!;
    (el.frame as { x: number }).x = 9999;
    expect(template.sections[0]!.elements[0]!.frame.x).toBe(32);
  });

  it("resolves widget props and image bindings from the full fixture", () => {
    const doc = canonicalDocumentSchema.parse(fullFixture);
    const assetId = "3f2b8c1e-4a6d-4f0e-9b1a-0c2d4e6f8a10";
    const resolved = resolveDocument(
      doc,
      {
        "couple.bride.fullName": "A",
        "couple.groom.fullName": "B",
        "event.ceremony.startAt": { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" },
        "venue.name": "V",
        "venue.address": "Addr",
        "venue.coordinate": { lat: -7.8, lng: 110.36 },
        "media.coverPhoto": { assetId },
      },
      { name: "Tamu" },
    );
    const els = resolved.sections.flatMap((s) => s.elements);
    expect(els.find((e) => e.id === "el_cover_photo")).toMatchObject({ image: { assetId } });
    expect(els.find((e) => e.id === "wdg_map")).toMatchObject({
      props: { coordinate: { lat: -7.8, lng: 110.36 }, label: "V", buttonText: "Buka Google Maps" },
    });
    expect(els.find((e) => e.id === "wdg_greeting")).toMatchObject({
      props: { guestName: "Tamu", prefix: "Kepada Yth." },
    });
    expect(resolved.ok).toBe(true);

    // Optional image/coordinate missing: layout survives, props are null, no blocking issue.
    const sparse = resolveDocument(doc, {
      "couple.bride.fullName": "A",
      "couple.groom.fullName": "B",
      "event.ceremony.startAt": { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" },
      "venue.name": "V",
      "venue.address": "Addr",
    });
    const sparseEls = sparse.sections.flatMap((s) => s.elements);
    expect(sparseEls.find((e) => e.id === "el_cover_photo")).toMatchObject({ image: null });
    expect(sparseEls.find((e) => e.id === "wdg_map")).toMatchObject({
      props: { coordinate: null },
    });
    expect(sparse.ok).toBe(true);
  });

  it("applies element visible=false as hidden", () => {
    const template = createSampleTemplate();
    template.sections[0]!.elements[0]!.visible = false;
    const resolved = resolveDocument(template, SAMPLE_DATASETS[0]!.data);
    expect(resolved.sections[0]!.elements[0]!.hidden).toBe(true);
  });
});

describe("no hardcoded client data in reusable templates (P-02 acceptance)", () => {
  const clientValues = [
    ...Object.entries(sampleCouple)
      .filter(([k]) => k !== "note")
      .map(([, v]) => String(v)),
    ...SAMPLE_DATASETS.flatMap((d) =>
      Object.values(d.data)
        .filter((v): v is string => typeof v === "string")
        .concat(d.guest.name ? [d.guest.name] : []),
    ),
  ];

  it.each([
    ["sample template", () => JSON.stringify(createSampleTemplate())],
    ["valid-full fixture", () => JSON.stringify(fullFixture)],
  ])("%s contains none of the sample client values", (_name, serialize) => {
    const haystack = serialize();
    for (const value of clientValues) {
      expect(haystack).not.toContain(value);
    }
    expect(clientValues.length).toBeGreaterThan(8);
  });
});
