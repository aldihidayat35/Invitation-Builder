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
import { Ellipse, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  CANONICAL_BASE_WIDTH,
  type Element,
  type Frame,
  type Section,
  type ThemeTokens,
} from "@/lib/schema";
import { resolveColor, resolveFontFamily, textPreview } from "../core/display";
import { frameFromNodeAttrs, nodeAttrsFromFrame, round2, snapToSection } from "../core/geometry";
import { findElement } from "../core/ops";
import { ImageVisual, WidgetVisual } from "./canvas-visuals";
import { estimateWidgetContentHeight } from "@/features/widgets";
import { useEditor, useEditorStore } from "./EditorProvider";
import { replayKonvaNode, startKonvaLoopAnimation } from "@/features/animations";
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
}: {
  element: Element;
  tokens: ThemeTokens;
  fontRev: number;
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
          text={textPreview(element)}
          fontFamily={resolveFontFamily(s.fontFamily, tokens)}
          fontSize={s.fontSize}
          fontStyle={String(s.fontWeight)}
          lineHeight={s.lineHeight}
          letterSpacing={s.letterSpacing}
          align={s.textAlign}
          fill={resolveColor(s.color, tokens)}
          wrap="word"
          listening={false}
        />
      );
    }
    case "shape": {
      const s = element.style;
      const stroke = s.stroke ? resolveColor(s.stroke.color, tokens) : undefined;
      const fill = s.fill ? resolveColor(s.fill, tokens) : undefined;
      if (element.shapeType === "circle") {
        return (
          <Ellipse
            x={w / 2}
            y={h / 2}
            radiusX={w / 2}
            radiusY={h / 2}
            {...(fill && { fill })}
            {...(stroke && { stroke, strokeWidth: s.stroke!.width })}
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
          listening={false}
        />
      );
    }
    case "image":
      return <ImageVisual element={element} />;
    case "widget":
      return <WidgetVisual element={element} tokens={tokens} />;
  }
}

const ElementNode = memo(function ElementNode({
  element,
  tokens,
  draggable,
  selected,
  handlers,
  fontRev,
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

  return (
    <Group
      id={element.id}
      name="element"
      {...attrs}
      opacity={styleOpacity(element)}
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
        <Visual element={element} tokens={tokens} fontRev={fontRev} />
      </Group>
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
  const section: Section | undefined = useEditor((s) =>
    s.history.present.sections.find((x) => x.id === sectionId),
  );
  const tokens = useEditor((s) => s.history.present.design.tokens);
  const docBackground = useEditor((s) => s.history.present.design.background);
  const zoom = useEditor((s) => s.zoom);
  const selectedIds = useEditor((s) => s.selectedIds);
  const readOnly = useEditor((s) => s.readOnly);
  const panMode = useEditor((s) => s.panMode);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
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
      readOnly || panMode
        ? ""
        : selectedHere
            .filter((id) => {
              const el = elements?.find((e) => e.id === id);
              return el && el.visible && !el.locked;
            })
            .join(","),
    [selectedHere, elements, readOnly, panMode],
  );

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
        e.cancelBubble = true;
        dragRef.current.moved = false;
        const evt = e.evt;
        const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
        const state = store.getState();
        if (additive) state.toggleElement(id);
        else if (!state.selectedIds.includes(id)) state.selectElements([id]);
      },
      onClick(id, e) {
        if (store.getState().panMode) return;
        const evt = e.evt;
        const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
        if (!additive && !dragRef.current.moved && store.getState().selectedIds.length > 1) {
          store.getState().selectElements([id]);
        }
      },
      onContextMenu(id, e) {
        if (store.getState().panMode) return;
        e.cancelBubble = true;
        e.evt.preventDefault();
        const state = store.getState();
        if (!state.selectedIds.includes(id)) {
          state.selectElements([id]);
        }
        const stage = stageRef.current;
        const pointerPos = stage?.getPointerPosition();
        const canvasX = pointerPos ? round2(pointerPos.x / zoom) : 0;
        const canvasY = pointerPos ? round2(pointerPos.y / zoom) : 0;
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
    [store, section, hideGuides, showGuides, commitNodes],
  );

  useEffect(() => {
    const handleReplay = (e: Event) => {
      const custom = e as CustomEvent<{
        elementId?: string;
        sectionId?: string;
        trackType?: "enter" | "exit" | "attention";
      }>;
      if (custom.detail?.sectionId && custom.detail.sectionId !== sectionId) return;
      const stage = stageRef.current;
      if (!stage || !section) return;

      const trackType = custom.detail?.trackType;

      if (custom.detail?.elementId) {
        const node = stage.findOne(`#${custom.detail.elementId}`);
        const el = section.elements.find((x) => x.id === custom.detail.elementId);
        const anims = el?.animations;
        const track =
          (trackType && anims?.[trackType]) || anims?.enter || anims?.attention || anims?.exit;
        if (node && track) {
          replayKonvaNode(node, track);
        }
      } else if (custom.detail?.sectionId === sectionId) {
        for (const el of section.elements) {
          const anims = el.animations;
          const track =
            (trackType && anims?.[trackType]) || anims?.enter || anims?.attention || anims?.exit;
          if (track) {
            const node = stage.findOne(`#${el.id}`);
            if (node) replayKonvaNode(node, track);
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
      <Stage
        ref={stageRef}
      width={CANONICAL_BASE_WIDTH * zoom}
      height={section.baseHeight * zoom}
      scaleX={zoom}
      scaleY={zoom}
      onMouseDown={(e) => {
        const target = e.target;
        if (target === target.getStage() || target.name() === "bg") {
          if (store.getState().panMode) return;
          const state = store.getState();
          state.clearSelection();
          state.setActiveSection(sectionId);
        }
      }}
      onTouchStart={(e) => {
        const target = e.target;
        if (target === target.getStage() || target.name() === "bg") {
          store.getState().clearSelection();
          store.getState().setActiveSection(sectionId);
        }
      }}
      onContextMenu={(e) => {
        if (store.getState().panMode) return;
        e.evt.preventDefault();
        const target = e.target;
        if (target === target.getStage() || target.name() === "bg") {
          const state = store.getState();
          state.clearSelection();
          state.setActiveSection(sectionId);
          const stage = stageRef.current;
          const pointerPos = stage?.getPointerPosition();
          const canvasX = pointerPos ? round2(pointerPos.x / zoom) : 0;
          const canvasY = pointerPos ? round2(pointerPos.y / zoom) : 0;
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
      <Layer opacity={section.visible ? 1 : 0.4}>
        <Rect
          name="bg"
          width={CANONICAL_BASE_WIDTH}
          height={section.baseHeight}
          fill={background}
        />
        {section.elements
          .filter((el) => el.visible)
          .map((el) => (
            <ElementNode
              key={el.id}
              element={el}
              tokens={tokens}
              draggable={!el.locked && !readOnly && !panMode}
              selected={selectedHere.includes(el.id)}
              handlers={handlers}
              fontRev={fontRev}
            />
          ))}
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
      <Layer listening={false}>
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
      </Layer>
    </Stage>
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
