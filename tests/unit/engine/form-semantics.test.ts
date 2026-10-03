/**
 * PRD refs: FR-INV-002 (form from variable schema), FR-VAR-002 (semantic
 * binding-key validation, Lampiran C).
 */
import fullFixture from "../../fixtures/documents/v1/valid-full.json";
import {
  buildFormFields,
  formatFormValue,
  groupFormFields,
  parseFormSubmission,
} from "@/lib/engine";
import {
  canonicalDocumentSchema,
  validateDocumentSemantics,
  type CanonicalDocument,
} from "@/lib/schema";

const doc = (): CanonicalDocument => canonicalDocumentSchema.parse(structuredClone(fullFixture));

describe("form generator primitives (FR-INV-002)", () => {
  const fields = buildFormFields(doc().variables);

  it("builds one field per variable, excluding runtime guest context", () => {
    expect(fields.map((f) => f.key)).not.toContain("guest.name");
    expect(fields).toHaveLength(doc().variables.length - 1);
    const by = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(by["event.ceremony.startAt"]).toMatchObject({
      control: "datetime-local",
      required: true,
      needsTimeZone: true,
    });
    expect(by["venue.coordinate"]).toMatchObject({ control: "coordinate", required: false });
    expect(by["media.coverPhoto"]).toMatchObject({ control: "image" });
  });

  it("groups by first key segment and preserves order", () => {
    const groups = groupFormFields(fields);
    expect(groups.map((g) => g.group)).toEqual(["couple", "event", "venue", "media"]);
    expect(groups[0]!.fields.map((f) => f.key)).toEqual([
      "couple.bride.fullName",
      "couple.bride.nickname",
      "couple.groom.fullName",
      "couple.groom.nickname",
    ]);
  });

  it("parses submissions into typed data and validates required/type", () => {
    const ok = parseFormSubmission(
      doc().variables,
      {
        "couple.bride.fullName": "  A  ",
        "couple.groom.fullName": "B",
        "event.ceremony.startAt": "2026-12-12T08:00",
        "venue.name": "V",
        "venue.address": "Addr",
        "venue.coordinate": "-7.8, 110.36",
        "couple.bride.nickname": "",
      },
      { timeZone: "Asia/Jakarta" },
    );
    expect(ok.issues).toEqual([]);
    expect(ok.data).toMatchObject({
      "couple.bride.fullName": "A",
      "event.ceremony.startAt": { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" },
      "venue.coordinate": { lat: -7.8, lng: 110.36 },
    });
    expect(ok.data).not.toHaveProperty("couple.bride.nickname");

    const bad = parseFormSubmission(
      doc().variables,
      {
        "venue.name": "V",
        "venue.coordinate": "somewhere",
        "event.ceremony.startAt": "2026-02-31T08:00",
      },
      { timeZone: "Asia/Jakarta" },
    );
    const codes = bad.issues.map((i) => `${i.code}:${i.key}`);
    expect(codes).toContain("missing_required:couple.bride.fullName");
    expect(codes).toContain("wrong_type:venue.coordinate");
    expect(codes).toContain("wrong_type:event.ceremony.startAt");
  });

  it("round-trips typed values through the input string form", () => {
    const f = fields.find((x) => x.key === "event.ceremony.startAt")!;
    expect(formatFormValue(f, { local: "2026-12-12T08:00:00", timeZone: "UTC" })).toBe(
      "2026-12-12T08:00",
    );
    const c = fields.find((x) => x.key === "venue.coordinate")!;
    expect(formatFormValue(c, { lat: 1, lng: 2 })).toBe("1, 2");
  });
});

describe("semantic validation of binding keys (Fase 3 step 9)", () => {
  it("accepts the full fixture (all binding keys exist or are runtime guest context)", () => {
    expect(validateDocumentSemantics(doc())).toEqual([]);
  });

  it("flags an unknown key in text, image and widget props (even without a widget catalog)", () => {
    const d = doc();
    const cover = d.sections[0]!;
    const title = cover.elements.find((e) => e.id === "el_title");
    if (title?.type === "text") title.content.segments.push({ bind: "no.such.text" });
    const photo = cover.elements.find((e) => e.id === "el_cover_photo");
    if (photo?.type === "image") photo.source = { bind: "no.such.image" };
    const wdg = cover.elements.find((e) => e.id === "wdg_greeting");
    if (wdg?.type === "widget") wdg.props.guestName = { bind: "no.such.prop" };

    const issues = validateDocumentSemantics(d).filter((i) => i.code === "binding_unknown_key");
    expect(issues.map((i) => i.elementId).sort()).toEqual([
      "el_cover_photo",
      "el_title",
      "wdg_greeting",
    ]);
  });

  it("also checks prop binding keys of unregistered widgets when a catalog is supplied", () => {
    const d = doc();
    const wdg = d.sections[0]!.elements.find((e) => e.id === "wdg_greeting");
    if (wdg?.type === "widget") wdg.props.guestName = { bind: "no.such.prop" };
    const codes = validateDocumentSemantics(d, { widgets: { get: () => undefined } }).map(
      (i) => i.code,
    );
    expect(codes).toContain("unknown_widget_type");
    expect(codes).toContain("binding_unknown_key");
  });
});
