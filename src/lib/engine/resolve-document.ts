/**
 * Document resolver: canonical document + data context -> resolved render model.
 *
 * PRD refs: FR-VAR-002, FR-VAR-003, FR-INV-002, P-02, P-03.
 * - Pure: the template document and the data are never mutated; the result
 *   shares no mutable references with the input (frames/styles are cloned).
 * - One template + two datasets => two independent resolved models (P-02).
 * - The resolved model is DATA, not markup. The HTML renderer (Fase 9)
 *   consumes it; text is escaped by the renderer, never interpreted here.
 */
import {
  isBindingSegment,
  isBinding,
  type Binding,
  type CanonicalDocument,
  type Element,
  type Frame,
  type OpeningScreenConfig,
  type OpeningTemplate,
  type SectionTransition,
  type ThemeTokens,
} from "@/lib/schema";

import { createResolver, type ResolvedBinding, type ResolverOptions } from "./resolver";
import {
  BLOCKING_RESOLVE_CODES,
  type GuestData,
  type InvitationData,
  type ResolveIssue,
} from "./types";
import { createVariableRegistry } from "./variable-registry";

export interface ResolvedTextSegment {
  readonly text: string;
  readonly bound: boolean;
  readonly key?: string;
}

interface ResolvedBase {
  readonly id: string;
  readonly name?: string;
  readonly frame: Frame;
  /** True when the element must not render: `visible=false` or a `hideWhenMissing` binding. */
  readonly hidden: boolean;
  readonly locked: boolean;
  readonly animations?: Element["animations"];
}

export interface ResolvedTextElement extends ResolvedBase {
  readonly type: "text";
  readonly style: Extract<Element, { type: "text" }>["style"];
  readonly text: string;
  readonly segments: readonly ResolvedTextSegment[];
}

export interface ResolvedImageElement extends ResolvedBase {
  readonly type: "image";
  readonly alt?: string;
  readonly style: Extract<Element, { type: "image" }>["style"];
  /** Asset to show; `null` when an optional image binding is empty. */
  readonly image: { readonly assetId: string } | null;
}

export interface ResolvedShapeElement extends ResolvedBase {
  readonly type: "shape";
  readonly shapeType: Extract<Element, { type: "shape" }>["shapeType"];
  readonly style: Extract<Element, { type: "shape" }>["style"];
}

export interface ResolvedWidgetElement extends ResolvedBase {
  readonly type: "widget";
  readonly widgetType: string;
  readonly widgetVersion: number;
  readonly style: Extract<Element, { type: "widget" }>["style"];
  /** Static props as stored; bindings replaced by their resolved typed value (or null). */
  readonly props: Readonly<Record<string, unknown>>;
}

export type ResolvedElement =
  ResolvedTextElement | ResolvedImageElement | ResolvedShapeElement | ResolvedWidgetElement;

export interface ResolvedSection {
  readonly id: string;
  readonly name?: string;
  readonly baseHeight: number;
  readonly overflow: "hidden" | "visible";
  readonly hidden: boolean;
  readonly background: {
    readonly color?: CanonicalDocument["sections"][number]["background"]["color"];
    readonly image: { readonly assetId: string } | null;
    readonly fit: "cover" | "contain";
  };
  readonly transition?: SectionTransition;
  readonly elements: readonly ResolvedElement[];
}


export interface ResolvedDocumentBackground {
  readonly color?: CanonicalDocument["sections"][number]["background"]["color"];
  readonly image: { readonly assetId: string } | null;
  readonly fit: "cover" | "contain" | "repeat";
  readonly overlayColor?: string;
  readonly overlayOpacity: number;
}

export interface ResolvedOpeningScreen {
  readonly enabled: boolean;
  readonly template: OpeningTemplate;
  readonly title: string;
  readonly subtitle?: string;
  readonly guestLabel: string;
  readonly buttonText: string;
  readonly coupleName: string;
  readonly dateText?: string;
  readonly locationText?: string;
  readonly bgImage?: { readonly assetId: string } | null;
  readonly overlayOpacity: number;
}

export interface ResolvedDocument {
  readonly schemaVersion: number;
  readonly baseWidth: number;
  readonly tokens: ThemeTokens;
  readonly background?: ResolvedDocumentBackground;
  readonly opening?: ResolvedOpeningScreen;
  readonly sections: readonly ResolvedSection[];
  readonly issues: readonly ResolveIssue[];
  /** True when no issue blocks publishing/preview correctness. */
  readonly ok: boolean;
}

function imageFromBinding(resolved: ResolvedBinding): { assetId: string } | null {
  const value = resolved.value;
  if (typeof value === "object" && value !== null && "assetId" in value) {
    const assetId = (value as { assetId: unknown }).assetId;
    if (typeof assetId === "string") return { assetId };
  }
  return null;
}

export function resolveDocument(
  document: CanonicalDocument,
  data: InvitationData = {},
  guest: GuestData = {},
  options: ResolverOptions = {},
): ResolvedDocument {
  const registry = createVariableRegistry(document.variables);
  const resolver = createResolver(registry, options);
  const issues: ResolveIssue[] = [];

  const resolveAt = (
    binding: Binding,
    path: (string | number)[],
    where: { sectionId: string; elementId?: string },
  ): ResolvedBinding => {
    const resolved = resolver.resolve(binding, data, guest);
    if (resolved.issue) issues.push({ ...resolved.issue, path, ...where });
    return resolved;
  };

  const sections: ResolvedSection[] = document.sections.map((section, si) => {
    const sectionPath: (string | number)[] = ["sections", si];
    const sectionWhere = { sectionId: section.id };

    let backgroundImage: { assetId: string } | null = null;
    const bg = section.background.image;
    if (bg) {
      backgroundImage =
        "bind" in bg
          ? imageFromBinding(resolveAt(bg, [...sectionPath, "background", "image"], sectionWhere))
          : { assetId: bg.assetId };
    }

    const elements: ResolvedElement[] = section.elements.map((element, ei) => {
      const path: (string | number)[] = [...sectionPath, "elements", ei];
      const where = { ...sectionWhere, elementId: element.id };
      const base = {
        id: element.id,
        ...(element.name !== undefined && { name: element.name }),
        frame: structuredClone(element.frame),
        locked: element.locked,
        ...(element.animations !== undefined && {
          animations: structuredClone(element.animations),
        }),
      };
      const notVisible = !element.visible;

      switch (element.type) {
        case "text": {
          let hiddenByBinding = false;
          const segments: ResolvedTextSegment[] = element.content.segments.map((segment, gi) => {
            if (!isBindingSegment(segment)) return { text: segment.text, bound: false };
            const resolved = resolveAt(segment, [...path, "content", "segments", gi], where);
            if (resolved.hidden) hiddenByBinding = true;
            return { text: resolved.text, bound: true, key: segment.bind };
          });
          return {
            ...base,
            type: "text",
            style: structuredClone(element.style),
            segments,
            text: segments.map((s) => s.text).join(""),
            hidden: notVisible || hiddenByBinding,
          };
        }
        case "image": {
          let image: { assetId: string } | null;
          let hiddenByBinding = false;
          if ("bind" in element.source) {
            const resolved = resolveAt(element.source, [...path, "source"], where);
            image = imageFromBinding(resolved);
            hiddenByBinding = resolved.hidden;
          } else {
            image = { assetId: element.source.assetId };
          }
          return {
            ...base,
            type: "image",
            ...(element.alt !== undefined && { alt: element.alt }),
            style: structuredClone(element.style),
            image,
            hidden: notVisible || hiddenByBinding,
          };
        }
        case "shape":
          return {
            ...base,
            type: "shape",
            shapeType: element.shapeType,
            style: structuredClone(element.style),
            hidden: notVisible,
          };
        case "widget": {
          let hiddenByBinding = false;
          const props: Record<string, unknown> = {};
          for (const [name, value] of Object.entries(element.props)) {
            if (isBinding(value)) {
              const resolved = resolveAt(value, [...path, "props", name], where);
              if (resolved.hidden) hiddenByBinding = true;
              props[name] = resolved.value === undefined ? null : structuredClone(resolved.value);
            } else {
              props[name] = structuredClone(value);
            }
          }
          return {
            ...base,
            type: "widget",
            widgetType: element.widgetType,
            widgetVersion: element.widgetVersion,
            style: structuredClone(element.style),
            props,
            hidden: notVisible || hiddenByBinding,
          };
        }
      }
    });

    return {
      id: section.id,
      ...(section.name !== undefined && { name: section.name }),
      baseHeight: section.baseHeight,
      overflow: section.overflow,
      hidden: !section.visible,
      background: {
        ...(section.background.color !== undefined && {
          color: structuredClone(section.background.color),
        }),
        image: backgroundImage,
        fit: section.background.fit,
      },
      transition: section.transition ? structuredClone(section.transition) : undefined,
      elements,
    };
  });

  const docBg = document.design.background;
  let resolvedBackground: ResolvedDocumentBackground | undefined;
  if (docBg) {
    let backgroundImage: { assetId: string } | null = null;
    if (docBg.image) {
      if (isBinding(docBg.image)) {
        const resolved = resolveAt(docBg.image, ["design", "background", "image"], {
          sectionId: "document",
        });
        backgroundImage = imageFromBinding(resolved);
      } else {
        backgroundImage = { assetId: docBg.image.assetId };
      }
    }

    resolvedBackground = {
      ...(docBg.color !== undefined && {
        color: structuredClone(docBg.color),
      }),
      image: backgroundImage,
      fit: docBg.fit,
      overlayColor: docBg.overlayColor,
      overlayOpacity: docBg.overlayOpacity,
    };
  }

  const docOpening = document.design.opening;
  let resolvedOpening: ResolvedOpeningScreen | undefined;
  if (docOpening && docOpening.enabled) {
    let coupleName = docOpening.coupleName?.trim();
    if (!coupleName) {
      const groomNick = typeof data["couple.groom.nickname"] === "string" ? data["couple.groom.nickname"].trim() : "";
      const brideNick = typeof data["couple.bride.nickname"] === "string" ? data["couple.bride.nickname"].trim() : "";
      if (groomNick && brideNick) {
        coupleName = `${groomNick} & ${brideNick}`;
      } else if (groomNick) {
        coupleName = groomNick;
      } else if (brideNick) {
        coupleName = brideNick;
      } else {
        coupleName = "Romeo & Juliet";
      }
    }

    let dateText = docOpening.dateText?.trim();
    if (!dateText) {
      const ceremony = data["event.ceremony.startAt"];
      if (typeof ceremony === "object" && ceremony !== null && "local" in ceremony) {
        const rawLocal = String((ceremony as { local?: unknown }).local ?? "");
        if (rawLocal) {
          try {
            const d = new Date(rawLocal);
            if (!isNaN(d.getTime())) {
              dateText = d.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }
          } catch {
            dateText = rawLocal;
          }
        }
      }
    }

    let locationText = docOpening.locationText?.trim();
    if (!locationText) {
      const venue = data["venue.name"];
      if (typeof venue === "string" && venue.trim()) {
        locationText = venue.trim();
      }
    }

    let bgImage: { assetId: string } | null = null;
    if (docOpening.bgImage) {
      if (isBinding(docOpening.bgImage)) {
        const resolved = resolveAt(docOpening.bgImage, ["design", "opening", "bgImage"], {
          sectionId: "opening",
        });
        bgImage = imageFromBinding(resolved);
      } else {
        bgImage = { assetId: docOpening.bgImage.assetId };
      }
    }

    resolvedOpening = {
      enabled: true,
      template: docOpening.template ?? "royal-envelope",
      title: docOpening.title?.trim() || "The Wedding Of",
      ...(docOpening.subtitle?.trim() && { subtitle: docOpening.subtitle.trim() }),
      guestLabel: docOpening.guestLabel?.trim() || "Kepada Yth. Bapak/Ibu/Saudara/i:",
      buttonText: docOpening.buttonText?.trim() || "Buka Undangan",
      coupleName,
      ...(dateText && { dateText }),
      ...(locationText && { locationText }),
      bgImage,
      overlayOpacity: docOpening.overlayOpacity ?? 0.4,
    };
  }

  return {
    schemaVersion: document.schemaVersion,
    baseWidth: document.design.baseWidth,
    tokens: structuredClone(document.design.tokens),
    ...(resolvedBackground && { background: resolvedBackground }),
    ...(resolvedOpening && { opening: resolvedOpening }),
    sections,
    issues,
    ok: !issues.some((i) => BLOCKING_RESOLVE_CODES.has(i.code)),
  };
}
