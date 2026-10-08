"use client";

/**
 * Konva interaction surface for ONE section (editor only - the public
 * renderer is HTML/DOM, P-04). One Stage per section keeps every canvas well
 * below browser canvas-size limits even at 200% zoom.
 *
 * PERFORMANCE RULE: drag/resize/rotate mutate Konva nodes only. The committed
 * document is touched once, at pointer end (`commitFrames`). Nothing here is
 * serialized or posted while the pointer moves.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  CANONICAL_BASE_WIDTH,
  type Element,
  type Frame,
  type Section,
  type ThemeTokens,
  type VariableDefinition,
} from "@/lib/schema";
import { resolveColor, resolveFontFamily, textPreview } from "../core/display";
import { findElement } from "../core/ops";
import { frameFromNodeAttrs, nodeAttrsFromFrame, round2, snapToSection } from "../core/geometry";
import { ImageVisual, WidgetVisual } from "./canvas-visuals";
import { konvaShadowProps } from "../core/shadow";
import { estimateWidgetContentHeight } from "@/features/widgets";
import { useEditor, useEditorStore } from "./EditorProvider";
import {
  replayKonvaMotion,
  replayKonvaNode,
  sampleMotionPathPoints,
  startKonvaLoopAnimation,
} from "@/features/animations";
import { ensureFontLoaded, onFontLoaded } from "@/lib/fonts";
import { ContextMenu } from "./ContextMenu";

const ACCENT = "#e85d8f";
const MIN_BOX = 8;

interface ElementNodeProps {
  readonly element: Element;
  readonly tokens: ThemeTokens;
  readonly draggable: boolean;
  readonly selected: boolean;
  readonly handlers: ElementHandlers;
  readonly fontRev: number;
  readonly isMotionTarget?: boolean;
  readonly isOutsideSection?: boolean;
  readonly zoom?: number;
  readonly variables?: readonly VariableDefinition[];
}

interface ElementHandlers {
  onPointerDown(id: string, e: KonvaEventObject<MouseEvent | TouchEvent>): void;
  onClick(id: string, e: KonvaEventObject<MouseEvent | TouchEvent>): void;
  onContextMenu(id: string, e: KonvaEventObject<PointerEvent | MouseEvent>): void;
  onDragStart(id: string, e: KonvaEventObject<DragEvent>): void;
  onDragMove(id: string, e: KonvaEventObject<DragEvent>): void;
  onDragEnd(id: string, e: KonvaEventObject<DragEvent>): void;
}

function styleOpacity(element: Element): number {
  const opacity = (element.style as { opacity?: number }).opacity;
  return opacity ?? 1;
}

function Visual({
  element,
  tokens,
  fontRev,
  variables,
}: {
  element: Element;
  tokens: ThemeTokens;
  fontRev: number;
  variables?: readonly VariableDefinition[];
}) {
  const { w, h } = element.frame;
  switch (element.type) {
    case "text": {
      const s = element.style;
      return (
        <Text
          key={`txt-${element.id}-${fontRev}`}
          width={w}
          height={h}
          text={textPreview(element, variables)}
          fontFamily={resolveFontFamily(s.fontFamily, tokens)}
          fontSize={s.fontSize}
          fontStyle={String(s.fontWeight)}
          lineHeight={s.lineHeight}
          letterSpacing={s.letterSpacing}
          align={s.textAlign}
          fill={resolveColor(s.color, tokens)}
          wrap="word"
          listening={false}
          {...konvaShadowProps(s.shadow, tokens)}
        />
      );
    }
    case "shape": {
      const s = element.style;
      const stroke = s.stroke ? resolveColor(s.stroke.color, tokens) : undefined;
      const fill = s.fill ? resolveColor(s.fill, tokens) : undefined;
      const shadowProps = konvaShadowProps(s.shadow, tokens);
      if (element.shapeType === "circle") {
        return (
          <Ellipse
            x={w / 2}
            y={h / 2}
            radiusX={w / 2}
            radiusY={h / 2}
            {...(fill && { fill })}
            {...(stroke && { stroke, strokeWidth: s.stroke!.width })}
            {...shadowProps}
            listening={false}
          />
        );
      }
      if (element.shapeType === "line") {
        return (
          <Line
            points={[0, h / 2, w, h / 2]}
            stroke={stroke ?? "#000000"}
            strokeWidth={s.stroke?.width ?? 1}
            lineCap="round"
            {...shadowProps}
            listening={false}
          />
        );
      }
      return (
        <Rect
          width={w}
          height={h}
          cornerRadius={Math.min(s.radius, w / 2, h / 2)}
          {...(fill && { fill })}
          {...(stroke && { stroke, strokeWidth: s.stroke!.width })}
          {...shadowProps}
          listening={false}
        />
      );
    }
    case "image":
      return <ImageVisual element={element} tokens={tokens} />;
    case "widget": {
      const s = element.style;
      const shadowProps = konvaShadowProps(s.shadow, tokens);
      return (
        <Group listening={false}>
          {s.shadow && (
            <Rect
              width={w}
              height={h}
              cornerRadius={typeof s.radius === "number" ? s.radius : 10}
              fill={s.background ? resolveColor(s.background, tokens) : "rgba(255,255,255,0.01)"}
              {...shadowProps}
            />
          )}
          <WidgetVisual element={element} tokens={tokens} />
        </Group>
      );
    }
  }
}

const ElementNode = memo(function ElementNode({
  element,
  tokens,
  draggable,
  selected,
  handlers,
  fontRev,
  isMotionTarget = false,
  isOutsideSection = false,
  zoom = 1,
  variables,
}: ElementNodeProps) {
  const attrs = nodeAttrsFromFrame(element.frame);
  const { w, h } = element.frame;
  const innerRef = useRef<Konva.Group | null>(null);

  // Continuous live loop animation in the canvas editor (float, pulse, sway, etc.)
  const loopTrack =
    element.animations?.attention ??
    (element.animations?.enter?.repeat === -1 ? element.animations.enter : undefined);

  useEffect(() => {
    if (!loopTrack || !innerRef.current) return;
    const cleanup = startKonvaLoopAnimation(innerRef.current, loopTrack);
    return cleanup;
  }, [loopTrack]);

  const effectiveOpacity = isMotionTarget && isOutsideSection
    ? styleOpacity(element) * 0.72
    : styleOpacity(element);

  return (
    <Group
      id={element.id}
      name="element"
      {...attrs}
      opacity={effectiveOpacity}
      draggable={draggable}
      onMouseDown={(e) => handlers.onPointerDown(element.id, e)}
      onTouchStart={(e) => handlers.onPointerDown(element.id, e)}
      onClick={(e) => handlers.onClick(element.id, e)}
      onTap={(e) => handlers.onClick(element.id, e)}
      onContextMenu={(e) => handlers.onContextMenu(element.id, e)}
      onDragStart={(e) => handlers.onDragStart(element.id, e)}
      onDragMove={(e) => handlers.onDragMove(element.id, e)}
      onDragEnd={(e) => handlers.onDragEnd(element.id, e)}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = draggable ? "move" : "default";
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = "default";
      }}
    >
      {/* Invisible hit area so thin or text-only elements are easy to grab. */}
      <Rect width={w} height={h} fill="rgba(0,0,0,0)" />
      <Group ref={innerRef} x={w / 2} y={h / 2} offsetX={w / 2} offsetY={h / 2}>
        <Visual element={element} tokens={tokens} fontRev={fontRev} variables={variables} />
      </Group>

      {/* Off-canvas styling indicator when motion target is placed outside frame */}
      {isMotionTarget && isOutsideSection && (
        <Group listening={false}>
          <Rect
            width={w}
            height={h}
            stroke="#f59e0b"
            strokeWidth={2 / zoom}
            dash={[5 / zoom, 3 / zoom]}
            strokeScaleEnabled={false}
            fill="rgba(245, 158, 11, 0.08)"
          />
          <Group x={Math.max(0, (w - 110) / 2)} y={-22 / zoom}>
            <Rect
              width={110}
              height={18 / zoom}
              fill="#f59e0b"
              cornerRadius={4 / zoom}
              shadowColor="#000"
              shadowBlur={4}
              shadowOpacity={0.25}
            />
            <Text
              width={110}
              text="✦ Di Luar Layar"
              fontSize={10 / zoom}
              fill="#ffffff"
              fontStyle="bold"
              align="center"
              y={3 / zoom}
            />
          </Group>
        </Group>
      )}

      {selected && element.locked ? (
        <Rect
          width={w}
          height={h}
          stroke={ACCENT}
          strokeWidth={1}
          dash={[4, 3]}
          strokeScaleEnabled={false}
          listening={false}
        />
      ) : null}
      {selected && element.type === "widget" && (() => {
        const estH = estimateWidgetContentHeight(element);
        if (estH <= h + 6) return null;
        return (
          <Group listening={false}>
            <Rect
              x={0}
              y={h}
              width={w}
              height={estH - h}
              stroke="#e11d48"
              strokeWidth={1.5}
              dash={[5, 4]}
              fill="rgba(225, 29, 72, 0.05)"
              strokeScaleEnabled={false}
            />
            <Line
              points={[0, estH, w, estH]}
              stroke="#e11d48"
              strokeWidth={2}
              strokeScaleEnabled={false}
            />
            <Group x={Math.max(0, (w - 110) / 2)} y={estH + 4}>
              <Rect
                width={110}
                height={18}
                fill="#e11d48"
                cornerRadius={4}
                shadowColor="#000"
                shadowBlur={4}
                shadowOpacity={0.2}
              />
              <Text
                width={110}
                text={`Konten ~${Math.round(estH)}px`}
                fontSize={10}
                fill="#ffffff"
                fontStyle="bold"
                align="center"
                y={4}
              />
            </Group>
          </Group>
        );
      })()}
    </Group>
  );
});

export interface SectionCanvasProps {
  readonly sectionId: string;
}

export default function SectionCanvas({ sectionId }: SectionCanvasProps) {
  const store = useEditorStore();
  const theme = useEditor((s) => s.theme);
  const section: Section | undefined = useEditor((s) =>
    s.history.present.sections.find((x) => x.id === sectionId),
  );
  const tokens = useEditor((s) => s.history.present.design.tokens);
  const docBackground = useEditor((s) => s.history.present.design.background);
  const variables = useEditor((s) => s.history.present.variables);
  const zoom = useEditor((s) => s.zoom);
  const selectedIds = useEditor((s) => s.selectedIds);
  const readOnly = useEditor((s) => s.readOnly);
  const panMode = useEditor((s) => s.panMode);
  const editingMotion = useEditor((s) => s.editingMotion);
  const isEditingThisMotion = editingMotion?.sectionId === sectionId;
  const isEditingAnyMotion = Boolean(editingMotion);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const motionGroupRef = useRef<Konva.Group | null>(null);
  const vGuideRef = useRef<Konva.Line | null>(null);
  const hGuideRef = useRef<Konva.Line | null>(null);
  const dragRef = useRef<{ moved: boolean; origins: Map<string, { x: number; y: number }> }>({
    moved: false,
    origins: new Map(),
  });

  const elements = section?.elements;
  const baseHeight = section?.baseHeight ?? 0;

  const [fontRev, setFontRev] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    elementId?: string;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    canvasX: 0,
    canvasY: 0,
  });

  // Re-draw when web fonts finish loading so text metrics and font glyphs update immediately.
  useEffect(() => {
    const unsubscribe = onFontLoaded(() => {
      setFontRev((r) => r + 1);
      stageRef.current?.batchDraw();
    });
    return unsubscribe;
  }, []);

  // Ensure all fonts used by text elements in this section are loaded.
  useEffect(() => {
    if (!elements) return;
    for (const el of elements) {
      if (el.type === "text") {
        const family =
          typeof el.style.fontFamily === "string"
            ? el.style.fontFamily
            : typeof el.style.fontFamily === "object"
              ? tokens.fonts[el.style.fontFamily.token]
              : undefined;
        if (family) {
          void ensureFontLoaded(family);
        }
      } else if (el.type === "widget" && el.props) {
        const p = el.props as Record<string, unknown>;
        if (typeof p.nameFont === "string" && p.nameFont) {
          void ensureFontLoaded(p.nameFont);
        }
        if (typeof p.bodyFont === "string" && p.bodyFont) {
          void ensureFontLoaded(p.bodyFont);
        }
      }
    }
  }, [elements, tokens]);

  const selectedHere = useMemo(
    () => selectedIds.filter((id) => elements?.some((e) => e.id === id)),
    [selectedIds, elements],
  );
  const transformableKey = useMemo(
    () =>
      readOnly || panMode || isEditingAnyMotion
        ? ""
        : selectedHere
            .filter((id) => {
              const el = elements?.find((e) => e.id === id);
              return el && el.visible && !el.locked;
            })
            .join(","),
    [selectedHere, elements, readOnly, panMode, isEditingAnyMotion],
  );

  const motionElement = useMemo(() => {
    if (!section) return null;
    if (isEditingThisMotion && editingMotion) {
      return section.elements.find((x) => x.id === editingMotion.elementId) ?? null;
    }
    if (selectedHere.length === 1) {
      const el = section.elements.find((x) => x.id === selectedHere[0]);
      if (el?.animations?.motion?.enabled) return el;
    }
    return null;
  }, [section, isEditingThisMotion, editingMotion, selectedHere]);

  const motionGuidePoints = useMemo(() => {
    if (!motionElement?.animations?.motion?.enabled) return [];
    const samples = sampleMotionPathPoints(motionElement.animations.motion, 40);
    const flat: number[] = [];
    for (const s of samples) {
      flat.push(s.x, s.y);
    }
    return flat;
  }, [motionElement]);

  const bleedX = useMemo(() => {
    if (!isEditingThisMotion || !motionElement) return 0;
    let maxExt = 600;
    const ocx = motionElement.frame.x + motionElement.frame.w / 2;
    if (motionElement.frame.x < 0) maxExt = Math.max(maxExt, Math.abs(motionElement.frame.x) + 250);
    if (motionElement.frame.x + motionElement.frame.w > CANONICAL_BASE_WIDTH) {
      maxExt = Math.max(maxExt, motionElement.frame.x + motionElement.frame.w - CANONICAL_BASE_WIDTH + 250);
    }
    const pts = motionElement.animations?.motion?.points ?? [];
    for (const pt of pts) {
      const px = ocx + pt.x;
      if (px < 0) maxExt = Math.max(maxExt, Math.abs(px) + 250);
      if (px > CANONICAL_BASE_WIDTH) maxExt = Math.max(maxExt, px - CANONICAL_BASE_WIDTH + 250);
    }
    return Math.ceil(maxExt);
  }, [isEditingThisMotion, motionElement]);

  const bleedY = useMemo(() => {
    if (!isEditingThisMotion || !motionElement) return 0;
    let maxExt = 500;
    const ocy = motionElement.frame.y + motionElement.frame.h / 2;
    if (motionElement.frame.y < 0) maxExt = Math.max(maxExt, Math.abs(motionElement.frame.y) + 250);
    if (motionElement.frame.y + motionElement.frame.h > baseHeight) {
      maxExt = Math.max(maxExt, motionElement.frame.y + motionElement.frame.h - baseHeight + 250);
    }
    const pts = motionElement.animations?.motion?.points ?? [];
    for (const pt of pts) {
      const py = ocy + pt.y;
      if (py < 0) maxExt = Math.max(maxExt, Math.abs(py) + 250);
      if (py > baseHeight) maxExt = Math.max(maxExt, py - baseHeight + 250);
    }
    return Math.ceil(maxExt);
  }, [isEditingThisMotion, motionElement, baseHeight]);

  // Attach the transformer to the selected, manipulable nodes.
  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const nodes = transformableKey
      ? transformableKey
          .split(",")
          .map((id) => stage.findOne(`#${id}`))
          .filter((n): n is Konva.Node => Boolean(n))
      : [];
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [transformableKey, elements, zoom]);

  const hideGuides = useCallback(() => {
    vGuideRef.current?.visible(false);
    hGuideRef.current?.visible(false);
    vGuideRef.current?.getLayer()?.batchDraw();
  }, []);

  const showGuides = useCallback(
    (vertical: number | undefined, horizontal: number | undefined) => {
      const v = vGuideRef.current;
      const h = hGuideRef.current;
      if (v) {
        if (vertical === undefined) v.visible(false);
        else {
          v.points([vertical, 0, vertical, baseHeight]);
          v.visible(true);
        }
      }
      if (h) {
        if (horizontal === undefined) h.visible(false);
        else {
          h.points([0, horizontal, CANONICAL_BASE_WIDTH, horizontal]);
          h.visible(true);
        }
      }
      v?.getLayer()?.batchDraw();
    },
    [baseHeight],
  );

  /** Reads final frames from Konva nodes, commits them once, then re-syncs the nodes. */
  const commitNodes = useCallback(
    (nodes: readonly Konva.Node[]) => {
      const frames: Record<string, Frame> = {};
      for (const node of nodes) {
        frames[node.id()] = frameFromNodeAttrs({
          x: node.x(),
          y: node.y(),
          width: node.width(),
          height: node.height(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
      }
      store.getState().commitFrames(frames);
      const doc = store.getState().history.present;
      for (const node of nodes) {
        const loc = findElement(doc, node.id());
        if (loc) node.setAttrs({ ...nodeAttrsFromFrame(loc.element.frame), scaleX: 1, scaleY: 1 });
      }
      nodes[0]?.getLayer()?.batchDraw();
    },
    [store],
  );

  const handlers = useMemo<ElementHandlers>(
    () => ({
      onPointerDown(id, e) {
        if (store.getState().panMode) return;
        const motion = store.getState().editingMotion;
        if (motion && id !== motion.elementId) {
          e.cancelBubble = true;
          return;
        }
        e.cancelBubble = true;
        dragRef.current.moved = false;
        const evt = e.evt;
        const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
        const state = store.getState();
        const doc = state.history.present;
        const loc = findElement(doc, id);
        const element = loc?.element;

        if (loc && element?.groupId && !evt.altKey) {
          const groupMemberIds = loc.section.elements
            .filter((el) => el.groupId === element.groupId)
            .map((el) => el.id);

          const groupAlreadySelected =
            groupMemberIds.length > 1 &&
            groupMemberIds.every((gid) => state.selectedIds.includes(gid));

          // If the whole group is already selected, clicking an element directly selects it for individual editing
          if (groupAlreadySelected && !additive) {
            state.selectElements([id]);
            return;
          }

          if (additive && !motion) {
            const allSelected = groupMemberIds.every((gid) => state.selectedIds.includes(gid));
            if (allSelected) {
              state.selectElements(state.selectedIds.filter((sid) => !groupMemberIds.includes(sid)));
            } else {
              state.selectElements([...new Set([...state.selectedIds, ...groupMemberIds])]);
            }
          } else if (!state.selectedIds.includes(id)) {
            state.selectElements(groupMemberIds);
          }
          return;
        }

        if (additive && !motion) state.toggleElement(id);
        else if (!state.selectedIds.includes(id)) state.selectElements([id]);
      },
      onClick(id, e) {
        if (store.getState().panMode) return;
        const motion = store.getState().editingMotion;
        if (motion && id !== motion.elementId) {
          e.cancelBubble = true;
          return;
        }
        const evt = e.evt;
        const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
        if (!additive && !dragRef.current.moved && store.getState().selectedIds.length > 1) {
          const loc = findElement(store.getState().history.present, id);
          if (loc?.element.groupId) {
            // If already selecting the group and clicked without dragging, leave group selected
            return;
          }
          store.getState().selectElements([id]);
        }
      },
      onContextMenu(id, e) {
        if (store.getState().panMode) return;
        const motion = store.getState().editingMotion;
        if (motion) {
          e.cancelBubble = true;
          e.evt.preventDefault();
          return;
        }
        e.cancelBubble = true;
        e.evt.preventDefault();
        const state = store.getState();
        if (!state.selectedIds.includes(id)) {
          const loc = findElement(state.history.present, id);
          if (loc && loc.element.groupId) {
            const groupMemberIds = loc.section.elements
              .filter((el) => el.groupId === loc.element.groupId)
              .map((el) => el.id);
            state.selectElements(groupMemberIds);
          } else {
            state.selectElements([id]);
          }
        }
        const stage = stageRef.current;
        const pointerPos = stage?.getPointerPosition();
        const canvasX = pointerPos ? round2((pointerPos.x / zoom) - bleedX) : 0;
        const canvasY = pointerPos ? round2((pointerPos.y / zoom) - bleedY) : 0;
        setContextMenu({
          isOpen: true,
          x: e.evt.clientX,
          y: e.evt.clientY,
          canvasX,
          canvasY,
          elementId: id,
        });
      },
      onDragStart(id) {
        if (store.getState().panMode) return;
        const motion = store.getState().editingMotion;
        if (motion && id !== motion.elementId) return;
        const stage = stageRef.current;
        if (!stage) return;
        const state = store.getState();
        if (!state.selectedIds.includes(id)) state.selectElements([id]);
        const origins = new Map<string, { x: number; y: number }>();
        for (const selectedId of store.getState().selectedIds) {
          const node = stage.findOne(`#${selectedId}`);
          if (node) origins.set(selectedId, { x: node.x(), y: node.y() });
        }
        dragRef.current = { moved: false, origins };
      },
      onDragMove(id, e) {
        if (store.getState().panMode) return;
        const motion = store.getState().editingMotion;
        if (motion && id !== motion.elementId) return;
        const stage = stageRef.current;
        const node = e.target;
        const drag = dragRef.current;
        drag.moved = true;
        if (!stage) return;
        const origin = drag.origins.get(id);

        if (drag.origins.size > 1 && origin) {
          const dx = node.x() - origin.x;
          const dy = node.y() - origin.y;
          for (const [otherId, start] of drag.origins) {
            if (otherId === id) continue;
            stage.findOne(`#${otherId}`)?.position({ x: start.x + dx, y: start.y + dy });
          }
          return;
        }

        // Single element: snap to section edges/center unless Alt is held (FR-EDT-005, P1).
        if (e.evt.altKey || !section) return hideGuides();
        const frame = frameFromNodeAttrs({
          x: node.x(),
          y: node.y(),
          width: node.width(),
          height: node.height(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
        const snap = snapToSection(frame, {
          width: CANONICAL_BASE_WIDTH,
          height: section.baseHeight,
        });
        if (snap.dx !== 0 || snap.dy !== 0) {
          node.position({ x: node.x() + snap.dx, y: node.y() + snap.dy });
        }
        showGuides(snap.guides.vertical[0], snap.guides.horizontal[0]);

        if (motion && id === motion.elementId) {
          const isNodeOutside =
            node.x() + node.width() / 2 < 0 ||
            node.x() + node.width() / 2 > CANONICAL_BASE_WIDTH ||
            node.y() + node.height() / 2 < 0 ||
            node.y() + node.height() / 2 > baseHeight;
          const targetEl = section?.elements.find((x) => x.id === id);
          const baseOp = targetEl ? styleOpacity(targetEl) : 1;
          node.opacity(isNodeOutside ? baseOp * 0.72 : baseOp);

          if (motionGroupRef.current) {
            motionGroupRef.current.position({
              x: node.x() + node.width() / 2,
              y: node.y() + node.height() / 2,
            });
            motionGroupRef.current.getLayer()?.batchDraw();
          }
        }
      },
      onDragEnd() {
        const stage = stageRef.current;
        if (!stage) return;
        hideGuides();
        const nodes = [...dragRef.current.origins.keys()]
          .map((id) => stage.findOne(`#${id}`))
          .filter((n): n is Konva.Node => Boolean(n));
        if (nodes.length > 0) commitNodes(nodes);
        // `click` fires after dragend; keep `moved` until then, reset on next drag start.
      },
    }),
    [store, section, hideGuides, showGuides, commitNodes, bleedX, bleedY, zoom],
  );

  useEffect(() => {
    const handleReplay = (e: Event) => {
      const custom = e as CustomEvent<{
        elementId?: string;
        sectionId?: string;
        trackType?: "enter" | "exit" | "attention" | "motion";
      }>;
      if (custom.detail?.sectionId && custom.detail.sectionId !== sectionId) return;
      const stage = stageRef.current;
      if (!stage || !section) return;

      const trackType = custom.detail?.trackType;

      if (custom.detail?.elementId) {
        const node = stage.findOne(`#${custom.detail.elementId}`);
        const el = section.elements.find((x) => x.id === custom.detail.elementId);
        const anims = el?.animations;
        if (node && (trackType === "motion" || !trackType) && anims?.motion?.enabled) {
          replayKonvaMotion(node, anims.motion);
          return;
        }
        const track =
          (trackType && anims?.[trackType as "enter" | "exit" | "attention"]) ||
          anims?.enter ||
          anims?.attention ||
          anims?.exit;
        if (node && track) {
          replayKonvaNode(node, track);
        }
      } else if (custom.detail?.sectionId === sectionId) {
        for (const el of section.elements) {
          const anims = el.animations;
          const node = stage.findOne(`#${el.id}`);
          if (!node) continue;
          if ((trackType === "motion" || !trackType) && anims?.motion?.enabled) {
            replayKonvaMotion(node, anims.motion);
          } else {
            const track =
              (trackType && anims?.[trackType as "enter" | "exit" | "attention"]) ||
              anims?.enter ||
              anims?.attention ||
              anims?.exit;
            if (track) {
              replayKonvaNode(node, track);
            }
          }
        }
      }
    };

    window.addEventListener("dib:replay-animation", handleReplay);
    return () => window.removeEventListener("dib:replay-animation", handleReplay);
  }, [section, sectionId]);



  if (!section) return null;

  const screenBg = resolveColor(docBackground?.color, tokens, "#ffffff");
  const sectionBg = section.background.color
    ? resolveColor(section.background.color, tokens, undefined)
    : undefined;
  const background = sectionBg ?? screenBg;

  return (
    <>
      <div
        style={{
          position: isEditingThisMotion ? "absolute" : "relative",
          left: isEditingThisMotion ? -bleedX * zoom : 0,
          top: isEditingThisMotion ? -bleedY * zoom : 0,
          width: (CANONICAL_BASE_WIDTH + (isEditingThisMotion ? bleedX * 2 : 0)) * zoom,
          height: (section.baseHeight + (isEditingThisMotion ? bleedY * 2 : 0)) * zoom,
          pointerEvents: "auto",
        }}
      >
        <Stage
          ref={stageRef}
          width={(CANONICAL_BASE_WIDTH + (isEditingThisMotion ? bleedX * 2 : 0)) * zoom}
          height={(section.baseHeight + (isEditingThisMotion ? bleedY * 2 : 0)) * zoom}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={(e) => {
            if (store.getState().editingMotion) return;
            const target = e.target;
            if (target === target.getStage() || target.name() === "bg") {
              if (store.getState().panMode) return;
              const state = store.getState();
              state.clearSelection();
              state.setActiveSection(sectionId);
            }
          }}
          onTouchStart={(e) => {
            if (store.getState().editingMotion) return;
            const target = e.target;
            if (target === target.getStage() || target.name() === "bg") {
              store.getState().clearSelection();
              store.getState().setActiveSection(sectionId);
            }
          }}
          onContextMenu={(e) => {
            if (store.getState().panMode || store.getState().editingMotion) return;
            e.evt.preventDefault();
            const target = e.target;
            if (target === target.getStage() || target.name() === "bg") {
              const state = store.getState();
              state.clearSelection();
              state.setActiveSection(sectionId);
              const stage = stageRef.current;
              const pointerPos = stage?.getPointerPosition();
              const canvasX = pointerPos ? round2((pointerPos.x / zoom) - bleedX) : 0;
              const canvasY = pointerPos ? round2((pointerPos.y / zoom) - bleedY) : 0;
              setContextMenu({
                isOpen: true,
                x: e.evt.clientX,
                y: e.evt.clientY,
                canvasX,
                canvasY,
                elementId: undefined,
              });
            }
          }}
        >
          <Layer opacity={section.visible ? 1 : 0.4} x={bleedX} y={bleedY}>
            {/* Dimmed workspace backdrop covering the off-screen bleed area in motion mode */}
            {isEditingThisMotion && (
              <Group listening={false}>
                <Rect
                  x={-bleedX}
                  y={-bleedY}
                  width={CANONICAL_BASE_WIDTH + bleedX * 2}
                  height={section.baseHeight + bleedY * 2}
                  fill={theme === "dark" ? "#07080b" : "#f1f5f9"}
                  opacity={0.88}
                />
                <Text
                  x={-bleedX + 16}
                  y={-bleedY + 16}
                  text="✦ WORKSPACE OFF-SCREEN (Motion Path Canvas)"
                  fontSize={11 / zoom}
                  fill={theme === "dark" ? "#94a3b8" : "#64748b"}
                  fontStyle="bold"
                />
                <Text
                  x={-bleedX + 16}
                  y={-bleedY + 34}
                  text="Objek & Waypoint di luar batas frame tetap terlihat dan dapat digeser bebas"
                  fontSize={10 / zoom}
                  fill={theme === "dark" ? "#64748b" : "#94a3b8"}
                />
              </Group>
            )}
            <Rect
              name="bg"
              x={0}
              y={0}
              width={CANONICAL_BASE_WIDTH}
              height={section.baseHeight}
              fill={background}
              shadowColor="rgba(0, 0, 0, 0.35)"
              shadowBlur={isEditingThisMotion ? 20 : 0}
              shadowOffset={{ x: 0, y: isEditingThisMotion ? 4 : 0 }}
              shadowOpacity={isEditingThisMotion ? 0.25 : 0}
            />
            {/* Clear luminous boundary frame around the active section */}
            {isEditingThisMotion && (
              <Group listening={false}>
                <Rect
                  x={0}
                  y={0}
                  width={CANONICAL_BASE_WIDTH}
                  height={section.baseHeight}
                  stroke="#6366f1"
                  strokeWidth={2 / zoom}
                  dash={[8 / zoom, 6 / zoom]}
                />
                <Text
                  x={6 / zoom}
                  y={-18 / zoom}
                  text={`📱 FRAME SECTION (${CANONICAL_BASE_WIDTH} × ${section.baseHeight})`}
                  fontSize={10.5 / zoom}
                  fill="#6366f1"
                  fontStyle="bold"
                />
              </Group>
            )}
            {section.elements
              .filter((el) => el.visible)
              .map((el) => {
                const isTarget = isEditingThisMotion && el.id === editingMotion?.elementId;
                const canDrag = !readOnly && !panMode && !el.locked && (!isEditingAnyMotion || isTarget);
                const isOutsideSection =
                  el.frame.x + el.frame.w / 2 < 0 ||
                  el.frame.x + el.frame.w / 2 > CANONICAL_BASE_WIDTH ||
                  el.frame.y + el.frame.h / 2 < 0 ||
                  el.frame.y + el.frame.h / 2 > section.baseHeight;
                return (
                  <ElementNode
                    key={el.id}
                    element={el}
                    tokens={tokens}
                    draggable={canDrag}
                    selected={isTarget || (!isEditingAnyMotion && selectedHere.includes(el.id))}
                    handlers={handlers}
                    fontRev={fontRev}
                    isMotionTarget={isTarget}
                    isOutsideSection={isOutsideSection}
                    zoom={zoom}
                    variables={variables}
                  />
                );
              })}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              flipEnabled={false}
              keepRatio={false}
              rotationSnaps={[0, 45, 90, 135, 180, -135, -90, -45]}
              rotationSnapTolerance={4}
              borderStroke={ACCENT}
              anchorStroke={ACCENT}
              anchorFill="#ffffff"
              anchorSize={10}
              anchorCornerRadius={3}
              borderStrokeWidth={1.5}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < MIN_BOX || newBox.height < MIN_BOX ? oldBox : newBox
              }
              onTransformEnd={() => {
                const nodes = transformerRef.current?.nodes() ?? [];
                if (nodes.length > 0) commitNodes(nodes);
              }}
            />
          </Layer>
          <Layer listening={false} x={bleedX} y={bleedY}>
            <Line
              ref={vGuideRef}
              points={[0, 0, 0, 0]}
              stroke={ACCENT}
              strokeWidth={1 / zoom}
              dash={[4, 4]}
              visible={false}
            />
            <Line
              ref={hGuideRef}
              points={[0, 0, 0, 0]}
              stroke={ACCENT}
              strokeWidth={1 / zoom}
              dash={[4, 4]}
              visible={false}
            />
            {!isEditingThisMotion && motionElement?.animations?.motion?.enabled && motionGuidePoints.length >= 4 && (
              <Group
                x={motionElement.frame.x + motionElement.frame.w / 2}
                y={motionElement.frame.y + motionElement.frame.h / 2}
              >
                <Line
                  points={motionGuidePoints}
                  stroke="#6366f1"
                  strokeWidth={2 / zoom}
                  dash={[5 / zoom, 4 / zoom]}
                  opacity={0.85}
                />
                {motionElement.animations.motion.points.map((pt, idx, arr) => (
                  <Circle
                    key={idx}
                    x={pt.x}
                    y={pt.y}
                    radius={(idx === 0 || idx === arr.length - 1 ? 5 : 3.5) / zoom}
                    fill={idx === 0 ? "#10b981" : idx === arr.length - 1 ? "#ef4444" : "#818cf8"}
                    stroke="#ffffff"
                    strokeWidth={1.5 / zoom}
                  />
                ))}
              </Group>
            )}
          </Layer>

          {/* Interactive Motion Guide Layer for Adobe Animate / Flash style waypoint manipulation */}
          {isEditingThisMotion && motionElement?.animations?.motion?.enabled && motionGuidePoints.length >= 4 && (
            <Layer listening={true} x={bleedX} y={bleedY}>
              {/* Subtle focus overlay on canvas background */}
              <Rect
                x={0}
                y={0}
                width={CANONICAL_BASE_WIDTH}
                height={section.baseHeight}
                fill="rgba(15, 23, 42, 0.18)"
                listening={false}
              />
              <Group
                ref={motionGroupRef}
                x={motionElement.frame.x + motionElement.frame.w / 2}
                y={motionElement.frame.y + motionElement.frame.h / 2}
              >
                {/* Glow backing */}
                <Line
                  points={motionGuidePoints}
                  stroke="rgba(99, 102, 241, 0.35)"
                  strokeWidth={8 / zoom}
                  listening={false}
                />
                {/* Main dashed path */}
                <Line
                  points={motionGuidePoints}
                  stroke="#6366f1"
                  strokeWidth={3 / zoom}
                  dash={[6 / zoom, 4 / zoom]}
                  listening={false}
                />

                {/* Waypoint handles */}
                {motionElement.animations.motion.points.map((pt, idx, arr) => {
                  const isStart = idx === 0;
                  const isEnd = idx === arr.length - 1;
                  const objectCenterX = motionElement.frame.x + motionElement.frame.w / 2;
                  const objectCenterY = motionElement.frame.y + motionElement.frame.h / 2;
                  const absolutePtX = objectCenterX + pt.x;
                  const absolutePtY = objectCenterY + pt.y;
                  const isPtOutside =
                    absolutePtX < 0 ||
                    absolutePtX > CANONICAL_BASE_WIDTH ||
                    absolutePtY < 0 ||
                    absolutePtY > section.baseHeight;

                  if (isEnd) {
                    // Red dot (Finish): anchored at the center of the object (0, 0).
                    // It is NOT individually draggable and always stays locked at the object center.
                    // listening={false} ensures clicking or dragging on/near the center grabs and moves the object itself.
                    return (
                      <Group
                        key={`motion-drag-pt-${idx}`}
                        x={0}
                        y={0}
                        listening={false}
                      >
                        {/* Crosshair target lines at object center */}
                        <Line
                          points={[-11 / zoom, 0, 11 / zoom, 0]}
                          stroke="#ef4444"
                          strokeWidth={1.5 / zoom}
                        />
                        <Line
                          points={[0, -11 / zoom, 0, 11 / zoom]}
                          stroke="#ef4444"
                          strokeWidth={1.5 / zoom}
                        />

                        {/* Outer target dashed ring */}
                        <Circle
                          radius={13 / zoom}
                          fill="rgba(239, 68, 68, 0.22)"
                          stroke="#ef4444"
                          strokeWidth={1.5 / zoom}
                          dash={[3 / zoom, 3 / zoom]}
                        />

                        {/* Inner red bullseye circle */}
                        <Circle
                          radius={7.5 / zoom}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={1.5 / zoom}
                        />

                        {/* Center white dot */}
                        <Circle
                          radius={2.5 / zoom}
                          fill="#ffffff"
                        />

                        {/* If target object itself is outside the screen, show indicator */}
                        {isPtOutside && (
                          <Group x={16 / zoom} y={-10 / zoom}>
                            <Rect
                              width={94 / zoom}
                              height={16 / zoom}
                              fill="#ef4444"
                              cornerRadius={3 / zoom}
                            />
                            <Text
                              width={94 / zoom}
                              text="🎯 Akhir (Luar Layar)"
                              fontSize={8.5 / zoom}
                              fill="#ffffff"
                              fontStyle="bold"
                              align="center"
                              y={3 / zoom}
                            />
                          </Group>
                        )}
                      </Group>
                    );
                  }

                  // Color for start or intermediate waypoints:
                  // Distinct colors when outside vs inside frame ("warnanya agak sedikit berbeda jika yang di dalam layar dan yang di luar layar")
                  const pointColor = isStart
                    ? isPtOutside
                      ? "#f59e0b" // warm amber for start off-canvas
                      : "#10b981" // emerald green for start on-canvas
                    : isPtOutside
                      ? "#ec4899" // vibrant pink-rose for intermediate off-canvas
                      : "#6366f1"; // indigo for intermediate on-canvas

                  const labelText = isStart ? "1" : `${idx + 1}`;

                  return (
                    <Group
                      key={`motion-drag-pt-${idx}`}
                      x={pt.x}
                      y={pt.y}
                      draggable={true}
                      onMouseEnter={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "grab";
                      }}
                      onMouseLeave={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "default";
                      }}
                      onDragStart={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "grabbing";
                      }}
                      onDragMove={(e) => {
                        const nx = Math.round(e.target.x());
                        const ny = Math.round(e.target.y());
                        const targetId = motionElement.id;
                        store.getState().patchElement(
                          targetId,
                          (el) => {
                            if (!el.animations?.motion) return el;
                            const pts = [...el.animations.motion.points];
                            if (pts[idx]) {
                              pts[idx] = { x: nx, y: ny };
                            }
                            pts[pts.length - 1] = { x: 0, y: 0 };
                            return {
                              ...el,
                              animations: {
                                ...el.animations,
                                motion: {
                                  ...el.animations.motion,
                                  preset: "custom",
                                  points: pts,
                                },
                              },
                            };
                          },
                          "motion:drag",
                        );
                      }}
                      onDragEnd={(e) => {
                        const nx = Math.round(e.target.x());
                        const ny = Math.round(e.target.y());
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "grab";
                        const targetId = motionElement.id;
                        store.getState().patchElement(
                          targetId,
                          (el) => {
                            if (!el.animations?.motion) return el;
                            const pts = [...el.animations.motion.points];
                            if (pts[idx]) {
                              pts[idx] = { x: nx, y: ny };
                            }
                            pts[pts.length - 1] = { x: 0, y: 0 };
                            return {
                              ...el,
                              animations: {
                                ...el.animations,
                                motion: {
                                  ...el.animations.motion,
                                  preset: "custom",
                                  points: pts,
                                },
                              },
                            };
                          },
                        );
                      }}
                    >
                      {/* Invisible wide hit circle for easy grab */}
                      <Circle radius={20 / zoom} fill="transparent" />

                      {/* Outer glow / dash ring */}
                      <Circle
                        radius={(isPtOutside ? 15 : 12) / zoom}
                        fill={
                          isStart
                            ? isPtOutside
                              ? "rgba(245, 158, 11, 0.25)"
                              : "rgba(16, 185, 129, 0.28)"
                            : isPtOutside
                              ? "rgba(236, 72, 153, 0.25)"
                              : "rgba(99, 102, 241, 0.28)"
                        }
                        stroke={pointColor}
                        strokeWidth={isPtOutside ? 1.5 / zoom : 2 / zoom}
                        dash={isPtOutside ? [3 / zoom, 2 / zoom] : undefined}
                      />

                      {/* Inner solid circle */}
                      <Circle
                        radius={7.5 / zoom}
                        fill={pointColor}
                        stroke="#ffffff"
                        strokeWidth={1.5 / zoom}
                      />

                      {/* Waypoint number */}
                      <Text
                        text={labelText}
                        fontSize={8.5 / zoom}
                        fontStyle="bold"
                        fill="#ffffff"
                        align="center"
                        verticalAlign="middle"
                        offsetX={3 / zoom}
                        offsetY={4 / zoom}
                        listening={false}
                      />

                      {/* If waypoint is outside frame, show an explicit off-screen indicator badge */}
                      {isPtOutside && (
                        <Group x={12 / zoom} y={-10 / zoom} listening={false}>
                          <Rect
                            width={(isStart ? 105 : 90) / zoom}
                            height={16 / zoom}
                            fill={isStart ? "#f59e0b" : "#ec4899"}
                            cornerRadius={3 / zoom}
                            shadowColor="#000"
                            shadowBlur={3}
                            shadowOpacity={0.2}
                          />
                          <Text
                            width={(isStart ? 105 : 90) / zoom}
                            text={isStart ? "✦ Awal (Luar Layar)" : `✦ Titik ${idx + 1} (Luar)`}
                            fontSize={8.5 / zoom}
                            fill="#ffffff"
                            fontStyle="bold"
                            align="center"
                            y={3 / zoom}
                          />
                        </Group>
                      )}
                    </Group>
                  );
                })}
              </Group>
            </Layer>
          )}
        </Stage>
      </div>
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        canvasX={contextMenu.canvasX}
        canvasY={contextMenu.canvasY}
        sectionId={sectionId}
        elementId={contextMenu.elementId}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
