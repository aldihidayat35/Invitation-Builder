/**
 * Widget registry core.
 *
 * PRD refs: FR-WDG-001, P-05, P-09, §11 (widget contract), Fase 1 test
 * "unknown widget type placeholder behavior".
 *
 * Fase 1 delivers the registry contract only (type, version, label, typed
 * prop specs, default frame/props, optional prop migration). Concrete
 * widgets (map/countdown/guestGreeting) and their editor/runtime components
 * are registered in Fase 6 — nothing here is template-specific.
 */
import type { z } from "zod";
import {
  WIDGET_TYPE_PATTERN,
  type BindingSlotType,
  type Frame,
  type JsonValue,
  type WidgetCatalog,
  type WidgetCatalogEntry,
  type WidgetPropSpec,
} from "@/lib/schema";

/**
 * How the inspector edits a prop. Derived from slot when omitted (text -> text,
 * coordinate -> coordinate, datetime -> datetime); select and 
ecord need options / ields.
 */
export type WidgetPropControl =
  | "text"
  | "select"
  | "font"
  | "coordinate"
  | "datetime"
  | "record"
  | "boolean"
  | "number"
  | "binding";

export interface WidgetPropDefinition<S extends z.ZodType = z.ZodType> extends WidgetPropSpec {
  readonly label: string;
  readonly schema: S;
  readonly control?: WidgetPropControl;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly fields?: readonly { readonly key: string; readonly label: string }[];
}

/** Editor placeholder text (title + optional subtitle). */
export interface WidgetPlaceholder {
  readonly title: string;
  readonly subtitle?: string;
}

export interface WidgetDefinition {
  /** Stable lowerCamel id stored in documents, e.g. `map`. */
  readonly type: string;
  /** Props schema version; bump with `migrateProps` on breaking prop changes. */
  readonly version: number;
  readonly label: string;
  readonly props: Readonly<Record<string, WidgetPropDefinition>>;
  readonly defaultFrame: Pick<Frame, "w" | "h">;
  readonly defaultProps: Readonly<Record<string, JsonValue>>;
  /** Explicit style for newly inserted widgets; old documents may omit it. */
  readonly defaultStyle?: Readonly<{
    readonly variant: string;
    readonly radius?: number;
  }>;
  /**
   * Pure, DOM-free description shown by editors that cannot run the runtime
   * component (the Konva canvas). The runtime renderer lives in `./runtime`.
   */
  readonly placeholder?: (props: Readonly<Record<string, unknown>>) => WidgetPlaceholder;
  /** Pure upgrade of stored props from an older widget version. */
  readonly migrateProps?: (
    props: Readonly<Record<string, unknown>>,
    fromVersion: number,
  ) => Record<string, unknown>;
}

export type ResolvedWidget =
  | { readonly kind: "known"; readonly definition: WidgetDefinition }
  | { readonly kind: "unknown"; readonly fallback: UnknownWidgetFallback };

/** Safe placeholder used by editor/runtime instead of crashing (P-09, NFR-REL-002). */
export interface UnknownWidgetFallback {
  readonly type: string;
  readonly label: string;
  readonly message: string;
}

export class WidgetRegistry implements WidgetCatalog {
  private readonly definitions = new Map<string, WidgetDefinition>();

  register(definition: WidgetDefinition): this {
    if (!WIDGET_TYPE_PATTERN.test(definition.type)) {
      throw new Error(`Invalid widget type "${definition.type}"`);
    }
    if (!Number.isInteger(definition.version) || definition.version < 1) {
      throw new Error(`Widget "${definition.type}" must have an integer version >= 1`);
    }
    if (this.definitions.has(definition.type)) {
      throw new Error(`Widget type "${definition.type}" is already registered`);
    }
    this.definitions.set(definition.type, definition);
    return this;
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  list(): readonly WidgetDefinition[] {
    return [...this.definitions.values()];
  }

  /** WidgetCatalog view consumed by semantic validation. */
  get(type: string): WidgetCatalogEntry | undefined {
    const definition = this.definitions.get(type);
    if (!definition) return undefined;
    return { type: definition.type, version: definition.version, props: definition.props };
  }

  /** Never throws: unknown types resolve to a safe fallback descriptor. */
  resolve(type: string): ResolvedWidget {
    const definition = this.definitions.get(type);
    if (definition) return { kind: "known", definition };
    return {
      kind: "unknown",
      fallback: {
        type,
        label: "Widget tidak didukung",
        message: `Widget "${type}" is not registered in this version of the app.`,
      },
    };
  }
}

export function createWidgetRegistry(
  definitions: readonly WidgetDefinition[] = [],
): WidgetRegistry {
  const registry = new WidgetRegistry();
  for (const definition of definitions) registry.register(definition);
  return registry;
}

/** Helper that keeps `slot` typing tight when declaring a prop. */
export function defineProp<S extends z.ZodType>(
  slot: BindingSlotType,
  label: string,
  schema: S,
  options: {
    readonly required?: boolean;
    readonly control?: WidgetPropControl;
    readonly options?: WidgetPropDefinition["options"];
    readonly fields?: WidgetPropDefinition["fields"];
  } = {},
): WidgetPropDefinition<S> {
  return {
    slot,
    label,
    schema,
    ...(options.required !== undefined ? { required: options.required } : {}),
    ...(options.control !== undefined ? { control: options.control } : {}),
    ...(options.options !== undefined ? { options: options.options } : {}),
    ...(options.fields !== undefined ? { fields: options.fields } : {}),
  };
}
