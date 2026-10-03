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

export interface AssetLibraryProps {
  /** Called when the user picks an asset (add to artboard / replace image). */
  readonly onPick: (asset: AssetSummary) => void;
  readonly pickLabel: string;
  /** Prefix for ids/test ids so two instances can coexist. */
  readonly idPrefix?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";


export function AssetLibrary({ onPick, pickLabel, idPrefix = "asset" }: AssetLibraryProps) {
  const workspaceId = useWorkspaceId();
  const readOnly = useEditor((s) => s.readOnly);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [croppingAsset, setCroppingAsset] = useState<AssetSummary | null>(null);
  const [removeBgAsset, setRemoveBgAsset] = useState<AssetSummary | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(
    async (query: string) => {
      const result = await listAssetsAction(workspaceId, query || undefined);
      if (result.ok) {
        setAssets(result.data);
      } else {
        setError(result.error);
      }
    },
    [workspaceId],
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
      if (result.ok) setAssets((current) => [result.asset, ...current]);
      else setError(`${file.name}: ${result.error}`);
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className={styles.panelStack} data-testid={`${idPrefix}-library`}>
      <label className={styles.uploadButton} aria-disabled={readOnly || busy}>
        {busy ? "Mengunggah..." : "Unggah gambar"}
        <input
          ref={fileInput}
          id={`${idPrefix}-file`}
          data-testid={`${idPrefix}-file`}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          disabled={readOnly || busy}
          onChange={(event) => void onFiles(event.target.files)}
        />
      </label>
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
      {assets.length === 0 ? (
        <p className={styles.muted}>{search ? "Tidak ada hasil." : "Belum ada gambar."}</p>
      ) : (
        <ul className={styles.assetGrid} data-testid={`${idPrefix}-list`}>
          {assets.map((asset) => (
            <li key={asset.id} className={styles.assetItemCard}>
              <button
                type="button"
                className={styles.assetItem}
                title={`${pickLabel}: ${asset.filename}`}
                disabled={readOnly}
                data-testid={`${idPrefix}-item`}
                data-asset-id={asset.id}
                onClick={() => onPick(asset)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- editor thumbnail of a same-origin asset */}
                <img
                  className={styles.assetThumb}
                  src={assetUrl(asset.id)}
                  alt={asset.filename}
                  loading="lazy"
                  decoding="async"
                />
                <span className={styles.assetName}>{asset.filename}</span>
              </button>
              <div className={styles.assetQuickActions}>
                <button
                  type="button"
                  className={styles.assetQuickBtn}
                  title="Potong gambar ini"
                  aria-label="Potong gambar"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemoveBgAsset(asset);
                  }}
                >
                  <IconWand size={11} />
                </button>
              </div>
            </li>
          ))}
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

