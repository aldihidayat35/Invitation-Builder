import { describe, expect, it } from "vitest";
import {
  defaultWidgetRegistry,
  ensureWidgetAutoVariables,
  getWidgetAutoProps,
  isWidgetUsingAutoVariables,
  GIFT_AUTO_VARIABLES,
  MAP_AUTO_VARIABLES,
  COUNTDOWN_AUTO_VARIABLES,
  MUSIC_AUTO_VARIABLES,
} from "@/features/widgets";
import { createWidgetElement, addSection } from "@/features/editor/core/ops";
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  validateDocumentSemantics,
} from "@/lib/schema";
import { buildFormFields } from "@/lib/engine/form";

describe("Widget Auto-Binding Variables Feature", () => {
  it("identifies auto-variable widgets correctly", () => {
    expect(isWidgetUsingAutoVariables("gift")).toBe(true);
    expect(isWidgetUsingAutoVariables("map")).toBe(true);
    expect(isWidgetUsingAutoVariables("countdown")).toBe(true);
    expect(isWidgetUsingAutoVariables("music")).toBe(true);
    expect(isWidgetUsingAutoVariables("rsvp")).toBe(false);
    expect(isWidgetUsingAutoVariables("ornamentFrame")).toBe(false);
  });

  it("automatically declares gift variables and binds props when Gift Widget is inserted", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;
    const giftDef = defaultWidgetRegistry.list().find((w) => w.type === "gift")!;

    expect(doc.variables).toHaveLength(0);

    const result = createWidgetElement(doc, sectionId, giftDef);
    doc = result.document;

    // 1. Variabel hadiah terdaftar di doc.variables
    const declaredKeys = doc.variables.map((v) => v.key);
    expect(declaredKeys).toContain("gift.bank");
    expect(declaredKeys).toContain("gift.accountNumber");
    expect(declaredKeys).toContain("gift.accountName");
    expect(declaredKeys).toContain("gift.bank2");
    expect(declaredKeys).toContain("gift.accountNumber2");
    expect(declaredKeys).toContain("gift.accountName2");

    // 2. Widget props terikat ke variabel tersebut
    const giftElement = doc.sections[0]!.elements.find((e) => e.type === "widget")!;
    expect(giftElement.props.bank).toEqual({ bind: "gift.bank" });
    expect(giftElement.props.accountNumber).toEqual({ bind: "gift.accountNumber" });
    expect(giftElement.props.accountName).toEqual({ bind: "gift.accountName" });

    // 3. Schema & Semantics valid tanpa error binding_unknown_key
    expect(canonicalDocumentSchema.safeParse(doc).success).toBe(true);
    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.filter((i) => i.code === "binding_unknown_key")).toHaveLength(0);
  });

  it("automatically declares map variables and binds coordinates & address when Map Widget is inserted", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;
    const mapDef = defaultWidgetRegistry.list().find((w) => w.type === "map")!;

    const result = createWidgetElement(doc, sectionId, mapDef);
    doc = result.document;

    const declaredKeys = doc.variables.map((v) => v.key);
    expect(declaredKeys).toContain("event.location.lat");
    expect(declaredKeys).toContain("event.location.lng");
    expect(declaredKeys).toContain("event.location.address");

    const mapElement = doc.sections[0]!.elements.find((e) => e.type === "widget")!;
    expect(mapElement.props.latitude).toEqual({ bind: "event.location.lat" });
    expect(mapElement.props.longitude).toEqual({ bind: "event.location.lng" });
    expect(mapElement.props.address).toEqual({ bind: "event.location.address" });

    expect(canonicalDocumentSchema.safeParse(doc).success).toBe(true);
    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.filter((i) => i.code === "binding_unknown_key")).toHaveLength(0);
  });

  it("automatically declares countdown datetime variable when Countdown Widget is inserted", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;
    const countdownDef = defaultWidgetRegistry.list().find((w) => w.type === "countdown")!;

    const result = createWidgetElement(doc, sectionId, countdownDef);
    doc = result.document;

    const declaredKeys = doc.variables.map((v) => v.key);
    expect(declaredKeys).toContain("event.datetime");

    const countdownElement = doc.sections[0]!.elements.find((e) => e.type === "widget")!;
    expect(countdownElement.props.targetDateTime).toEqual({ bind: "event.datetime" });

    expect(canonicalDocumentSchema.safeParse(doc).success).toBe(true);
    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.filter((i) => i.code === "binding_unknown_key")).toHaveLength(0);
  });

  it("automatically declares audio variables and enables global backsound when Music Widget is inserted", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;
    const musicDef = defaultWidgetRegistry.list().find((w) => w.type === "music")!;

    expect(doc.design.audio?.enabled).toBeFalsy();

    const result = createWidgetElement(doc, sectionId, musicDef);
    doc = result.document;

    const declaredKeys = doc.variables.map((v) => v.key);
    expect(declaredKeys).toContain("audio.url");
    expect(declaredKeys).toContain("audio.title");

    const musicElement = doc.sections[0]!.elements.find((e) => e.type === "widget")!;
    expect(musicElement.props.src).toEqual({ bind: "audio.url" });
    expect(musicElement.props.title).toEqual({ bind: "audio.title" });

    // Global backsound otomatis diaktifkan dan sinkron dengan default music
    expect(doc.design.audio?.enabled).toBe(true);
    expect(doc.design.audio?.src).toBe((MUSIC_AUTO_VARIABLES[0] as { default?: string }).default);
    expect(doc.design.audio?.title).toBe((MUSIC_AUTO_VARIABLES[1] as { default?: string }).default);

    expect(canonicalDocumentSchema.safeParse(doc).success).toBe(true);
    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.filter((i) => i.code === "binding_unknown_key")).toHaveLength(0);
  });

  it("generates client form fields with designer default values", () => {
    let doc = addSection(createEmptyDocument(), {}).document;
    const sectionId = doc.sections[0]!.id;

    for (const type of ["gift", "map", "countdown", "music"]) {
      const def = defaultWidgetRegistry.list().find((w) => w.type === type)!;
      doc = createWidgetElement(doc, sectionId, def).document;
    }

    const formFields = buildFormFields(doc.variables);
    expect(formFields.length).toBeGreaterThanOrEqual(12);

    const bankField = formFields.find((f) => f.key === "gift.bank")!;
    expect(bankField.defaultValue).toBe("BCA");

    const latField = formFields.find((f) => f.key === "event.location.lat")!;
    expect(latField.defaultValue).toBe(-6.175392);

    const countdownField = formFields.find((f) => f.key === "event.datetime")!;
    expect(countdownField.needsTimeZone).toBe(true);

    const audioUrlField = formFields.find((f) => f.key === "audio.url")!;
    expect(audioUrlField.defaultValue).toBeTruthy();
  });
});
