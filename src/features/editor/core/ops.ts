/**
 * Pure document operations for the editor (no React, no Konva).
 *
 * PRD refs: FR-EDT-002/003/006/009, AC-08, P-03.
 * - Every operation takes a CanonicalDocument and returns a NEW document
 *   (structural sharing; untouched sections/elements keep their identity).
 *   A no-op returns the SAME reference so history can skip it.
 * - Results are always schema-valid: elements/sections are built or patched
 *   through the Zod schemas, so the editor cannot write an invalid document.
 * - Locked elements cannot be moved, resized, nudged or deleted (PRD 9.2).
 */
import {
  DEFAULT_SECTION_HEIGHT,
  CANONICAL_BASE_WIDTH,
  elementSchema,
  frameSchema,
  MAX_VARIABLES,
  variableDefinitionSchema,
  type VariableDefinitionInput,
  sectionSchema,
  type CanonicalDocument,
  type Element,
  type Frame,
  type Section,
} from "@/lib/schema";
import { MIN_ELEMENT_SIZE, normalizeRotation, round2 } from "./geometry";

export type ElementKind = "text" | "rectangle" | "circle" | "line" | "decoration";
export const ELEMENT_KINDS: readonly ElementKind[] = [
  "text",
  "rectangle",
  "circle",
  "line",
  "decoration",
];

export const DEFAULT_DUPLICATE_OFFSET = 16;

// -------------------------------------------------------------------- lookups

export function collectIds(doc: CanonicalDocument): Set<string> {
  const ids = new Set<string>();
  for (const section of doc.sections) {
    ids.add(section.id);
    for (const element of section.elements) ids.add(element.id);
  }
  return ids;
}

/** Lowest unused `<prefix>_<n>` id (deterministic, so tests/undo are stable). */
export function generateId(used: ReadonlySet<string>, prefix: string): string {
  for (let n = 1; ; n++) {
    const candidate = `${prefix}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export interface ElementLocation {
  readonly section: Section;
  readonly sectionIndex: number;
  readonly element: Element;
  readonly index: number;
}

export function findElement(doc: CanonicalDocument, id: string): ElementLocation | undefined {
  for (let sectionIndex = 0; sectionIndex < doc.sections.length; sectionIndex++) {
    const section = doc.sections[sectionIndex]!;
    const index = section.elements.findIndex((e) => e.id === id);
    if (index >= 0) return { section, sectionIndex, element: section.elements[index]!, index };
  }
  return undefined;
}

export function findSection(doc: CanonicalDocument, id: string): Section | undefined {
  return doc.sections.find((s) => s.id === id);
}

function withSections(doc: CanonicalDocument, sections: Section[]): CanonicalDocument {
  return { ...doc, sections };
}

function mapSection(
  doc: CanonicalDocument,
  sectionId: string,
  fn: (section: Section) => Section,
): CanonicalDocument {
  let changed = false;
  const sections = doc.sections.map((s) => {
    if (s.id !== sectionId) return s;
    const next = fn(s);
    if (next !== s) changed = true;
    return next;
  });
  return changed ? withSections(doc, sections) : doc;
}

// ------------------------------------------------------------------- sections

export interface AddSectionOptions {
  /** Insert after this section; default: at the end. */
  readonly afterSectionId?: string;
  readonly baseHeight?: number;
}

export function addSection(
  doc: CanonicalDocument,
  options: AddSectionOptions = {},
): { document: CanonicalDocument; sectionId: string } {
  const used = collectIds(doc);
  const sectionId = generateId(used, "sec");
  const section = sectionSchema.parse({
    id: sectionId,
    name: `Section ${doc.sections.length + 1}`,
    baseHeight: options.baseHeight ?? DEFAULT_SECTION_HEIGHT,
  });
  const after = options.afterSectionId
    ? doc.sections.findIndex((s) => s.id === options.afterSectionId)
    : doc.sections.length - 1;
  const sections = [...doc.sections];
  sections.splice(after + 1, 0, section);
  return { document: withSections(doc, sections), sectionId };
}

export function deleteSection(doc: CanonicalDocument, sectionId: string): CanonicalDocument {
  if (!findSection(doc, sectionId)) return doc;
  return withSections(
    doc,
    doc.sections.filter((s) => s.id !== sectionId),
  );
}

/** Clones elements with fresh ids drawn from `used` (which is updated). */
function cloneElements(
  elements: readonly Element[],
  used: Set<string>,
  offset: number,
  unlock: boolean,
): { elements: Element[]; ids: string[] } {
  const ids: string[] = [];
  const out = elements.map((el) => {
    const prefix = idPrefix(el);
    const id = generateId(used, prefix);
    used.add(id);
    ids.push(id);
    const clone = structuredClone(el);
    clone.id = id;
    clone.frame = {
      ...clone.frame,
      x: round2(clone.frame.x + offset),
      y: round2(clone.frame.y + offset),
    };
    if (unlock) clone.locked = false;
    return clone;
  });
  return { elements: out, ids };
}

export function duplicateSection(
  doc: CanonicalDocument,
  sectionId: string,
): { document: CanonicalDocument; sectionId: string } {
  const index = doc.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return { document: doc, sectionId };
  const source = doc.sections[index]!;
  const used = collectIds(doc);
  const newId = generateId(used, "sec");
  used.add(newId);
  const cloned = cloneElements(source.elements, used, 0, false);
  const copy: Section = {
    ...structuredClone(source),
    id: newId,
    name: source.name ? `${source.name} (salinan)` : "Salinan",
    elements: cloned.elements,
  };
  const sections = [...doc.sections];
  sections.splice(index + 1, 0, copy);
  return { document: withSections(doc, sections), sectionId: newId };
}

export function moveSection(
  doc: CanonicalDocument,
  sectionId: string,
  toIndex: number,
): CanonicalDocument {
  const from = doc.sections.findIndex((s) => s.id === sectionId);
  if (from < 0) return doc;
  const to = Math.min(doc.sections.length - 1, Math.max(0, Math.trunc(toIndex)));
  if (to === from) return doc;
  const sections = [...doc.sections];
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved!);
  return withSections(doc, sections);
}

export function shiftSection(
  doc: CanonicalDocument,
  sectionId: string,
  direction: -1 | 1,
): CanonicalDocument {
  const from = doc.sections.findIndex((s) => s.id === sectionId);
  return from < 0 ? doc : moveSection(doc, sectionId, from + direction);
}

export interface SectionPatch {
  readonly name?: string | undefined;
  readonly baseHeight?: number;
  readonly overflow?: Section["overflow"];
  readonly visible?: boolean;
  readonly background?: Partial<Section["background"]>;
  readonly transition?: Section["transition"];
}

/** Applies a patch only if the resulting section is schema-valid. */
export function updateSection(
  doc: CanonicalDocument,
  sectionId: string,
  patch: SectionPatch,
): CanonicalDocument {
  return mapSection(doc, sectionId, (section) => {
    const candidate = {
      ...section,
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.baseHeight !== undefined && { baseHeight: patch.baseHeight }),
      ...(patch.overflow !== undefined && { overflow: patch.overflow }),
      ...(patch.visible !== undefined && { visible: patch.visible }),
      ...(patch.background !== undefined && {
        background: { ...section.background, ...patch.background },
      }),
      ...(patch.transition !== undefined && { transition: patch.transition }),
    };
    const parsed = sectionSchema.safeParse(candidate);
    return parsed.success ? parsed.data : section;
  });
}


// ------------------------------------------------------------------- elements

function idPrefix(element: Element): string {
  switch (element.type) {
    case "text":
      return "el_text";
    case "image":
      return "el_image";
    case "widget":
      return "wdg";
    case "shape":
      return element.shapeType === "rectangle"
        ? "el_rect"
        : element.shapeType === "circle"
          ? "el_circle"
          : "el_line";
  }
}

function placement(section: Section, w: number, h: number): Pick<Frame, "x" | "y"> {
  const cascade = (section.elements.length % 6) * 16;
  return {
    x: round2((CANONICAL_BASE_WIDTH - w) / 2 + cascade),
    y: round2((section.baseHeight - h) / 2 + cascade),
  };
}

function newElementInput(kind: ElementKind, id: string, section: Section) {
  switch (kind) {
    case "text": {
      const w = 240;
      const h = 48;
      return {
        id,
        type: "text",
        name: "Teks",
        frame: { ...placement(section, w, h), w, h, rotation: 0 },
        content: { segments: [{ text: "Teks baru" }] },
        style: { fontSize: 24, textAlign: "center", color: "#2b2118" },
      };
    }
    case "rectangle": {
      const w = 160;
      const h = 100;
      return {
        id,
        type: "shape",
        shapeType: "rectangle",
        name: "Persegi",
        frame: { ...placement(section, w, h), w, h, rotation: 0 },
        style: { fill: "#c9a37b", radius: 0 },
      };
    }
    case "circle": {
      const w = 120;
      const h = 120;
      return {
        id,
        type: "shape",
        shapeType: "circle",
        name: "Lingkaran",
        frame: { ...placement(section, w, h), w, h, rotation: 0 },
        style: { fill: "#8b5e3c" },
      };
    }
    case "line": {
      const w = 200;
      const h = 12;
      return {
        id,
        type: "shape",
        shapeType: "line",
        name: "Garis",
        frame: { ...placement(section, w, h), w, h, rotation: 0 },
        style: { stroke: { color: "#2b2118", width: 2 } },
      };
    }
    case "decoration": {
      // Placeholder until the asset pipeline (Fase 5) provides decorative images.
      const w = 140;
      const h = 140;
      return {
        id,
        type: "shape",
        shapeType: "circle",
        name: "Dekorasi",
        frame: { ...placement(section, w, h), w, h, rotation: 0 },
        style: { fill: "#8b5e3c33", stroke: { color: "#8b5e3c", width: 1 }, opacity: 0.9 },
      };
    }
  }
}

export function createElement(
  doc: CanonicalDocument,
  sectionId: string,
  kind: ElementKind,
): { document: CanonicalDocument; elementId: string | null } {
  const section = findSection(doc, sectionId);
  if (!section) return { document: doc, elementId: null };
  const used = collectIds(doc);
  const prefix = {
    text: "el_text",
    rectangle: "el_rect",
    circle: "el_circle",
    line: "el_line",
    decoration: "el_deco",
  }[kind];
  const id = generateId(used, prefix);
  const element = elementSchema.parse(newElementInput(kind, id, section));
  return {
    document: mapSection(doc, sectionId, (s) => ({ ...s, elements: [...s.elements, element] })),
    elementId: id,
  };
}

/** Replaces one element through `fn`; keeps the old element if the result is invalid. */
export function updateElement(
  doc: CanonicalDocument,
  elementId: string,
  fn: (element: Element) => Element,
): CanonicalDocument {
  const loc = findElement(doc, elementId);
  if (!loc) return doc;
  const next = fn(loc.element);
  if (next === loc.element) return doc;
  const parsed = elementSchema.safeParse(next);
  if (!parsed.success) return doc;
  return mapSection(doc, loc.section.id, (s) => {
    const elements = [...s.elements];
    elements[loc.index] = parsed.data;
    return { ...s, elements };
  });
}

export function renameElement(
  doc: CanonicalDocument,
  elementId: string,
  name: string,
): CanonicalDocument {
  const trimmed = name.trim().slice(0, 120);
  return updateElement(doc, elementId, (el) =>
    (el.name ?? "") === trimmed ? el : { ...el, name: trimmed || undefined },
  );
}

/** Merges into `style` (type-specific keys) - validated by the element schema. */
export function updateElementStyle(
  doc: CanonicalDocument,
  elementId: string,
  patch: Record<string, unknown>,
): CanonicalDocument {
  return updateElement(
    doc,
    elementId,
    (el) =>
      ({
        ...el,
        style: { ...el.style, ...patch },
      }) as Element,
  );
}

export function updateElementFrame(
  doc: CanonicalDocument,
  elementId: string,
  patch: Partial<Frame>,
): CanonicalDocument {
  return setFrames(doc, {
    [elementId]: { ...(findElement(doc, elementId)?.element.frame as Frame), ...patch },
  });
}

function sanitizeFrame(frame: Frame): Frame | null {
  const candidate = {
    x: round2(frame.x),
    y: round2(frame.y),
    w: round2(Math.max(MIN_ELEMENT_SIZE, frame.w)),
    h: round2(Math.max(MIN_ELEMENT_SIZE, frame.h)),
    rotation: normalizeRotation(frame.rotation),
  };
  const parsed = frameSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * Commits final frames (end of drag/resize/rotate, inspector edit). Locked or
 * unknown elements and invalid frames are ignored; unchanged frames keep the
 * same reference.
 */
export function setFrames(
  doc: CanonicalDocument,
  frames: Readonly<Record<string, Frame>>,
): CanonicalDocument {
  let changedAny = false;
  const sections = doc.sections.map((section) => {
    let changed = false;
    const elements = section.elements.map((el) => {
      const incoming = Object.hasOwn(frames, el.id) ? frames[el.id] : undefined;
      if (!incoming || el.locked) return el;
      const frame = sanitizeFrame(incoming);
      if (!frame) return el;
      const f = el.frame;
      if (
        f.x === frame.x &&
        f.y === frame.y &&
        f.w === frame.w &&
        f.h === frame.h &&
        f.rotation === frame.rotation
      ) {
        return el;
      }
      changed = true;
      return { ...el, frame };
    });
    if (!changed) return section;
    changedAny = true;
    return { ...section, elements };
  });
  return changedAny ? withSections(doc, sections) : doc;
}

export function nudgeElements(
  doc: CanonicalDocument,
  ids: readonly string[],
  dx: number,
  dy: number,
): CanonicalDocument {
  const frames: Record<string, Frame> = {};
  for (const id of ids) {
    const el = findElement(doc, id)?.element;
    if (el) frames[id] = { ...el.frame, x: el.frame.x + dx, y: el.frame.y + dy };
  }
  return setFrames(doc, frames);
}

export function deleteElements(doc: CanonicalDocument, ids: readonly string[]): CanonicalDocument {
  const doomed = new Set(ids);
  let changedAny = false;
  const sections = doc.sections.map((section) => {
    const elements = section.elements.filter((el) => !(doomed.has(el.id) && !el.locked));
    if (elements.length === section.elements.length) return section;
    changedAny = true;
    return { ...section, elements };
  });
  return changedAny ? withSections(doc, sections) : doc;
}

/** Places copies at the top of `sectionId`; returns the new ids in source order. */
export function insertElementCopies(
  doc: CanonicalDocument,
  sectionId: string,
  source: readonly Element[],
  offset: number = DEFAULT_DUPLICATE_OFFSET,
): { document: CanonicalDocument; ids: string[] } {
  if (!findSection(doc, sectionId) || source.length === 0) return { document: doc, ids: [] };
  const used = collectIds(doc);
  const cloned = cloneElements(source, used, offset, true);
  return {
    document: mapSection(doc, sectionId, (s) => ({
      ...s,
      elements: [...s.elements, ...cloned.elements],
    })),
    ids: cloned.ids,
  };
}

export function duplicateElements(
  doc: CanonicalDocument,
  ids: readonly string[],
  offset: number = DEFAULT_DUPLICATE_OFFSET,
): { document: CanonicalDocument; ids: string[] } {
  const first = ids.length > 0 ? findElement(doc, ids[0]!) : undefined;
  if (!first) return { document: doc, ids: [] };
  const wanted = new Set(ids);
  const source = first.section.elements.filter((e) => wanted.has(e.id));
  return insertElementCopies(doc, first.section.id, source, offset);
}

export function setLocked(
  doc: CanonicalDocument,
  ids: readonly string[],
  locked: boolean,
): CanonicalDocument {
  return ids.reduce(
    (acc, id) => updateElement(acc, id, (el) => (el.locked === locked ? el : { ...el, locked })),
    doc,
  );
}

export function setVisible(
  doc: CanonicalDocument,
  ids: readonly string[],
  visible: boolean,
): CanonicalDocument {
  return ids.reduce(
    (acc, id) => updateElement(acc, id, (el) => (el.visible === visible ? el : { ...el, visible })),
    doc,
  );
}

export type ReorderMode = "forward" | "backward" | "front" | "back";

/**
 * Z-order = array order (index 0 is the bottom layer). Moves the selected
 * elements of one section while preserving their relative order.
 */
export function reorderElements(
  doc: CanonicalDocument,
  sectionId: string,
  ids: readonly string[],
  mode: ReorderMode,
): CanonicalDocument {
  const selected = new Set(ids);
  return mapSection(doc, sectionId, (section) => {
    const list = [...section.elements];
    if (!list.some((e) => selected.has(e.id))) return section;

    if (mode === "front" || mode === "back") {
      const picked = list.filter((e) => selected.has(e.id));
      const rest = list.filter((e) => !selected.has(e.id));
      const next = mode === "front" ? [...rest, ...picked] : [...picked, ...rest];
      return next.every((e, i) => e === list[i]) ? section : { ...section, elements: next };
    }

    let changed = false;
    if (mode === "forward") {
      for (let i = list.length - 2; i >= 0; i--) {
        if (selected.has(list[i]!.id) && !selected.has(list[i + 1]!.id)) {
          [list[i], list[i + 1]] = [list[i + 1]!, list[i]!];
          changed = true;
        }
      }
    } else {
      for (let i = 1; i < list.length; i++) {
        if (selected.has(list[i]!.id) && !selected.has(list[i - 1]!.id)) {
          [list[i], list[i - 1]] = [list[i - 1]!, list[i]!];
          changed = true;
        }
      }
    }
    return changed ? { ...section, elements: list } : section;
  });
}

// ----------------------------------------------------- asset / widget elements

function insertNewElement(
  doc: CanonicalDocument,
  sectionId: string,
  prefix: string,
  build: (id: string, section: Section) => unknown,
): { document: CanonicalDocument; elementId: string | null } {
  const section = findSection(doc, sectionId);
  if (!section) return { document: doc, elementId: null };
  const id = generateId(collectIds(doc), prefix);
  const parsed = elementSchema.safeParse(build(id, section));
  if (!parsed.success) return { document: doc, elementId: null };
  return {
    document: mapSection(doc, sectionId, (s) => ({ ...s, elements: [...s.elements, parsed.data] })),
    elementId: id,
  };
}

/** Max initial width of a freshly inserted image (px, canonical space). */
export const IMAGE_INSERT_MAX_WIDTH = 300;

/** Places an uploaded asset on the artboard, keeping its aspect ratio. */
export function createImageElement(
  doc: CanonicalDocument,
  sectionId: string,
  asset: { assetId: string; width: number; height: number; name?: string },
): { document: CanonicalDocument; elementId: string | null } {
  return insertNewElement(doc, sectionId, "el_img", (id, section) => {
    const ratio = asset.height / asset.width;
    const w = Math.min(IMAGE_INSERT_MAX_WIDTH, asset.width);
    const h = Math.max(1, Math.round(w * ratio));
    return {
      id,
      type: "image",
      name: (asset.name ?? "Gambar").slice(0, 120),
      frame: { ...placement(section, w, h), w, h, rotation: 0 },
      source: { assetId: asset.assetId },
    };
  });
}

/** Inserts a widget instance from its registry definition (type + version + default props only). */
export function createWidgetElement(
  doc: CanonicalDocument,
  sectionId: string,
  widget: {
    type: string;
    version: number;
    label: string;
    defaultFrame: { w: number; h: number };
    defaultProps: Readonly<Record<string, unknown>>;
  },
): { document: CanonicalDocument; elementId: string | null } {
  return insertNewElement(doc, sectionId, "el_widget", (id, section) => {
    const { w, h } = widget.defaultFrame;
    return {
      id,
      type: "widget",
      name: widget.label,
      frame: { ...placement(section, w, h), w, h, rotation: 0 },
      widgetType: widget.type,
      widgetVersion: widget.version,
      props: structuredClone(widget.defaultProps),
    };
  });
}

// --------------------------------------------------------------------- variables

/**
 * Declares a new variable (validated). Returns the same document when the key
 * already exists or the definition is invalid, so callers can detect a no-op.
 */
export function addVariable(
  doc: CanonicalDocument,
  input: VariableDefinitionInput,
): CanonicalDocument {
  const parsed = variableDefinitionSchema.safeParse(input);
  if (!parsed.success) return doc;
  if (doc.variables.some((v) => v.key === parsed.data.key)) return doc;
  if (doc.variables.length >= MAX_VARIABLES) return doc;
  return { ...doc, variables: [...doc.variables, parsed.data] };
}

/** First free key of the form `base`, `base2`, `base3`, ... among declared variables. */
export function uniqueVariableKey(doc: CanonicalDocument, base: string): string {
  const taken = new Set(doc.variables.map((v) => v.key));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}
