/**
 * Keyboard shortcut resolution (PRD Lampiran A, section 9.2). Pure: maps a
 * keyboard event description to an editor action; the shell decides when to
 * ignore events (focus inside inputs).
 */

export type ShortcutAction =
  | { readonly type: "undo" }
  | { readonly type: "redo" }
  | { readonly type: "copy" }
  | { readonly type: "paste" }
  | { readonly type: "duplicate" }
  | { readonly type: "delete" }
  | { readonly type: "group" }
  | { readonly type: "ungroup" }
  | { readonly type: "copy-style" }
  | { readonly type: "paste-style" }
  | { readonly type: "nudge"; readonly dx: number; readonly dy: number }
  | { readonly type: "escape" };

export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

export const NUDGE_SMALL = 1;
export const NUDGE_LARGE = 10;

export function resolveShortcut(event: KeyEventLike): ShortcutAction | null {
  const mod = Boolean(event.ctrlKey || event.metaKey);
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (mod && !event.altKey) {
    if (key === "z") return event.shiftKey ? { type: "redo" } : { type: "undo" };
    if (key === "y") return { type: "redo" };
    if (key === "c") return { type: "copy" };
    if (key === "v") return { type: "paste" };
    if (key === "d") return { type: "duplicate" };
    if (key === "g") return event.shiftKey ? { type: "ungroup" } : { type: "group" };
    return null;
  }
  if (mod && event.altKey) {
    if (key === "c") return { type: "copy-style" };
    if (key === "v") return { type: "paste-style" };
    return null;
  }
  if (event.altKey) return null;

  switch (key) {
    case "Delete":
    case "Backspace":
      return { type: "delete" };
    case "Escape":
      return { type: "escape" };
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown": {
      const step = event.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
      return {
        type: "nudge",
        dx: key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0,
        dy: key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0,
      };
    }
    default:
      return null;
  }
}

/** `Space + drag` pans the artboard (Lampiran A). */
export function isPanKey(event: Pick<KeyEventLike, "key">): boolean {
  return event.key === " " || event.key === "Spacebar";
}

/** True when the keystroke belongs to a text control and must not trigger editor shortcuts. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== "string") return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    // Checkboxes/buttons/colors have no text caret; shortcuts still apply.
    return !["checkbox", "radio", "button", "submit", "color", "range"].includes(type);
  }
  return el.isContentEditable === true;
}
