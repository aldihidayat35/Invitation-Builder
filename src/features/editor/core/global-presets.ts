"use client";

import { useEffect, useState, useCallback } from "react";
import type { VariableType } from "@/lib/schema";

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
        maxLength: row.maxLength ?? undefined,
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
          maxLength: json.data.maxLength ?? undefined,
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
          maxLength: json.data.maxLength ?? undefined,
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
    maxLength: preset.maxLength,
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

