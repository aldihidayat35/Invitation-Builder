"use client";

import { useEffect, useState, useCallback } from "react";
import type { VariableDefinitionInput, VariableType } from "@/lib/schema";
import { safeUrlSchema } from "@/lib/schema/url";

export interface GlobalCustomPreset {
  id: string;
  key: string;
  label: string;
  category: "mempelai" | "acara" | "hadiah" | "tamu" | "kustom";
  type: VariableType;
  default: string;
  description: string;
  maxLength?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mengkonversi dan menyanitasi objek preset ke VariableDefinitionInput yang sesuai schema Zod.
 * Menghilangkan properti asing yang tidak diizinkan oleh strictObject (misal maxLength pada non-teks)
 * dan memastikan format default value kompatibel dengan tipe variabel terkait.
 */
export function sanitizePresetToVariableInput(preset: {
  key: string;
  label: string;
  type?: string;
  default?: unknown;
  description?: string;
  maxLength?: number | null;
  required?: boolean;
}): VariableDefinitionInput | null {
  if (!preset || !preset.key || !preset.label) return null;

  const key = preset.key.trim();
  const label = preset.label.trim();
  if (!key || !label) return null;

  const type = (preset.type || "text") as VariableType;
  const required = Boolean(preset.required);
  const description =
    typeof preset.description === "string" && preset.description.trim() !== ""
      ? preset.description.trim()
      : undefined;

  const base = {
    key,
    label,
    required,
    ...(description ? { description } : {}),
  };

  switch (type) {
    case "url": {
      const def =
        typeof preset.default === "string" && safeUrlSchema().safeParse(preset.default.trim()).success
          ? preset.default.trim()
          : undefined;
      return {
        ...base,
        type: "url",
        ...(def ? { default: def } : {}),
      };
    }

    case "number": {
      let numDef: number | undefined;
      if (typeof preset.default === "number" && !isNaN(preset.default)) {
        numDef = preset.default;
      } else if (typeof preset.default === "string" && preset.default.trim() !== "") {
        const parsed = parseFloat(preset.default.trim());
        if (!isNaN(parsed)) numDef = parsed;
      }
      return {
        ...base,
        type: "number",
        integer: false,
        ...(numDef !== undefined ? { default: numDef } : {}),
      };
    }

    case "image": {
      return {
        ...base,
        type: "image",
      };
    }

    case "datetime": {
      const isDtObj =
        typeof preset.default === "object" &&
        preset.default !== null &&
        "local" in preset.default &&
        "timeZone" in preset.default;
      return {
        ...base,
        type: "datetime",
        ...(isDtObj ? { default: preset.default as { local: string; timeZone: string } } : {}),
      };
    }

    case "date": {
      const dateStr = typeof preset.default === "string" ? preset.default.trim() : "";
      const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      return {
        ...base,
        type: "date",
        ...(isDateValid ? { default: dateStr } : {}),
      };
    }

    case "color": {
      const colorStr = typeof preset.default === "string" ? preset.default.trim() : "";
      const isHexValid = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(colorStr);
      return {
        ...base,
        type: "color",
        ...(isHexValid ? { default: colorStr } : {}),
      };
    }

    case "boolean": {
      const boolDef = typeof preset.default === "boolean" ? preset.default : undefined;
      return {
        ...base,
        type: "boolean",
        ...(boolDef !== undefined ? { default: boolDef } : {}),
      };
    }

    case "text":
    default: {
      const def =
        typeof preset.default === "string" && preset.default.trim() !== ""
          ? preset.default.trim()
          : undefined;
      const maxLen =
        typeof preset.maxLength === "number" && !isNaN(preset.maxLength) && preset.maxLength > 0
          ? Math.min(5000, Math.floor(preset.maxLength))
          : undefined;
      return {
        ...base,
        type: "text",
        ...(def !== undefined ? { default: def } : {}),
        ...(maxLen !== undefined ? { maxLength: maxLen } : {}),
      };
    }
  }
}

export const GLOBAL_PRESETS_STORAGE_KEY = "dib:global-custom-presets";
export const GLOBAL_PRESETS_CHANGE_EVENT = "dib:global-presets-changed";

/** Reads cached custom presets from localStorage safely (SSR safe) */
export function getCachedGlobalPresets(): GlobalCustomPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GLOBAL_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saves custom presets array to localStorage and dispatches change notification */
export function setCachedGlobalPresets(presets: GlobalCustomPreset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLOBAL_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    window.dispatchEvent(new CustomEvent(GLOBAL_PRESETS_CHANGE_EVENT, { detail: presets }));
  } catch {
    // ignore quota error
  }
}

function resolveApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
    try {
      return new URL(path, window.location.origin).toString();
    } catch {
      return path;
    }
  }
  return path;
}

/** Fetches global presets from backend API with fallback to localStorage */
export async function fetchGlobalPresets(): Promise<GlobalCustomPreset[]> {
  try {
    const url = resolveApiUrl("/api/presets");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Gagal mengambil preset dari server");
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      const mapped: GlobalCustomPreset[] = json.data.map((row: any) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        category: (row.category as any) || "kustom",
        type: (row.type as VariableType) || "text",
        default: row.defaultValue ?? "",
        description: row.description ?? "",
        maxLength:
          typeof row.maxLength === "number" && !isNaN(row.maxLength) && row.maxLength > 0
            ? row.maxLength
            : undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
      setCachedGlobalPresets(mapped);
      return mapped;
    }
  } catch (err) {
    // Fallback to local storage cache if offline or test environment
    console.warn("[global-presets] fetchGlobalPresets fallback to cache:", err);
  }
  return getCachedGlobalPresets();
}

/** Creates or updates a global preset in DB and localStorage */
export async function saveGlobalPreset(preset: {
  id?: string;
  key: string;
  label: string;
  category?: string;
  type?: VariableType;
  default?: string;
  description?: string;
  maxLength?: number;
}): Promise<GlobalCustomPreset> {
  const current = getCachedGlobalPresets();

  try {
    if (preset.id) {
      // Update existing
      const res = await fetch(resolveApiUrl(`/api/presets/${preset.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: preset.label,
          category: preset.category,
          defaultValue: preset.default,
          description: preset.description,
          maxLength: preset.maxLength,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const updatedItem: GlobalCustomPreset = {
          id: json.data.id,
          key: json.data.key,
          label: json.data.label,
          category: json.data.category || "kustom",
          type: json.data.type || "text",
          default: json.data.defaultValue ?? "",
          description: json.data.description ?? "",
          maxLength:
            typeof json.data.maxLength === "number" && !isNaN(json.data.maxLength) && json.data.maxLength > 0
              ? json.data.maxLength
              : undefined,
        };
        const next = current.map((p) => (p.id === updatedItem.id ? updatedItem : p));
        setCachedGlobalPresets(next);
        return updatedItem;
      }
    } else {
      // Create new
      const res = await fetch(resolveApiUrl("/api/presets"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: preset.key,
          label: preset.label,
          category: preset.category || "kustom",
          type: preset.type || "text",
          defaultValue: preset.default ?? "",
          description: preset.description ?? "",
          maxLength: preset.maxLength,
        }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const newItem: GlobalCustomPreset = {
          id: json.data.id,
          key: json.data.key,
          label: json.data.label,
          category: json.data.category || "kustom",
          type: json.data.type || "text",
          default: json.data.defaultValue ?? "",
          description: json.data.description ?? "",
          maxLength:
            typeof json.data.maxLength === "number" && !isNaN(json.data.maxLength) && json.data.maxLength > 0
              ? json.data.maxLength
              : undefined,
        };
        const next = [...current.filter((p) => p.key !== newItem.key), newItem];
        setCachedGlobalPresets(next);
        return newItem;
      }
    }
  } catch (err) {
    console.warn("[global-presets] saveGlobalPreset API error, saving to local fallback:", err);
  }

  // Local fallback (works in tests and offline)
  const localItem: GlobalCustomPreset = {
    id: preset.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: preset.key,
    label: preset.label,
    category: (preset.category as any) || "kustom",
    type: preset.type || "text",
    default: preset.default ?? "",
    description: preset.description ?? "",
    maxLength:
      typeof preset.maxLength === "number" && !isNaN(preset.maxLength) && preset.maxLength > 0
        ? preset.maxLength
        : undefined,
  };

  const next = preset.id
    ? current.map((p) => (p.id === preset.id ? localItem : p))
    : [...current.filter((p) => p.key !== localItem.key), localItem];

  setCachedGlobalPresets(next);
  return localItem;
}

/** Deletes a global preset from DB and localStorage */
export async function deleteGlobalPreset(id: string): Promise<boolean> {
  const current = getCachedGlobalPresets();
  try {
    if (!id.startsWith("local_")) {
      await fetch(resolveApiUrl(`/api/presets/${id}`), { method: "DELETE" });
    }
  } catch (err) {
    console.warn("[global-presets] deleteGlobalPreset API error:", err);
  }

  const next = current.filter((p) => p.id !== id);
  setCachedGlobalPresets(next);
  return true;
}

/** Custom hook for reactive global preset management */
export function useGlobalCustomPresets() {
  const [presets, setPresets] = useState<GlobalCustomPreset[]>(() => getCachedGlobalPresets());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGlobalPresets();
      setPresets(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    void refresh();

    const handleSync = () => {
      setPresets(getCachedGlobalPresets());
    };

    window.addEventListener(GLOBAL_PRESETS_CHANGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(GLOBAL_PRESETS_CHANGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refresh]);

  const handleSavePreset = useCallback(async (preset: Parameters<typeof saveGlobalPreset>[0]) => {
    const saved = await saveGlobalPreset(preset);
    setPresets(getCachedGlobalPresets());
    return saved;
  }, []);

  const handleDeletePreset = useCallback(async (id: string) => {
    const res = await deleteGlobalPreset(id);
    setPresets(getCachedGlobalPresets());
    return res;
  }, []);

  return {
    presets,
    loading,
    refresh,
    savePreset: handleSavePreset,
    deletePreset: handleDeletePreset,
  };
}

