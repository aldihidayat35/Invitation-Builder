/**
 * Safe binding type compatibility.
 *
 * PRD refs: FR-VAR-002 ("binding ke variable type-compatible"), §10.1,
 * Fase 1 step 5. Pure functions, no UI.
 *
 * A "slot" is the type of place a binding is plugged into (a text segment, an
 * image source, a widget prop). The matrix below says which variable types
 * may fill which slot.
 */
import type { FormatterName } from "./binding";
import type { VariableType } from "./variable";

export const BINDING_SLOT_TYPES = [
  "text",
  "richText",
  "number",
  "boolean",
  "date",
  "datetime",
  "image",
  "url",
  "color",
  "coordinate",
  "select",
  "collection",
] as const;
export type BindingSlotType = (typeof BINDING_SLOT_TYPES)[number];

export const SLOT_ACCEPTS: Readonly<Record<BindingSlotType, readonly VariableType[]>> = {
  // Plain text can show any scalar. Rich text is excluded (needs sanitized rendering).
  text: ["text", "number", "date", "datetime", "select", "url", "guest-context"],
  richText: ["richText", "text"],
  number: ["number"],
  boolean: ["boolean"],
  date: ["date", "datetime"],
  datetime: ["datetime"],
  image: ["image"],
  url: ["url"],
  color: ["color"],
  coordinate: ["coordinate"],
  select: ["select"],
  collection: ["collection"],
};

export function isBindingCompatible(slot: BindingSlotType, variableType: VariableType): boolean {
  return SLOT_ACCEPTS[slot].includes(variableType);
}

/** Variable types each formatter may be applied to. */
export const FORMATTER_ACCEPTS: Readonly<Record<FormatterName, readonly VariableType[]>> = {
  date: ["date", "datetime"],
  datetime: ["datetime"],
  uppercase: ["text", "select", "guest-context"],
  lowercase: ["text", "select", "guest-context"],
  "title-case": ["text", "select", "guest-context"],
  "phone-display": ["text"],
  currency: ["number"],
};

export function isFormatterCompatible(
  formatter: FormatterName,
  variableType: VariableType,
): boolean {
  return FORMATTER_ACCEPTS[formatter].includes(variableType);
}
