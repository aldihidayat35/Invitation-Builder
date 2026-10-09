/**
 * Binding resolver: (binding, invitationData, guestData) -> resolved value.
 *
 * PRD refs: FR-VAR-002, FR-VAR-003, FR-INV-002, P-02. Deterministic and
 * side-effect free: no clock, no randomness, no mutation of inputs.
 *
 * Missing/invalid handling (documented contract):
 *  - required variable missing   -> status `missing_required` (blocking issue);
 *  - value of the wrong type     -> status `invalid` (blocking for required,
 *                                   otherwise treated like missing);
 *  - optional + missing/invalid  -> `hideWhenMissing` wins and hides;
 *                                   else `fallback`; else empty text;
 *  - declared `default` is used before any fallback logic.
 */
import type { Binding, VariableDefinition, VariableType } from "@/lib/schema";
import { applyFormatter, type FormatOptions } from "./formatters";
import type { GuestData, InvitationData, ResolveIssue } from "./types";
import { isMissingValue, readOwn, type VariableRegistry } from "./variable-registry";

export type BindingStatus =
  | "ok"
  | "default"
  | "fallback"
  | "empty"
  | "hidden"
  | "missing_required"
  | "invalid"
  | "unknown_variable";

export interface ResolvedBinding {
  readonly key: string;
  readonly status: BindingStatus;
  /** Typed value (after default/fallback), `undefined` when nothing to show. */
  readonly value: unknown;
  /** Display text for text slots (formatter applied). */
  readonly text: string;
  /** True when the element/segment must not be rendered (`hideWhenMissing`). */
  readonly hidden: boolean;
  readonly issue?: Omit<ResolveIssue, "path" | "sectionId" | "elementId">;
}

export type ResolverOptions = FormatOptions;

const GUEST_PREFIX = "guest.";

function readGuest(guest: GuestData, key: string): unknown {
  if (key === "guest.name" || key === "guest_name" || key === "guestName") {
    return guest.name;
  }
  const field = key.startsWith(GUEST_PREFIX) ? key.slice(GUEST_PREFIX.length) : key;
  return Object.hasOwn(guest, field) ? (guest as Record<string, unknown>)[field] : undefined;
}

function plainText(def: VariableDefinition, value: unknown): string {
  switch (def.type as VariableType) {
    case "text":
    case "guest-context":
    case "url":
    case "color":
    case "date":
      return String(value);
    case "number":
    case "boolean":
      return String(value);
    case "datetime":
      return typeof value === "object" && value !== null && "local" in value
        ? String((value as { local: unknown }).local)
        : "";
    case "select": {
      const options = def.type === "select" ? def.options : [];
      return options.find((o) => o.value === value)?.label ?? String(value);
    }
    case "coordinate": {
      const c = value as { lat: number; lng: number };
      return `${c.lat}, ${c.lng}`;
    }
    case "richText":
      return Array.isArray(value) ? value.map((r: { text: string }) => r.text).join("") : "";
    case "image":
    case "collection":
      return "";
  }
}

export interface Resolver {
  resolve(binding: Binding, data: InvitationData, guest: GuestData): ResolvedBinding;
}

export function createResolver(
  registry: VariableRegistry,
  options: ResolverOptions = {},
): Resolver {
  function missingOutcome(
    binding: Binding,
    def: VariableDefinition | undefined,
    reason: "missing" | "invalid",
    detail: string,
  ): ResolvedBinding {
    const key = binding.bind;
    const required = def?.required === true;
    const fallbackText = binding.fallback === undefined ? "" : String(binding.fallback);

    if (def === undefined) {
      return {
        key,
        status: "unknown_variable",
        value: binding.fallback,
        text: fallbackText,
        hidden: binding.hideWhenMissing === true,
        issue: {
          code: "unknown_variable",
          key,
          message: `Variable "${key}" tidak didefinisikan`,
        },
      };
    }
    if (required) {
      return {
        key,
        status: reason === "missing" ? "missing_required" : "invalid",
        value: binding.fallback,
        text: fallbackText,
        hidden: binding.hideWhenMissing === true,
        issue:
          reason === "missing"
            ? { code: "missing_required", key, message: `"${def.label}" wajib diisi` }
            : { code: "invalid_value", key, message: detail },
      };
    }
    const issue =
      reason === "invalid" ? ({ code: "invalid_value", key, message: detail } as const) : undefined;
    if (binding.hideWhenMissing === true) {
      return {
        key,
        status: "hidden",
        value: undefined,
        text: "",
        hidden: true,
        ...(issue && { issue }),
      };
    }
    if (binding.fallback !== undefined) {
      return {
        key,
        status: "fallback",
        value: binding.fallback,
        text: fallbackText,
        hidden: false,
        ...(issue && { issue }),
      };
    }
    return {
      key,
      status: "empty",
      value: undefined,
      text: "",
      hidden: false,
      ...(issue && { issue }),
    };
  }

  return {
    resolve(binding, data, guest) {
      const key = binding.bind;
      const type = registry.typeOf(key);
      if (type === undefined) return missingOutcome(binding, undefined, "missing", "");

      const declared = registry.get(key);
      // Runtime guest variables may be undeclared (guest.name) -> synthetic optional definition.
      const def: VariableDefinition =
        declared ??
        ({ key, type: "guest-context", label: key, required: false } as VariableDefinition);

      let raw: unknown;
      let usedDefault = false;
      if (
        type === "guest-context" ||
        key.startsWith(GUEST_PREFIX) ||
        key === "guest_name" ||
        key === "guestName"
      ) {
        raw = readGuest(guest, key);
      } else {
        raw = readOwn(data, key);
        if (isMissingValue(raw)) {
          const fallbackDefault = registry.defaultFor(key);
          if (fallbackDefault !== undefined) {
            raw = fallbackDefault;
            usedDefault = true;
          }
        }
      }

      if (isMissingValue(raw)) return missingOutcome(binding, def, "missing", "");

      const schema = declared ? registry.schemaFor(key) : undefined;
      let value: unknown = raw;
      if (schema) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return missingOutcome(
            binding,
            def,
            "invalid",
            `"${def.label}": ${parsed.error.issues[0]?.message ?? "nilai tidak valid"}`,
          );
        }
        value = parsed.data;
      } else if (typeof raw !== "string") {
        return missingOutcome(binding, def, "invalid", `"${def.label}": harus berupa teks`);
      } else if (raw.length > 200) {
        return missingOutcome(binding, def, "invalid", `"${def.label}": terlalu panjang`);
      }

      let text: string;
      let issue: ResolvedBinding["issue"];
      if (binding.formatter) {
        const formatted = applyFormatter(binding.formatter, type, value, options);
        if (formatted === undefined) {
          text = plainText(def, value);
          issue = {
            code: "formatter_incompatible",
            key,
            message: `Formatter "${binding.formatter.name}" tidak cocok untuk tipe "${type}"`,
          };
        } else {
          text = formatted;
        }
      } else {
        text = plainText(def, value);
      }

      return {
        key,
        status: usedDefault ? "default" : "ok",
        value,
        text,
        hidden: false,
        ...(issue && { issue }),
      };
    },
  };
}
