/**
 * Element union: text, image, shape, widget.
 *
 * PRD refs: FR-EDT-006/007/008, FR-WDG-001, §6 (Element/Widget), §9.2, §11.
 * - Every object is strict: unknown keys (including anything script-like) are
 *   rejected, so the database can only ever hold declarative data.
 * - Layer order = array order inside a section (index 0 is the bottom layer).
 * - `icon`/decorative assets are modeled as ImageElement (asset-backed);
 *   `group` is intentionally deferred (additive, PRD §22.2).
 */
import { z } from "zod";
import { animationConfigSchema } from "./animation";
import {
  imageSourceSchema,
  propValueSchema,
  textSegmentSchema,
  widgetPropKeySchema,
} from "./binding";
import { frameSchema } from "./frame";
import { colorValueSchema, fontValueSchema, idSchema, opacitySchema } from "./primitives";

const baseElementShape = {
  id: idSchema,
  name: z.string().max(120).optional(),
  frame: frameSchema,
  /** Single visibility property for editor and publish (PRD §9.2). */
  visible: z.boolean().default(true),
  /** Locked elements still render but cannot be manipulated (PRD §9.2). */
  locked: z.boolean().default(false),
  animations: animationConfigSchema.optional(),
  /** Optional group identifier for grouped elements. */
  groupId: idSchema.optional(),
  /** Optional custom display name for the group. */
  groupName: z.string().max(120).optional(),
};

// ----------------------------------------------------------------------- text

export const TEXT_ALIGNMENTS = ["left", "center", "right", "justify"] as const;

export const elementShadowSchema = z.strictObject({
  color: colorValueSchema.default("#000000"),
  blur: z.number().min(0).max(100).default(8),
  offsetX: z.number().min(-100).max(100).default(0),
  offsetY: z.number().min(-100).max(100).default(4),
  opacity: opacitySchema.default(0.4),
});
export type ElementShadow = z.infer<typeof elementShadowSchema>;

export const textStyleSchema = z.strictObject({
  fontFamily: fontValueSchema.optional(),
  fontSize: z.number().min(1).max(400).default(16),
  fontWeight: z.int().min(100).max(900).default(400),
  lineHeight: z.number().min(0.5).max(4).default(1.4),
  letterSpacing: z.number().min(-20).max(100).default(0),
  textAlign: z.enum(TEXT_ALIGNMENTS).default("left"),
  color: colorValueSchema.default("#000000"),
  opacity: opacitySchema.default(1),
  shadow: elementShadowSchema.optional(),
});

export const textElementSchema = z.strictObject({
  ...baseElementShape,
  type: z.literal("text"),
  content: z.strictObject({
    segments: z.array(textSegmentSchema).min(1).max(50),
  }),
  style: textStyleSchema.prefault({}),
});
export type TextElement = z.infer<typeof textElementSchema>;

// ---------------------------------------------------------------------- image

export const imageFadeSchema = z.strictObject({
  mode: z.enum(["linear", "radial"]).default("linear"),
  top: z.number().min(0).max(100).default(0),
  bottom: z.number().min(0).max(100).default(0),
  left: z.number().min(0).max(100).default(0),
  right: z.number().min(0).max(100).default(0),
  radial: z.number().min(0).max(100).default(0),
});
export type ImageFade = z.infer<typeof imageFadeSchema>;

export const imageStyleSchema = z.strictObject({
  fit: z.enum(["cover", "contain"]).default("cover"),
  focal: z
    .strictObject({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .default({ x: 0.5, y: 0.5 }),
  radius: z.number().min(0).max(10_000).default(0),
  opacity: opacitySchema.default(1),
  flipH: z.boolean().default(false),
  flipV: z.boolean().default(false),
  fade: imageFadeSchema.optional(),
  shadow: elementShadowSchema.optional(),
});

export const imageElementSchema = z.strictObject({
  ...baseElementShape,
  type: z.literal("image"),
  source: imageSourceSchema,
  /** Alt text for meaningful images (NFR-A11Y-001). Omit for decorative images. */
  alt: z.string().max(300).optional(),
  style: imageStyleSchema.prefault({}),
});
export type ImageElement = z.infer<typeof imageElementSchema>;

// ---------------------------------------------------------------------- shape

export const SHAPE_TYPES = ["rectangle", "circle", "line"] as const;

export const shapeStyleSchema = z.strictObject({
  fill: colorValueSchema.optional(),
  stroke: z.strictObject({ color: colorValueSchema, width: z.number().min(0).max(200) }).optional(),
  /** Corner radius (rectangle only). */
  radius: z.number().min(0).max(10_000).default(0),
  opacity: opacitySchema.default(1),
  shadow: elementShadowSchema.optional(),
});

export const shapeElementSchema = z
  .strictObject({
    ...baseElementShape,
    type: z.literal("shape"),
    shapeType: z.enum(SHAPE_TYPES),
    style: shapeStyleSchema.prefault({}),
  })
  .superRefine((shape, ctx) => {
    if (shape.shapeType === "line" && (!shape.style.stroke || shape.style.stroke.width <= 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["style", "stroke"],
        message: "A line requires a stroke with width > 0",
      });
    }
  });
export type ShapeElement = z.infer<typeof shapeElementSchema>;

// --------------------------------------------------------------------- widget

export const WIDGET_TYPE_PATTERN = /^[a-z][A-Za-z0-9]{0,31}$/;
export const MAX_WIDGET_PROPS = 50;

export const widgetStyleSchema = z.strictObject({
  color: colorValueSchema.optional(),
  background: colorValueSchema.optional(),
  radius: z.number().min(0).max(10_000).optional(),
  opacity: opacitySchema.optional(),
  variant: z.string().optional(),
  shadow: elementShadowSchema.optional(),
});

/**
 * Widget instance. Only `widgetType + props + style overrides` are stored
 * (P-05); behavior lives in the widget registry. An unknown `widgetType` is
 * structurally valid on purpose (forward compatibility, safe fallback at
 * runtime) and reported by semantic validation instead.
 */
export const widgetElementSchema = z.strictObject({
  ...baseElementShape,
  type: z.literal("widget"),
  widgetType: z.string().regex(WIDGET_TYPE_PATTERN, "Invalid widget type"),
  widgetVersion: z.int().min(1).default(1),
  props: z
    .record(widgetPropKeySchema, propValueSchema)
    .refine((p) => Object.keys(p).length <= MAX_WIDGET_PROPS, `At most ${MAX_WIDGET_PROPS} props`)
    .prefault({}),
  style: widgetStyleSchema.prefault({}),
});
export type WidgetElement = z.infer<typeof widgetElementSchema>;

// ---------------------------------------------------------------------- union

export const elementSchema = z.discriminatedUnion("type", [
  textElementSchema,
  imageElementSchema,
  shapeElementSchema,
  widgetElementSchema,
]);
export type Element = z.infer<typeof elementSchema>;
export type ElementType = Element["type"];
