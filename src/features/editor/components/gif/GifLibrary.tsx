"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listAssetsAction, saveAssetFromUrlAction } from "@/features/assets/actions";
import type { AssetSummary } from "@/features/assets/api";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import { useEditor, useWorkspaceId } from "../EditorProvider";
import { GIF_CATEGORIES, GIF_PRESETS, type GifCategory, type GifPreset } from "./gif-presets";
import { IconGif, IconPlus, IconSparkle } from "../icons";
import styles from "./gif.module.css";

export interface GifItemPick {
  readonly assetId?: string;
  readonly url?: string;
  readonly width?: number;
  readonly height?: number;
  readonly name?: string;
}

export interface GifLibraryProps {
  readonly onPick: (item: GifItemPick) => void;
  readonly disabled?: boolean;
}

export function GifLibrary({ onPick, disabled = false }: GifLibraryProps) {
  const workspaceId = useWorkspaceId();
  const readOnly = useEditor((s) => s.readOnly);
  const interactionDisabled = readOnly || disabled;

  const [savedAssets, setSavedAssets] = useState<AssetSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState<GifCategory>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL modal state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [inputName, setInputName] = useState("");
  const [urlSaving, setUrlSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshSavedGifs = useCallback(async () => {
    try {
      const result = await listAssetsAction(workspaceId);
      if (result.ok) {
        setSavedAssets(result.data.filter((a) => a.mimeType === "image/gif"));
      } else {
        setError(result.error);
      }
    } catch {
      // In test or non-request contexts, fail silently without throwing
    }
  }, [workspaceId]);

  useEffect(() => {
    void refreshSavedGifs();
  }, [refreshSavedGifs]);

  // Handle local .gif upload directly to workspace asset system
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".gif") && file.type !== "image/gif") {
        setError("Hanya berkas .gif yang didukung di panel ini.");
        continue;
      }
      const result = await uploadAssetFile(workspaceId, file);
      if (result.ok) {
        setSavedAssets((prev) => [result.asset, ...prev]);
        // Also automatically pick the freshly uploaded GIF
        onPick({
          assetId: result.asset.id,
          width: result.asset.width ?? 240,
          height: result.asset.height ?? 240,
          name: result.asset.filename,
        });
      } else {
        setError(`${file.name}: ${result.error}`);
      }
    }

    setBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Handle saving GIF from external URL into workspace assets
  async function handleSaveFromUrl() {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    setUrlSaving(true);
    setError(null);

    const result = await saveAssetFromUrlAction(
      workspaceId,
      trimmed,
      inputName.trim() || undefined,
    );

    if (result.ok) {
      setSavedAssets((prev) => [result.data, ...prev]);
      onPick({
        assetId: result.data.id,
        width: result.data.width ?? 240,
        height: result.data.height ?? 240,
        name: result.data.filename,
      });
      setInputUrl("");
      setInputName("");
      setShowUrlInput(false);
    } else {
      setError(result.error);
    }

    setUrlSaving(false);
  }

  // Handle picking an item: ensures it is saved in the system before placing
  async function handlePickItem(item: {
    assetId?: string;
    url?: string;
    title: string;
    width: number;
    height: number;
  }) {
    if (item.assetId) {
      onPick({
        assetId: item.assetId,
        width: item.width,
        height: item.height,
        name: item.title,
      });
      return;
    }

    const alreadySaved = savedAssets.find((sa) => sa.filename.includes(item.title));
    if (alreadySaved) {
      onPick({
        assetId: alreadySaved.id,
        width: alreadySaved.width ?? item.width,
        height: alreadySaved.height ?? item.height,
        name: alreadySaved.filename,
      });
      return;
    }

    if (item.url) {
      setBusy(true);
      setError(null);
      try {
        const result = await saveAssetFromUrlAction(
          workspaceId,
          item.url,
          `${item.title}.gif`,
        );
        if (result.ok) {
          setSavedAssets((prev) => [result.data, ...prev]);
          onPick({
            assetId: result.data.id,
            width: result.data.width ?? item.width,
            height: result.data.height ?? item.height,
            name: result.data.filename,
          });
        } else {
          setError(`Gagal menyimpan ke sistem: ${result.error}`);
        }
      } catch {
        setError("Gagal menghubungi server untuk menyimpan GIF.");
      } finally {
        setBusy(false);
      }
    }
  }

  // Handle saving preset to system collection
  async function handleSavePresetToSystem(preset: GifPreset) {
    setBusy(true);
    setError(null);
    try {
      const result = await saveAssetFromUrlAction(
        workspaceId,
        preset.url,
        `${preset.title}.gif`,
      );
      if (result.ok) {
        setSavedAssets((prev) => [result.data, ...prev]);
      } else {
        setError(`Gagal menyimpan: ${result.error}`);
      }
    } catch {
      setError("Gagal menyimpan preset.");
    } finally {
      setBusy(false);
    }
  }

  // Filter items based on activeCategory and search query
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();

    // 1. Saved system assets
    const savedMapped = savedAssets.map((asset) => ({
      kind: "saved" as const,
      id: asset.id,
      title: asset.filename,
      url: assetUrl(asset.id),
      assetId: asset.id,
      width: asset.width ?? 240,
      height: asset.height ?? 240,
      category: "saved" as const,
    }));

    // 2. Preset items
    const presetsMapped = GIF_PRESETS.map((preset) => ({
      kind: "preset" as const,
      id: preset.id,
      title: preset.title,
      url: preset.url,
      assetId: undefined,
      width: preset.width,
      height: preset.height,
      category: preset.category,
      tags: preset.tags,
    }));

    let combined = [];

    if (activeCategory === "saved") {
      combined = savedMapped;
    } else if (activeCategory === "all") {
      combined = [...savedMapped, ...presetsMapped];
    } else {
      combined = presetsMapped.filter((p) => p.category === activeCategory);
    }

    if (!q) return combined;

    return combined.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTags = "tags" in item && item.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchTags;
    });
  }, [savedAssets, activeCategory, search]);

  return (
    <div className={styles.container} data-testid="gif-library">
      {/* Top action buttons */}
      <div className={styles.actionRow}>
        <label className={styles.uploadBtn} aria-disabled={interactionDisabled || busy}>
          <IconPlus size={13} />
          <span>{busy ? "Memproses..." : "Unggah File GIF"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/gif"
            multiple
            hidden
            data-testid="gif-file-input"
            disabled={interactionDisabled || busy}
            onChange={(e) => void handleFileUpload(e.target.files)}
          />
        </label>

        <button
          type="button"
          className={styles.urlBtn}
          disabled={interactionDisabled || busy}
          data-testid="gif-toggle-url-btn"
          onClick={() => setShowUrlInput((v) => !v)}
          title="Simpan GIF dari link web ke sistem"
        >
          <IconSparkle size={13} />
          <span>Simpan via URL</span>
        </button>
      </div>

      {/* URL Input Accordion */}
      {showUrlInput && (
        <div className={styles.urlCard} data-testid="gif-url-card">
          <input
            type="url"
            className={styles.urlInput}
            placeholder="Tempel URL animasi GIF (https://...)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            disabled={urlSaving}
            data-testid="gif-url-input"
          />
          <input
            type="text"
            className={styles.urlInput}
            placeholder="Nama stiker (opsional)"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            disabled={urlSaving}
          />
          <div className={styles.urlActionRow}>
            <button
              type="button"
              className={styles.cancelUrlBtn}
              onClick={() => setShowUrlInput(false)}
              disabled={urlSaving}
            >
              Batal
            </button>
            <button
              type="button"
              className={styles.submitUrlBtn}
              onClick={() => void handleSaveFromUrl()}
              disabled={urlSaving || !inputUrl.trim()}
              data-testid="gif-submit-url-btn"
            >
              {urlSaving ? "Menyimpan ke Sistem..." : "Simpan & Pasang"}
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <input
        type="search"
        className={styles.searchInput}
        placeholder="Cari stiker atau animasi GIF..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cari animasi GIF"
        data-testid="gif-search-input"
      />

      {/* Category Pills */}
      <div className={styles.categoryScroll} role="tablist">
        {GIF_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === "saved" ? savedAssets.length : undefined;

          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.categoryBtn} ${isActive ? styles.categoryBtnActive : ""}`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`gif-cat-${cat.id}`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {typeof count === "number" && count > 0 && <span>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <span>
          {activeCategory === "saved"
            ? `${savedAssets.length} GIF tersimpan di sistem`
            : `${filteredItems.length} pilihan animasi`}
        </span>
        {savedAssets.length > 0 && activeCategory !== "saved" && (
          <span className={styles.badgeSaved}>⭐ {savedAssets.length} Tersimpan</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorBanner} role="alert" data-testid="gif-error-banner">
          {error}
        </div>
      )}

      {/* GIF Grid */}
      {filteredItems.length === 0 ? (
        <div className={styles.emptyState}>
          {search ? (
            <p>Tidak ada animasi GIF yang cocok dengan &quot;{search}&quot;.</p>
          ) : activeCategory === "saved" ? (
            <p>
              Belum ada GIF tersimpan di sistem.
              <br />
              Gunakan tombol <strong>Unggah File GIF</strong> atau <strong>Simpan via URL</strong>{" "}
              untuk menyimpan GIF agar bisa dipakai berulang kali.
            </p>
          ) : (
            <p>Tidak ada animasi pada kategori ini.</p>
          )}
        </div>
      ) : (
        <div className={styles.grid} data-testid="gif-grid">
          {filteredItems.map((item) => {
            const isSaved = item.kind === "saved";
            const isAlreadySaved =
              isSaved || savedAssets.some((sa) => sa.filename.includes(item.title));

            return (
              <div key={item.id} className={styles.card} data-testid={`gif-card-${item.id}`}>
                <div
                  className={styles.thumbWrap}
                  onClick={() =>
                    void handlePickItem({
                      assetId: item.assetId,
                      url: isSaved ? undefined : item.url,
                      width: item.width,
                      height: item.height,
                      title: item.title,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.title}
                    className={styles.gifThumb}
                    loading="lazy"
                  />
                  <div className={styles.overlay}>
                    <button
                      type="button"
                      className={styles.overlayBtn}
                      data-testid={`gif-pick-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePickItem({
                          assetId: item.assetId,
                          url: isSaved ? undefined : item.url,
                          width: item.width,
                          height: item.height,
                          title: item.title,
                        });
                      }}
                    >
                      <IconPlus size={11} />
                      Pasang
                    </button>

                    {!isSaved && !isAlreadySaved && (
                      <button
                        type="button"
                        className={styles.overlaySubBtn}
                        title="Simpan ke sistem agar bisa dipakai berulang"
                        data-testid={`gif-save-preset-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSavePresetToSystem(
                            GIF_PRESETS.find((p) => p.id === item.id)!,
                          );
                        }}
                      >
                        💾 Simpan
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.cardTitle} title={item.title}>
                    {item.title}
                  </div>
                  <div className={styles.cardMeta}>
                    {isSaved ? (
                      <span className={styles.badgeSaved}>⭐ Tersimpan</span>
                    ) : (
                      <span>Stiker Koleksi</span>
                    )}
                    <span>
                      {item.width}×{item.height}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
