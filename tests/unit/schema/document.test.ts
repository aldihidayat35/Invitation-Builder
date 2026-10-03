/**
 * PRD refs: P-03, FR-TPL-002, §15.2, Lampiran C, AC-14, NFR-SEC-001.
 * CanonicalDocumentV1 accepts valid fixtures and rejects invalid ones with
 * paths that point at the offending field/element.
 */
import {
  canonicalDocumentSchema,
  createEmptyDocument,
  describeIssues,
  DocumentValidationError,
  parseDocumentOrThrow,
} from "@/lib/schema";
import {
  findElement,
  fullDocument,
  minimalDocument,
  mutatedFull,
  sampleCouple,
} from "../../helpers/documents";

describe("CanonicalDocumentV1 — valid fixtures", () => {
  it("parses the full fixture", () => {
    const result = canonicalDocumentSchema.safeParse(fullDocument());
    expect(result.success).toBe(true);
  });

  it("parses the minimal fixture and the empty-document factory", () => {
    expect(canonicalDocumentSchema.safeParse(minimalDocument()).success).toBe(true);
    const empty = createEmptyDocument();
    expect(empty.schemaVersion).toBe(1);
    expect(empty.design.baseWidth).toBe(390);
    expect(empty.sections).toEqual([]);
    expect(empty.variables).toEqual([]);
  });

  it("applies safe defaults (baseWidth 390, section height 844, visible, unlocked)", () => {
    const doc = canonicalDocumentSchema.parse({
      schemaVersion: 1,
      sections: [
        {
          id: "sec_a",
          elements: [
            {
              id: "el_a",
              type: "text",
              frame: { x: 0, y: 0, w: 100, h: 20 },
              content: { segments: [{ text: "x" }] },
            },
          ],
        },
      ],
    });
    expect(doc.design.baseWidth).toBe(390);
    const section = doc.sections[0];
    expect(section?.baseHeight).toBe(844);
    expect(section?.overflow).toBe("hidden");
    const element = section?.elements[0];
    expect(element?.visible).toBe(true);
    expect(element?.locked).toBe(false);
    expect(element?.frame.rotation).toBe(0);
    if (element?.type === "text") {
      expect(element.style.fontSize).toBe(16);
      expect(element.style.opacity).toBe(1);
    }
  });

  it("is idempotent: parsing its own output yields the same value", () => {
    const once = canonicalDocumentSchema.parse(fullDocument());
    expect(canonicalDocumentSchema.parse(once)).toEqual(once);
  });

  it("does not mutate its input", () => {
    const input = fullDocument();
    const snapshot = structuredClone(input);
    canonicalDocumentSchema.parse(input);
    expect(input).toEqual(snapshot);
  });

  it("keeps every element type from the fixture (text, image, shape, widget)", () => {
    const doc = canonicalDocumentSchema.parse(fullDocument());
    const types = new Set(doc.sections.flatMap((s) => s.elements.map((e) => e.type)));
    expect(types).toEqual(new Set(["text", "image", "shape", "widget"]));
  });
});

describe("data / design separation (P-02)", () => {
  it("reusable fixture contains none of the sample client data", () => {
    const serialized = JSON.stringify(fullDocument());
    for (const [key, value] of Object.entries(sampleCouple)) {
      if (key === "note") continue;
      expect(serialized).not.toContain(String(value));
    }
  });
});

describe("CanonicalDocumentV1 — invalid documents are rejected", () => {
  const cases: ReadonlyArray<{
    name: string;
    build: () => unknown;
    expectPath: string;
    expectElementId?: string;
  }> = [
    {
      name: "zero-width frame",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_title").frame as Record<string, unknown>).w = 0;
        }),
      expectPath: "sections.0.elements.1.frame.w",
      expectElementId: "el_title",
    },
    {
      name: "negative-height frame",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_venue_name").frame as Record<string, unknown>).h = -5;
        }),
      expectPath: "sections.1.elements.1.frame.h",
      expectElementId: "el_venue_name",
    },
    {
      name: "non-finite frame x",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_title").frame as Record<string, unknown>).x = Number.NaN;
        }),
      expectPath: "sections.0.elements.1.frame.x",
      expectElementId: "el_title",
    },
    {
      name: "duplicate element ids across sections",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_venue_name").id = "el_title";
        }),
      expectPath: "sections.1.elements.1.id",
      expectElementId: "el_title",
    },
    {
      name: "element id colliding with a section id",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_title").id = "sec_event";
        }),
      expectPath: "sections.1.id",
    },
    {
      name: "duplicate variable keys",
      build: () =>
        mutatedFull((d) => {
          (d.variables as Record<string, unknown>[])[1] = {
            key: "couple.bride.fullName",
            type: "text",
            label: "dup",
          };
        }),
      expectPath: "variables.1.key",
    },
    {
      name: "unsupported schemaVersion",
      build: () =>
        mutatedFull((d) => {
          d.schemaVersion = 2;
        }),
      expectPath: "schemaVersion",
    },
    {
      name: "missing schemaVersion",
      build: () =>
        mutatedFull((d) => {
          delete d.schemaVersion;
        }),
      expectPath: "schemaVersion",
    },
    {
      name: "baseWidth other than 390",
      build: () =>
        mutatedFull((d) => {
          (d.design as Record<string, unknown>).baseWidth = 375;
        }),
      expectPath: "design.baseWidth",
    },
    {
      name: "unknown element type",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_title").type = "iframe";
        }),
      expectPath: "sections.0.elements.1.type",
      expectElementId: "el_title",
    },
    {
      name: "invalid id characters",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_title").id = "el title<script>";
        }),
      expectPath: "sections.0.elements.1.id",
    },
    {
      name: "text element without segments",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_title").content as Record<string, unknown>).segments = [];
        }),
      expectPath: "sections.0.elements.1.content.segments",
      expectElementId: "el_title",
    },
    {
      name: "line shape without stroke",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_divider").style = {};
        }),
      expectPath: "sections.0.elements.2.style.stroke",
      expectElementId: "el_divider",
    },
    {
      name: "image source that is neither asset nor binding",
      build: () =>
        mutatedFull((d) => {
          findElement(d, "el_cover_photo").source = { url: "https://example.com/a.png" };
        }),
      expectPath: "sections.0.elements.0.source",
      expectElementId: "el_cover_photo",
    },
    {
      name: "invalid color",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_title").style as Record<string, unknown>).color =
            "red; background:url(x)";
        }),
      expectPath: "sections.0.elements.1.style.color",
      expectElementId: "el_title",
    },
    {
      name: "font name that could break out of CSS",
      build: () =>
        mutatedFull((d) => {
          (findElement(d, "el_title").style as Record<string, unknown>).fontFamily =
            "x;}body{display:none";
        }),
      expectPath: "sections.0.elements.1.style.fontFamily",
      expectElementId: "el_title",
    },
    {
      name: "unknown easing expression",
      build: () =>
        mutatedFull((d) => {
          const enter = (
            findElement(d, "el_title").animations as Record<string, Record<string, unknown>>
          ).enter;
          if (enter) enter.easing = "cubic-bezier(0,0,eval(1),1)";
        }),
      expectPath: "sections.0.elements.1.animations.enter.easing",
      expectElementId: "el_title",
    },
    {
      name: "root is not an object",
      build: () => "not a document",
      expectPath: "",
    },
  ];

  it.each(cases)("rejects: $name", ({ build, expectPath, expectElementId }) => {
    const input = build();
    const result = canonicalDocumentSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;

    const issues = describeIssues(input, result.error);
    const paths = issues.map((i) => i.path);
    expect(paths).toContain(expectPath);

    if (expectElementId !== undefined) {
      const hit = issues.find((i) => i.path === expectPath);
      expect(hit?.elementId).toBe(expectElementId);
    }
  });
});

describe("no eval / raw script fields (guardrail #3, #10, NFR-SEC-001)", () => {
  const injections: ReadonlyArray<[string, (d: Record<string, unknown>) => void]> = [
    ["script field on a text element", (d) => (findElement(d, "el_title").script = "alert(1)")],
    ["onClick handler on an element", (d) => (findElement(d, "el_title").onClick = "alert(1)")],
    [
      "html field on an element",
      (d) => (findElement(d, "el_title").html = "<img src=x onerror=alert(1)>"),
    ],
    [
      "dangerouslySetInnerHTML on a widget",
      (d) => (findElement(d, "wdg_map").dangerouslySetInnerHTML = "<b>x</b>"),
    ],
    ["top-level script field", (d) => (d.script = "alert(1)")],
    ["top-level eval field", (d) => (d.eval = "1+1")],
    [
      "unknown field on a section",
      (d) => ((d.sections as Record<string, unknown>[])[0]!.customCss = "body{}"),
    ],
    ["unknown field in design", (d) => ((d.design as Record<string, unknown>).headScript = "x")],
  ];

  it.each(injections)("rejects %s", (_name, inject) => {
    expect(canonicalDocumentSchema.safeParse(mutatedFull(inject)).success).toBe(false);
  });

  it("rejects script-like keys and prototype-pollution keys inside widget props", () => {
    for (const key of ["onClick", "script", "html", "innerHTML", "constructor"]) {
      const input = mutatedFull((d) => {
        (findElement(d, "wdg_map").props as Record<string, unknown>)[key] = "x";
      });
      expect(canonicalDocumentSchema.safeParse(input).success, key).toBe(false);
    }
    const polluted = mutatedFull((d) => {
      (findElement(d, "wdg_map").props as Record<string, unknown>).options = JSON.parse(
        '{"__proto__":{"polluted":true}}',
      ) as unknown;
    });
    expect(canonicalDocumentSchema.safeParse(polluted).success).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects functions and class instances (non-JSON data)", () => {
    const withFunction = mutatedFull((d) => {
      (findElement(d, "wdg_map").props as Record<string, unknown>).buttonText = () => "x";
    });
    expect(canonicalDocumentSchema.safeParse(withFunction).success).toBe(false);

    const withDate = mutatedFull((d) => {
      (findElement(d, "wdg_map").props as Record<string, unknown>).buttonText = new Date();
    });
    expect(canonicalDocumentSchema.safeParse(withDate).success).toBe(false);
  });

  it("rejects a malformed binding instead of storing it as static data", () => {
    const input = mutatedFull((d) => {
      (findElement(d, "wdg_map").props as Record<string, unknown>).label = {
        bind: "venue.name",
        formatter: { name: "eval", code: "alert(1)" },
      };
    });
    const result = canonicalDocumentSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects a bind key that is not a safe dot path", () => {
    for (const bind of [
      "venue.name'); drop",
      "constructor",
      "a.constructor.b",
      "__proto__",
      "venue name",
    ]) {
      const input = mutatedFull((d) => {
        (findElement(d, "el_venue_name").content as Record<string, unknown>).segments = [{ bind }];
      });
      expect(canonicalDocumentSchema.safeParse(input).success, bind).toBe(false);
    }
  });
});

describe("unknown widget type placeholder behavior (structural layer)", () => {
  it("accepts an unregistered widgetType structurally (forward compatible)", () => {
    const input = mutatedFull((d) => {
      findElement(d, "wdg_map").widgetType = "hologram";
    });
    expect(canonicalDocumentSchema.safeParse(input).success).toBe(true);
  });

  it("still rejects a syntactically invalid widgetType", () => {
    const input = mutatedFull((d) => {
      findElement(d, "wdg_map").widgetType = "map<script>";
    });
    expect(canonicalDocumentSchema.safeParse(input).success).toBe(false);
  });
});

describe("parseDocumentOrThrow", () => {
  it("returns the document when valid", () => {
    expect(parseDocumentOrThrow(fullDocument()).sections).toHaveLength(3);
  });

  it("throws DocumentValidationError with field-level issues (AC-14)", () => {
    const input = mutatedFull((d) => {
      (findElement(d, "el_title").frame as Record<string, unknown>).w = 0;
    });
    try {
      parseDocumentOrThrow(input);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(DocumentValidationError);
      const issue = (error as DocumentValidationError).issues.find(
        (i) => i.path === "sections.0.elements.1.frame.w",
      );
      expect(issue?.elementId).toBe("el_title");
      expect(issue?.sectionId).toBe("sec_cover");
    }
  });
});
