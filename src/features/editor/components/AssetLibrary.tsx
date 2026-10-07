"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listAssetsAction } from "@/features/assets/actions";
import type { AssetSummary } from "@/features/assets/api";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";
import { useEditor, useWorkspaceId } from "./EditorProvider";
import { ImageCropModal } from "./ImageCropModal";
import { RemoveBgModal } from "./RemoveBgModal";
import { IconCrop, IconWand } from "./icons";
import styles from "./editor.module.css";

export type AssetCategory = "all" | "image" | "video" | "gif";

export interface AssetLibraryProps {
  /** Called when the user picks an asset (add to artboard / replace image / replace video). */
  readonly onPick: (asset: AssetSummary) => void;
  /** Optionally consume successful uploads immediately (for multi-image controls). */
  readonly onUploaded?: (asset: AssetSummary) => void;
  readonly pickLabel: string;
  /** Prefix for ids/test ids so two instances can coexist. */
  readonly idPrefix?: string;
  /** Additional lock supplied by the embedding control. */
  readonly disabled?: boolean;
  /** When true, hides GIFs. Defaults to false so gallery includes GIFs. */
  readonly excludeGifs?: boolean;
  /** Restrict to a specific category or default tab. */
  readonly filterType?: AssetCategory;
}

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/ogg,video/quicktime";

export function AssetLibrary({
  onPick,
  onUploaded,
  pickLabel,
  idPrefix = "asset",
  disabled = false,
  excludeGifs = false,
  filterType = "all",
}: AssetLibraryProps) {
  const workspaceId = useWorkspaceId();
  const readOnly = useEditor((s) => s.readOnly);
  const interactionDisabled = readOnly || disabled;
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<AssetCategory>(filterType);
  const [croppingAsset, setCroppingAsset] = useState<AssetSummary | null>(null);
  const [removeBgAsset, setRemoveBgAsset] = useState<AssetSummary | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (filterType !== "all") {
      setActiveCategory(filterType);
    }
  }, [filterType]);

  const refresh = useCallback(
    async (query: string) => {
      const result = await listAssetsAction(workspaceId, query || undefined);
      if (result.ok) {
        let items = result.data;
        if (excludeGifs) {
          items = items.filter((a) => a.mimeType !== "image/gif");
        }
        setAssets(items);
      } else {
        setError(result.error);
      }
    },
    [workspaceId, excludeGifs],
  );

  // Debounced search; the first run loads the recent list.
  useEffect(() => {
    const timer = setTimeout(() => void refresh(search), search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, refresh]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const result = await uploadAssetFile(workspaceId, file);
      if (result.ok) {
        setAssets((current) => [result.asset, ...current]);
        onUploaded?.(result.asset);
      } else setError(`${file.name}: ${result.error}`);
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  const displayedAssets = assets.filter((asset) => {
    if (activeCategory === "image") {
      return asset.mimeType.startsWith("image/") && asset.mimeType !== "image/gif";
    }
    if (activeCategory === "video") {
      return asset.mimeType.startsWith("video/");
    }
    if (activeCategory === "gif") {
      return asset.mimeType === "image/gif";
    }
    return true;
  });

  const uploadButtonLabel = busy
    ? "Mengunggah..."
    : activeCategory === "video"
      ? "Unggah video"
      : activeCategory === "gif"
        ? "Unggah GIF"
        : "Unggah media (Foto / Video / GIF)";

  return (
    <div className={styles.panelStack} data-testid={`${idPrefix}-library`}>
      <label className={styles.uploadButton} aria-disabled={interactionDisabled || busy}>
        {uploadButtonLabel}
        <input
          ref={fileInput}
          id={`${idPrefix}-file`}
          data-testid={`${idPrefix}-file`}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          disabled={interactionDisabled || busy}
          onChange={(event) => void onFiles(event.target.files)}
        />
      </label>

      {/* Category filter tabs */}
      <div className={styles.categoryTabs} data-testid={`${idPrefix}-category-tabs`}>
        {(
          [
            { id: "all", label: "Semua" },
            { id: "image", label: "Foto" },
            { id: "video", label: "Video" },
            { id: "gif", label: "GIF" },
          ] as const
        ).map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={styles.categoryTabBtn}
              data-active={isActive}
              data-testid={`${idPrefix}-tab-${tab.id}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <input
        id={`${idPrefix}-search`}
        className={styles.input}
        type="search"
        placeholder="Cari nama berkas"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Cari aset"
      />
      {error ? (
        <p className={styles.errorText} role="alert" data-testid={`${idPrefix}-error`}>
          {error}
        </p>
      ) : null}
      {displayedAssets.length === 0 ? (
        <p className={styles.muted}>
          {search
            ? "Tidak ada hasil."
            : activeCategory === "video"
              ? "Belum ada video tersimpan."
              : activeCategory === "gif"
                ? "Belum ada GIF tersimpan."
                : "Belum ada media tersimpan."}
        </p>
      ) : (
        <ul className={styles.assetGrid} data-testid={`${idPrefix}-list`}>
          {displayedAssets.map((asset) => {
            const isVideo = asset.mimeType.startsWith("video/");
            const isGif = asset.mimeType === "image/gif";

            return (
              <li key={asset.id} className={styles.assetItemCard}>
                <button
                  type="button"
                  className={styles.assetItem}
                  title={`${pickLabel}: ${asset.filename}`}
                  disabled={interactionDisabled}
                  data-testid={`${idPrefix}-item`}
                  data-asset-id={asset.id}
                  onClick={() => onPick(asset)}
                >
                  {isVideo ? (
                    <div className={styles.videoThumbFrame}>
                      <video
                        src={assetUrl(asset.id)}
                        preload="metadata"
                        muted
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          pointerEvents: "none",
                        }}
                      />
                      <div className={styles.videoBadge}>
                        <span style={{ fontSize: 8 }}>▶</span> VIDEO
                      </div>
                      <div className={styles.playOverlayBtn}>
                        ▶
                      </div>
                    </div>
                  ) : isGif ? (
                    <div className={styles.gifThumbFrame}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={styles.assetThumb}
                        src={assetUrl(asset.id)}
                        alt={asset.filename}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          padding: 2,
                        }}
                      />
                      <div className={styles.gifBadge}>
                        GIF
                      </div>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element -- editor thumbnail of a same-origin asset */
                    <img
                      className={styles.assetThumb}
                      src={assetUrl(asset.id)}
                      alt={asset.filename}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <span className={styles.assetName}>{asset.filename}</span>
                </button>
                {!isVideo && !isGif && (
                  <div className={styles.assetQuickActions}>
                    <button
                      type="button"
                      className={styles.assetQuickBtn}
                      title="Potong gambar ini"
                      aria-label="Potong gambar"
                      disabled={interactionDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCroppingAsset(asset);
                      }}
                    >
                      <IconCrop size={11} />
                    </button>
                    <button
                      type="button"
                      className={styles.assetQuickBtn}
                      title="Hapus background gambar ini"
                      aria-label="Hapus background"
                      disabled={interactionDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveBgAsset(asset);
                      }}
                    >
                      <IconWand size={11} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {croppingAsset ? (
        <ImageCropModal
          assetId={croppingAsset.id}
          filename={croppingAsset.filename}
          workspaceId={workspaceId}
          onClose={() => setCroppingAsset(null)}
          onCropped={(newAsset) => {
            setAssets((current) => [newAsset, ...current]);
            setCroppingAsset(null);
          }}
        />
      ) : null}

      {removeBgAsset ? (
        <RemoveBgModal
          assetId={removeBgAsset.id}
          filename={removeBgAsset.filename}
          workspaceId={workspaceId}
          onClose={() => setRemoveBgAsset(null)}
          onProcessed={(newAsset) => {
            setAssets((current) => [newAsset, ...current]);
            setRemoveBgAsset(null);
          }}
        />
      ) : null}
    </div>
  );
}
