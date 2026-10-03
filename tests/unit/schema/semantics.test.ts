/**
 * PRD refs: Lampiran C, FR-VAR-002, FR-WDG-001, AC-14.
 * Binding type mismatch, unknown keys, formatter misuse, widget validation.
 */
import {
  canonicalDocumentSchema,
  parseDocumentOrThrow,
  validateDocumentSemantics,
} from "@/lib/schema";
import { createTestRegistry } from "../../helpers/widgets";
import { findElement, fullDocument, mutatedFull } from "../../helpers/documents";

const widgets = createTestRegistry();
const check = (input: unknown) =>
  validateDocumentSemantics(parseDocumentOrThrow(input), { widgets });

describe("semantic validation", () => {
  it("passes for the valid fixture", () => {
    expect(check(fullDocument())).toEqual([]);
  });

  it("works without a widget catalog (skips widget checks only)", () => {
    const doc = parseDocumentOrThrow(fullDocument());
    expect(validateDocumentSemantics(doc)).toEqual([]);
  });

  describe("binding keys", () => {
    it("reports a binding to an undeclared variable, pointing at the element", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "el_venue_name").content as Record<string, unknown>).segments = [
            { bind: "venue.nameTypo" },
          ];
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        code: "binding_unknown_key",
        elementId: "el_venue_name",
        sectionId: "sec_event",
        path: ["sections", 1, "elements", 1, "content", "segments", 0, "bind"],
      });
    });

    it("accepts runtime guest context without declaration", () => {
      const issues = check(
        mutatedFull((d) => {
          d.variables = (d.variables as Record<string, unknown>[]).filter(
            (v) => v.key !== "guest.name",
          );
        }),
      );
      expect(issues).toEqual([]);
    });
  });

  describe("binding type mismatch", () => {
    it("rejects an image variable bound into a text segment", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "el_venue_name").content as Record<string, unknown>).segments = [
            { bind: "media.coverPhoto" },
          ];
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["binding_type_mismatch"]);
    });

    it("rejects a text variable bound as an image source", () => {
      const issues = check(
        mutatedFull((d) => {
          findElement(d, "el_cover_photo").source = { bind: "venue.name" };
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["binding_type_mismatch"]);
      expect(issues[0]?.elementId).toBe("el_cover_photo");
    });

    it("rejects a text variable bound to a section background image", () => {
      const issues = check(
        mutatedFull((d) => {
          (
            (d.sections as Record<string, unknown>[])[0]!.background as Record<string, unknown>
          ).image = {
            bind: "venue.name",
          };
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["binding_type_mismatch"]);
      expect(issues[0]?.sectionId).toBe("sec_cover");
    });

    it("rejects a text variable bound to a coordinate widget prop", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "wdg_map").props as Record<string, unknown>).coordinate = {
            bind: "venue.name",
          };
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["binding_type_mismatch"]);
      expect(issues[0]?.path).toEqual([
        "sections",
        2,
        "elements",
        1,
        "props",
        "coordinate",
        "bind",
      ]);
    });

    it("rejects a coordinate variable bound to a datetime widget prop", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "wdg_countdown").props as Record<string, unknown>).targetDateTime = {
            bind: "venue.coordinate",
          };
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["binding_type_mismatch"]);
    });
  });

  describe("formatters", () => {
    it("rejects date formatter on a text variable", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "el_venue_name").content as Record<string, unknown>).segments = [
            { bind: "venue.name", formatter: { name: "date" } },
          ];
        }),
      );
      expect(issues.map((i) => i.code)).toEqual(["formatter_type_mismatch"]);
    });

    it("rejects a formatter used outside a text slot", () => {
      const issues = check(
        mutatedFull((d) => {
          (findElement(d, "wdg_map").props as Record<string, unknown>).coordinate = {
            bind: "venue.coordinate",
            formatter: { name: "uppercase" },
          };
        }),
      );
      expect(issues.map((i) => i.code)).toContain("formatter_requires_text_slot");
    });
  });

  describe("widgets", () => {
    it("reports an unregistered widget type (publish blocker) with its element id", () => {
      const issues = check(
        mutatedFull((d) => {
          findElement(d, "wdg_map").widgetType = "hologram";
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ code: "unknown_widget_type", elementId: "wdg_map" });
    });

    it("reports unknown props, missing required props and invalid static values", () => {
      const issues = check(
        mutatedFull((d) => {
          const props = findElement(d, "wdg_map").props as Record<string, unknown>;
          delete props.coordinate;
          props.mystery = "x";
          props.fallbackUrl = "javascript:alert(1)";
        }),
      );
      expect(issues.map((i) => i.code).sort()).toEqual(
        ["widget_prop_invalid", "widget_prop_missing", "widget_prop_unknown"].sort(),
      );
    });

    it("accepts static values that satisfy the prop schema", () => {
      const issues = check(
        mutatedFull((d) => {
          const props = findElement(d, "wdg_map").props as Record<string, unknown>;
          props.coordinate = { lat: -7.8, lng: 110.4 };
          props.fallbackUrl = "https://maps.google.com/?q=-7.8,110.4";
        }),
      );
      expect(issues).toEqual([]);
    });
  });

  it("structural parse is independent: unknown binding keys still parse", () => {
    const input = mutatedFull((d) => {
      (findElement(d, "el_venue_name").content as Record<string, unknown>).segments = [
        { bind: "zzz.unknown" },
      ];
    });
    expect(canonicalDocumentSchema.safeParse(input).success).toBe(true);
  });
});
