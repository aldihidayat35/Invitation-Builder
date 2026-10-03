/**
 * Semantic validation (needs variable schema and, optionally, widget catalog).
 *
 * PRD refs: Lampiran C (validation before publish), FR-VAR-002, FR-WDG-001,
 * AC-14. Structural validity is handled by the Zod schema; this checks
 * cross-references: binding keys, binding type compatibility, formatters, and
 * widget types/props.
 */
import type { z } from "zod";
import { isBinding, isBindingSegment, type Binding, type FormatterName } from "./binding";
import { isBindingCompatible, isFormatterCompatible, type BindingSlotType } from "./binding-compat";
import type { CanonicalDocument } from "./document";
import { lookupVariableType } from "./variable";

export type SemanticIssueCode =
  | "binding_unknown_key"
  | "binding_type_mismatch"
  | "formatter_requires_text_slot"
  | "formatter_type_mismatch"
  | "unknown_widget_type"
  | "widget_prop_unknown"
  | "widget_prop_missing"
  | "widget_prop_invalid";

export interface SemanticIssue {
  readonly code: SemanticIssueCode;
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly sectionId?: string;
  readonly elementId?: string;
}

/** Declares one widget prop: where a binding may plug in and how static values are validated. */
export interface WidgetPropSpec {
  readonly slot: BindingSlotType;
  readonly required?: boolean;
  readonly schema: z.ZodType;
}

export interface WidgetCatalogEntry {
  readonly type: string;
  readonly version: number;
  readonly props: Readonly<Record<string, WidgetPropSpec>>;
}

/** Minimal read-only view of the widget registry (implemented in features/widgets). */
export interface WidgetCatalog {
  get(type: string): WidgetCatalogEntry | undefined;
}

export interface SemanticValidationOptions {
  /** When provided, widget types and props are validated against it. */
  readonly widgets?: WidgetCatalog;
}

export function validateDocumentSemantics(
  document: CanonicalDocument,
  options: SemanticValidationOptions = {},
): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  const checkBinding = (
    binding: Binding,
    slot: BindingSlotType,
    path: (string | number)[],
    where: { sectionId?: string; elementId?: string },
  ) => {
    const add = (code: SemanticIssueCode, message: string) =>
      issues.push({ code, message, path: [...path, "bind"], ...where });

    const variableType = lookupVariableType(binding.bind, document.variables);
    if (variableType === undefined) {
      add("binding_unknown_key", `Binding key "${binding.bind}" is not defined in variables`);
      return;
    }
    if (binding.formatter) {
      const name: FormatterName = binding.formatter.name;
      if (slot !== "text") {
        add("formatter_requires_text_slot", `Formatter "${name}" can only be used in text slots`);
      } else if (!isFormatterCompatible(name, variableType)) {
        add(
          "formatter_type_mismatch",
          `Formatter "${name}" cannot format a "${variableType}" variable ("${binding.bind}")`,
        );
      }
    }
    if (!isBindingCompatible(slot, variableType)) {
      add(
        "binding_type_mismatch",
        `Variable "${binding.bind}" (${variableType}) cannot bind to a ${slot} slot`,
      );
    }
  };

  document.sections.forEach((section, si) => {
    const sectionWhere = { sectionId: section.id };
    const sectionPath: (string | number)[] = ["sections", si];

    const bgImage = section.background.image;
    if (bgImage && "bind" in bgImage) {
      checkBinding(bgImage, "image", [...sectionPath, "background", "image"], sectionWhere);
    }

    section.elements.forEach((element, ei) => {
      const path: (string | number)[] = [...sectionPath, "elements", ei];
      const where = { ...sectionWhere, elementId: element.id };

      switch (element.type) {
        case "text":
          element.content.segments.forEach((segment, gi) => {
            if (isBindingSegment(segment)) {
              checkBinding(segment, "text", [...path, "content", "segments", gi], where);
            }
          });
          break;
        case "image":
          if ("bind" in element.source) {
            checkBinding(element.source, "image", [...path, "source"], where);
          }
          break;
        case "shape":
          break;
        case "widget":
          if (options.widgets) {
            checkWidget(element, path, where);
          } else {
            checkWidgetBindingKeys(element, path, where);
          }
          break;
      }
    });
  });

  /**
   * Without prop specs we cannot check slot compatibility, but every binding
   * key must still exist (Lampiran C: all binding keys are valid).
   */
  function checkWidgetBindingKeys(
    element: Extract<CanonicalDocument["sections"][number]["elements"][number], { type: "widget" }>,
    path: (string | number)[],
    where: { sectionId?: string; elementId?: string },
  ) {
    for (const [name, value] of Object.entries(element.props)) {
      if (isBinding(value) && lookupVariableType(value.bind, document.variables) === undefined) {
        issues.push({
          code: "binding_unknown_key",
          message: `Binding key "${value.bind}" is not defined in variables`,
          path: [...path, "props", name, "bind"],
          ...where,
        });
      }
    }
  }

  function checkWidget(
    element: Extract<CanonicalDocument["sections"][number]["elements"][number], { type: "widget" }>,
    path: (string | number)[],
    where: { sectionId?: string; elementId?: string },
  ) {
    const entry = options.widgets?.get(element.widgetType);
    if (!entry) {
      issues.push({
        code: "unknown_widget_type",
        message: `Widget type "${element.widgetType}" is not registered`,
        path: [...path, "widgetType"],
        ...where,
      });
      checkWidgetBindingKeys(element, path, where);
      return;
    }

    for (const [name, value] of Object.entries(element.props)) {
      const spec = Object.hasOwn(entry.props, name) ? entry.props[name] : undefined;
      if (!spec) {
        issues.push({
          code: "widget_prop_unknown",
          message: `Widget "${element.widgetType}" has no prop "${name}"`,
          path: [...path, "props", name],
          ...where,
        });
        continue;
      }
      if (isBinding(value)) {
        checkBinding(value, spec.slot, [...path, "props", name], where);
      } else {
        const result = spec.schema.safeParse(value);
        if (!result.success) {
          issues.push({
            code: "widget_prop_invalid",
            message: `Prop "${name}": ${result.error.issues.map((i) => i.message).join("; ")}`,
            path: [...path, "props", name],
            ...where,
          });
        }
      }
    }

    for (const [name, spec] of Object.entries(entry.props)) {
      if (spec.required && !Object.hasOwn(element.props, name)) {
        issues.push({
          code: "widget_prop_missing",
          message: `Widget "${element.widgetType}" requires prop "${name}"`,
          path: [...path, "props", name],
          ...where,
        });
      }
    }
  }

  return issues;
}
