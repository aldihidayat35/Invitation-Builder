"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  finalizeUploadAction,
  initUploadAction,
  listAssetsAction,
} from "@/features/assets/actions";
import type { AssetSummary } from "@/features/assets/api";
import { assetUrl } from "@/features/assets/urls";
import { useEditor, useWorkspaceId } from "./EditorProvider";
import styles from "./editor.module.css";

export interface AssetLibraryProps {
  /** Called when the user picks an asset (add to artboard / replace image). */
  readonly onPick: (asset: AssetSummary) => void;
  readonly pickLabel: string;
  /** Prefix for ids/test ids so two instances can coexist. */
  readonly idPrefix?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

async function uploadOne(
  workspaceId: string,
  file: File,
): Promise<{ ok: true; asset: AssetSummary } | { ok: false; error: string }> {
  const init = await initUploadAction(workspaceId, {
    filename: file.name,
    mimeType: file.type,
    bytes: file.size,
  });
  if (!init.ok) return init;

  let response: Response;
  try {
    response = await fetch(init.data.upload.url, {
      method: init.data.upload.method,
      headers: init.data.upload.headers,
      body: file,
    });
  } catch {
    return { ok: false, error: "Upload gagal. Periksa koneksi." };
  }
  if (!response.ok) {
    let message = "Upload ditolak server.";
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    return { ok: false, error: message };
  }

  const done = await finalizeUploadAction(init.data.assetId);
  return done.ok ? { ok: true, asset: done.data } : done;
}

export function AssetLibrary({ onPick, pickLabel, idPrefix = "asset" }: AssetLibraryProps) {
  const workspaceId = useWorkspaceId();
  const readOnly = useEditor((s) => s.readOnly);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const result = await uploadOne(workspaceId, file);
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
            <li key={asset.id}>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
