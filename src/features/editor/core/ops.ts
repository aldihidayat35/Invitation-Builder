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
    for (const element of section.elements) {
      ids.add(element.id);
      if (element.groupId) ids.add(element.groupId);
    }
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
  readonly isOpening?: boolean;
  readonly atIndex?: number;
}

export function addSection(
  doc: CanonicalDocument,
  options: AddSectionOptions = {},
): { document: CanonicalDocument; sectionId: string } {
  const used = collectIds(doc);
  const sectionId = generateId(used, "sec");
  const isOpening = Boolean(options.isOpening);
  const section = sectionSchema.parse({
    id: sectionId,
    name: isOpening ? "Opening" : `Section ${doc.sections.length + 1}`,
    baseHeight: options.baseHeight ?? DEFAULT_SECTION_HEIGHT,
    isOpening,
  });

  let sections = [...doc.sections];
  if (isOpening) {
    // Clear isOpening from any existing sections and place at the very top (index 0)
    sections = sections.map((s) => (s.isOpening ? { ...s, isOpening: false } : s));
    sections.unshift(section);
  } else if (options.atIndex !== undefined) {
    sections.splice(options.atIndex, 0, section);
  } else {
    const after = options.afterSectionId
      ? sections.findIndex((s) => s.id === options.afterSectionId)
      : sections.length - 1;
    sections.splice(after + 1, 0, section);
  }

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
  targetPosition?: { readonly x: number; readonly y: number },
  targetBaseHeight?: number,
): { elements: Element[]; ids: string[] } {
  const ids: string[] = [];

  // Group ID remapping: members of the same group receive the same new groupId
  const groupMap = new Map<string, string>();
  for (const el of elements) {
    if (el.groupId && !groupMap.has(el.groupId)) {
      const newGrpId = generateId(used, "grp");
      used.add(newGrpId);
      groupMap.set(el.groupId, newGrpId);
    }
  }

  let dx = offset;
  let dy = offset;
  if (targetPosition && elements.length > 0) {
    const minX = Math.min(...elements.map((e) => e.frame.x));
    const minY = Math.min(...elements.map((e) => e.frame.y));
    dx = targetPosition.x - minX;
    dy = targetPosition.y - minY;
  }

  const out = elements.map((el) => {
    const prefix = idPrefix(el);
    const id = generateId(used, prefix);
    used.add(id);
    ids.push(id);
    const clone = structuredClone(el);
    clone.id = id;
    if (clone.groupId && groupMap.has(clone.groupId)) {
      clone.groupId = groupMap.get(clone.groupId);
    }

    let nextX = round2(clone.frame.x + dx);
    let nextY = round2(clone.frame.y + dy);

    // If explicit target position is specified, ensure it stays within canvas / section bounds
    if (targetPosition) {
      if (nextX < 0) nextX = 0;
      if (nextX + clone.frame.w > CANONICAL_BASE_WIDTH) {
        nextX = Math.max(0, CANONICAL_BASE_WIDTH - clone.frame.w);
      }
      if (targetBaseHeight && targetBaseHeight > 0) {
        if (nextY < 0) nextY = 0;
        if (nextY + clone.frame.h > targetBaseHeight) {
          nextY = Math.max(0, targetBaseHeight - clone.frame.h);
        }
      }
    }

    clone.frame = {
      ...clone.frame,
      x: round2(nextX),
      y: round2(nextY),
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
  readonly isOpening?: boolean;
  readonly background?: Partial<Section["background"]>;
  readonly transition?: Section["transition"];
}

/** Applies a patch only if the resulting section is schema-valid. */
export function updateSection(
  doc: CanonicalDocument,
  sectionId: string,
  patch: SectionPatch,
): CanonicalDocument {
  // If marking as opening, ensure other sections are not marked as opening
  const baseDoc =
    patch.isOpening === true
      ? {
          ...doc,
          sections: doc.sections.map((s) =>
            s.id !== sectionId && s.isOpening ? { ...s, isOpening: false } : s,
          ),
        }
      : doc;

  return mapSection(baseDoc, sectionId, (section) => {
    const candidate = {
      ...section,
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.baseHeight !== undefined && { baseHeight: patch.baseHeight }),
      ...(patch.overflow !== undefined && { overflow: patch.overflow }),
      ...(patch.visible !== undefined && { visible: patch.visible }),
      ...(patch.isOpening !== undefined && { isOpening: patch.isOpening }),
      ...(patch.background !== undefined && {
        background: { ...section.background, ...patch.background },
      }),
      ...(patch.transition !== undefined && { transition: patch.transition }),
    };
    const parsed = sectionSchema.safeParse(candidate);
    return parsed.success ? parsed.data : section;
  });
}

export function toggleSectionOpening(
  doc: CanonicalDocument,
  sectionId: string,
): CanonicalDocument {
  const current = doc.sections.find((s) => s.id === sectionId);
  if (!current) return doc;
  return updateSection(doc, sectionId, { isOpening: !current.isOpening });
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

    // Dissolve any groups that now have fewer than 2 elements left
    const groupCounts = new Map<string, number>();
    for (const el of elements) {
      if (el.groupId) {
        groupCounts.set(el.groupId, (groupCounts.get(el.groupId) ?? 0) + 1);
      }
    }
    const cleaned = elements.map((el) => {
      if (el.groupId && (groupCounts.get(el.groupId) ?? 0) < 2) {
        const { groupId: _g, groupName: _gn, ...rest } = el;
        void _g;
        void _gn;
        return rest as Element;
      }
      return el;
    });

    return { ...section, elements: cleaned };
  });
  return changedAny ? withSections(doc, sections) : doc;
}

export interface InsertCopiesOptions {
  readonly offset?: number;
  readonly position?: { readonly x: number; readonly y: number };
}

/** Places copies at the top of `sectionId`; returns the new ids in source order. */
export function insertElementCopies(
  doc: CanonicalDocument,
  sectionId: string,
  source: readonly Element[],
  offsetOrOptions: number | InsertCopiesOptions = DEFAULT_DUPLICATE_OFFSET,
): { document: CanonicalDocument; ids: string[] } {
  const targetSection = findSection(doc, sectionId);
  if (!targetSection || source.length === 0) return { document: doc, ids: [] };
  const offset =
    typeof offsetOrOptions === "number"
      ? offsetOrOptions
      : (offsetOrOptions.offset ?? DEFAULT_DUPLICATE_OFFSET);
  const position = typeof offsetOrOptions === "object" ? offsetOrOptions.position : undefined;

  const used = collectIds(doc);
  const cloned = cloneElements(
    source,
    used,
    offset,
    true,
    position,
    targetSection.baseHeight,
  );
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
  if (ids.length === 0) return { document: doc, ids: [] };
  const wanted = new Set(ids);
  const createdIds: string[] = [];
  let nextDoc = doc;

  for (const section of nextDoc.sections) {
    const source = section.elements.filter((e) => wanted.has(e.id));
    if (source.length === 0) continue;
    const res = insertElementCopies(nextDoc, section.id, source, offset);
    nextDoc = res.document;
    createdIds.push(...res.ids);
  }

  return { document: nextDoc, ids: createdIds };
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

/**
 * Moves an element in the layer order within a section.
 * "above" means the source element will be placed above the target element in the visual layer list
 * (i.e. higher z-index, rendered later).
 * "below" means the source element will be placed below the target element in the visual layer list
 * (i.e. lower z-index, rendered earlier).
 */
export function moveElementInLayers(
  doc: CanonicalDocument,
  sectionId: string,
  sourceId: string,
  targetId: string,
  placement: "above" | "below",
): CanonicalDocument {
  if (sourceId === targetId) return doc;

  return mapSection(doc, sectionId, (section) => {
    // Visual layers order: index 0 is top-most (last in elements array)
    const layers = [...section.elements].reverse();
    const sourceIdx = layers.findIndex((e) => e.id === sourceId);
    if (sourceIdx === -1) return section;

    const [sourceElement] = layers.splice(sourceIdx, 1);
    if (!sourceElement) return section;

    const targetIdx = layers.findIndex((e) => e.id === targetId);
    if (targetIdx === -1) return section;

    const insertIdx = placement === "above" ? targetIdx : targetIdx + 1;
    layers.splice(insertIdx, 0, sourceElement);

    const newElements = layers.reverse();
    const unchanged = newElements.every((el, i) => el === section.elements[i]);
    return unchanged ? section : { ...section, elements: newElements };
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

/** Places an uploaded asset or direct image/GIF URL on the artboard, keeping its aspect ratio. */
export function createImageElement(
  doc: CanonicalDocument,
  sectionId: string,
  asset: {
    assetId?: string;
    url?: string;
    width: number;
    height: number;
    name?: string;
  },
): { document: CanonicalDocument; elementId: string | null } {
  return insertNewElement(doc, sectionId, "el_img", (id, section) => {
    const rawW = asset.width > 0 ? asset.width : IMAGE_INSERT_MAX_WIDTH;
    const rawH = asset.height > 0 ? asset.height : IMAGE_INSERT_MAX_WIDTH;
    const ratio = rawH / rawW;
    const w = Math.min(IMAGE_INSERT_MAX_WIDTH, rawW);
    const h = Math.max(1, Math.round(w * ratio));
    const source = asset.assetId ? { assetId: asset.assetId } : { url: asset.url ?? "" };
    return {
      id,
      type: "image",
      name: (asset.name ?? "Gambar").slice(0, 120),
      frame: { ...placement(section, w, h), w, h, rotation: 0 },
      source,
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
    defaultStyle?: Readonly<{ variant: string; radius?: number }>;
  },
  initialProps?: Record<string, unknown>,
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
      props: {
        ...structuredClone(widget.defaultProps),
        ...(initialProps ? structuredClone(initialProps) : {}),
      },
      ...(widget.defaultStyle && { style: structuredClone(widget.defaultStyle) }),
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

/**
 * Updates an existing variable definition in the document (e.g. updating default value or label).
 * Returns the modified document, or same reference if key not found or patch invalid.
 */
export function updateVariable(
  doc: CanonicalDocument,
  key: string,
  patch: Partial<VariableDefinitionInput>,
): CanonicalDocument {
  const existing = doc.variables.find((v) => v.key === key);
  if (!existing) return doc;

  const merged = { ...existing, ...patch, key: existing.key };
  const parsed = variableDefinitionSchema.safeParse(merged);
  if (!parsed.success) return doc;

  return {
    ...doc,
    variables: doc.variables.map((v) => (v.key === key ? parsed.data : v)),
  };
}

/**
 * Removes a variable from the document variables list.
 */
export function removeVariable(
  doc: CanonicalDocument,
  key: string,
): CanonicalDocument {
  if (!doc.variables.some((v) => v.key === key)) return doc;
  return {
    ...doc,
    variables: doc.variables.filter((v) => v.key !== key),
  };
}

/**
 * Converts a static text segment into a variable binding segment.
 */
export function bindTextSegmentToVariable(
  doc: CanonicalDocument,
  elementId: string,
  segmentIndex: number,
  bindKey: string,
  fallback?: string,
): CanonicalDocument {
  return updateElement(doc, elementId, (el) => {
    if (el.type !== "text") return el;
    const segments = [...el.content.segments];
    if (segmentIndex < 0 || segmentIndex >= segments.length) return el;
    segments[segmentIndex] = {
      bind: bindKey,
      ...(fallback !== undefined && fallback.length > 0 ? { fallback } : {}),
    };
    return { ...el, content: { segments } };
  });
}

/**
 * Converts a variable binding segment back to a static text segment.
 */
export function unbindTextSegmentToStatic(
  doc: CanonicalDocument,
  elementId: string,
  segmentIndex: number,
  fallbackText?: string,
): CanonicalDocument {
  return updateElement(doc, elementId, (el) => {
    if (el.type !== "text") return el;
    const segments = [...el.content.segments];
    if (segmentIndex < 0 || segmentIndex >= segments.length) return el;
    const seg = segments[segmentIndex]!;
    let text = fallbackText ?? "";
    if (!text && "bind" in seg) {
      const v = doc.variables.find((item) => item.key === seg.bind);
      const defaultVal = v && "default" in v && typeof v.default === "string" ? v.default : "";
      text =
        defaultVal ||
        (typeof seg.fallback === "string" ? seg.fallback : "") ||
        "";
    }
    segments[segmentIndex] = { text: text || " " };
    return { ...el, content: { segments } };
  });
}


// ----------------------------------------------------------------------- groups

/** Finds all elements belonging to a specific group in the document. */
export function findGroupElements(doc: CanonicalDocument, groupId: string): Element[] {
  const results: Element[] = [];
  for (const section of doc.sections) {
    for (const el of section.elements) {
      if (el.groupId === groupId) results.push(el);
    }
  }
  return results;
}

/**
 * Groups multiple elements within the same section under a single group ID.
 * Returns the modified document and the created groupId, or unchanged if invalid.
 */
export function groupElements(
  doc: CanonicalDocument,
  ids: readonly string[],
  groupName?: string,
): { document: CanonicalDocument; groupId: string | null } {
  if (ids.length < 2) return { document: doc, groupId: null };

  const firstLoc = findElement(doc, ids[0]!);
  if (!firstLoc) return { document: doc, groupId: null };
  const sectionId = firstLoc.section.id;

  // Verify all specified elements reside within the SAME section
  const validIds: string[] = [];
  for (const id of ids) {
    const loc = findElement(doc, id);
    if (loc && loc.section.id === sectionId) {
      validIds.push(id);
    }
  }
  if (validIds.length < 2) return { document: doc, groupId: null };

  const used = collectIds(doc);
  for (const sec of doc.sections) {
    for (const el of sec.elements) {
      if (el.groupId) used.add(el.groupId);
    }
  }

  const groupId = generateId(used, "grp");
  const name = groupName?.trim() || "Grup";
  const targetIds = new Set(validIds);

  const nextDoc = mapSection(doc, sectionId, (section) => {
    // Keep grouped elements contiguous in the layer stack (at the highest layer position)
    const groupedElements = section.elements
      .filter((el) => targetIds.has(el.id))
      .map((el) => ({ ...el, groupId, groupName: name }));

    const result: Element[] = [];
    let inserted = false;
    for (let i = 0; i < section.elements.length; i++) {
      const el = section.elements[i]!;
      if (targetIds.has(el.id)) {
        if (!inserted) {
          result.push(...groupedElements);
          inserted = true;
        }
      } else {
        result.push(el);
      }
    }
    return { ...section, elements: result };
  });

  return { document: nextDoc, groupId };
}

/**
 * Ungroups elements: removes groupId and groupName from specified elements or groupId.
 */
export function ungroupElements(
  doc: CanonicalDocument,
  idsOrGroupId: readonly string[] | string,
): CanonicalDocument {
  const targetGroupIds = new Set<string>();
  const targetElementIds = new Set<string>();

  if (typeof idsOrGroupId === "string") {
    targetGroupIds.add(idsOrGroupId);
  } else {
    for (const id of idsOrGroupId) {
      targetElementIds.add(id);
      const loc = findElement(doc, id);
      if (loc?.element.groupId) {
        targetGroupIds.add(loc.element.groupId);
      }
    }
  }

  if (targetGroupIds.size === 0 && targetElementIds.size === 0) return doc;

  let changedAny = false;
  const sections = doc.sections.map((section) => {
    let changed = false;
    const elements = section.elements.map((el) => {
      if ((el.groupId && targetGroupIds.has(el.groupId)) || targetElementIds.has(el.id)) {
        if (el.groupId !== undefined || el.groupName !== undefined) {
          changed = true;
          const { groupId: _g, groupName: _gn, ...rest } = el;
          void _g;
          void _gn;
          return rest as Element;
        }
      }
      return el;
    });
    if (!changed) return section;
    changedAny = true;
    return { ...section, elements };
  });

  return changedAny ? withSections(doc, sections) : doc;
}

/** Renames a group across all member elements. */
export function renameGroup(
  doc: CanonicalDocument,
  groupId: string,
  name: string,
): CanonicalDocument {
  const trimmed = name.trim().slice(0, 120) || "Grup";
  let changedAny = false;
  const sections = doc.sections.map((section) => {
    let changed = false;
    const elements = section.elements.map((el) => {
      if (el.groupId === groupId && el.groupName !== trimmed) {
        changed = true;
        return { ...el, groupName: trimmed };
      }
      return el;
    });
    if (!changed) return section;
    changedAny = true;
    return { ...section, elements };
  });
  return changedAny ? withSections(doc, sections) : doc;
}

/**
 * Updates animations synchronously across all members of a group.
 * Satisfies: "ketika di-group kelompok tersebut bisa memiliki contohnya satu animasi yang sama"
 */
export function updateGroupAnimation(
  doc: CanonicalDocument,
  groupId: string,
  update:
    | Element["animations"]
    | undefined
    | ((current?: Element["animations"]) => Element["animations"] | undefined),
): CanonicalDocument {
  const fn = typeof update === "function" ? update : () => update;
  let changedAny = false;
  const sections = doc.sections.map((section) => {
    let changed = false;
    const elements = section.elements.map((el) => {
      if (el.groupId === groupId) {
        const nextAnim = fn(el.animations);
        changed = true;
        return { ...el, animations: nextAnim };
      }
      return el;
    });
    if (!changed) return section;
    changedAny = true;
    return { ...section, elements };
  });
  return changedAny ? withSections(doc, sections) : doc;
}

/** Updates style (e.g. opacity, shadow) across all members of a group. */
export function updateGroupStyle(
  doc: CanonicalDocument,
  groupId: string,
  patch: Record<string, unknown>,
): CanonicalDocument {
  let changedAny = false;
  const sections = doc.sections.map((section) => {
    let changed = false;
    const elements = section.elements.map((el) => {
      if (el.groupId === groupId) {
        changed = true;
        return {
          ...el,
          style: { ...el.style, ...patch },
        } as Element;
      }
      return el;
    });
    if (!changed) return section;
    changedAny = true;
    return { ...section, elements };
  });
  return changedAny ? withSections(doc, sections) : doc;
}
