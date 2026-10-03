/**
 * Editor side-panel widths (user preference, per browser).
 * A tiny external store so React reads it via useSyncExternalStore:
 * the server snapshot is the default, the client snapshot comes from localStorage.
 */
export type PanelSide = "left" | "right";

export interface PanelWidths {
  readonly left: number;
  readonly right: number;
}

export const PANEL_LIMITS: Readonly<Record<PanelSide, { min: number; max: number; def: number }>> =
  {
    left: { min: 200, max: 480, def: 272 },
    right: { min: 260, max: 560, def: 320 },
  };

export const DEFAULT_WIDTHS: PanelWidths = {
  left: PANEL_LIMITS.left.def,
  right: PANEL_LIMITS.right.def,
};

const STORAGE_KEY = "dib:editor-panel-widths";

export function clampWidth(side: PanelSide, value: number): number {
  const { min, max } = PANEL_LIMITS[side];
  if (!Number.isFinite(value)) return PANEL_LIMITS[side].def;
  return Math.round(Math.min(max, Math.max(min, value)));
}

/** Parses persisted JSON defensively; anything invalid falls back to defaults. */
export function parseWidths(raw: string | null): PanelWidths {
  if (!raw) return DEFAULT_WIDTHS;
  try {
    const data = JSON.parse(raw) as Partial<Record<PanelSide, unknown>>;
    return {
      left: typeof data.left === "number" ? clampWidth("left", data.left) : DEFAULT_WIDTHS.left,
      right:
        typeof data.right === "number" ? clampWidth("right", data.right) : DEFAULT_WIDTHS.right,
    };
  } catch {
    return DEFAULT_WIDTHS;
  }
}

let current: PanelWidths | null = null;
const listeners = new Set<() => void>();

function load(): PanelWidths {
  if (current) return current;
  try {
    current = parseWidths(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    current = DEFAULT_WIDTHS;
  }
  return current;
}

export const panelLayoutStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): PanelWidths {
    return load();
  },
  getServerSnapshot(): PanelWidths {
    return DEFAULT_WIDTHS;
  },
  /** Updates the live width (no persistence; call `persist` when the gesture ends). */
  set(side: PanelSide, width: number): void {
    const base = load();
    const next = clampWidth(side, width);
    if (base[side] === next) return;
    current = { ...base, [side]: next };
    for (const listener of listeners) listener();
  },
  persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(load()));
    } catch {
      /* storage may be unavailable (private mode); width still applies for this session */
    }
  },
};
