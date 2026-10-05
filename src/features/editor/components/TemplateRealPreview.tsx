"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CanonicalDocument } from "@/lib/schema";
import { applyDefaults, createVariableRegistry, resolveDocument } from "@/lib/engine";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";
import {
  getCachedPreviewSnapshot,
  subscribePreviewSync,
  type PreviewStateSnapshot,
} from "../core/preview-sync";
import styles from "./TemplateRealPreview.module.css";

export interface TemplateRealPreviewProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly initialDocument: CanonicalDocument;
}

function formatSyncTime(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function TemplateRealPreview({
  templateId,
  templateName,
  initialDocument,
}: TemplateRealPreviewProps) {
  const [viewMode, setViewMode] = useState<"mobile" | "full">("mobile");
  const [justUpdated, setJustUpdated] = useState(false);

  const serverSnapshot = useMemo<PreviewStateSnapshot>(
    () => ({
      raw: null,
      document: initialDocument,
      isLiveDraft: false,
      lastUpdated: null,
    }),
    [initialDocument],
  );

  const subscribe = useCallback(
    (callback: () => void) => subscribePreviewSync(templateId, initialDocument, callback),
    [templateId, initialDocument],
  );

  const getSnapshot = useCallback(
    () => getCachedPreviewSnapshot(templateId, initialDocument),
    [templateId, initialDocument],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverSnapshot,
  );

  const document = snapshot.document;
  const isLiveDraft = snapshot.isLiveDraft;
  const lastUpdated = snapshot.lastUpdated;

  const prevUpdatedRef = useRef<number | null>(lastUpdated);

  useEffect(() => {
    if (lastUpdated && lastUpdated !== prevUpdatedRef.current) {
      prevUpdatedRef.current = lastUpdated;
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [lastUpdated]);

  const resolved = useMemo(() => {
    const registry = createVariableRegistry(document.variables);
    const data = applyDefaults(registry, {});
    const guest = { name: "Bapak / Ibu / Saudara(i)" };
    return resolveDocument(document, data, guest);
  }, [document]);

  const stageRef = useRef<HTMLElement | null>(null);

  function handleReplay() {
    if (typeof stageRef.current?.scrollTo === "function") {
      stageRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dib:replay-animation", { detail: {} }));
    }
  }

  return (
    <div className={styles.previewContainer} data-testid="template-real-preview">
      {/* Floating Preview Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.leftGroup}>
          <Link
            href={`/editor/${templateId}`}
            className={styles.backLink}
            data-testid="preview-back-editor"
          >
            ← Kembali ke Editor
          </Link>
          <div className={styles.titleArea}>
            <h1 className={styles.templateName}>{templateName}</h1>
            <span
              className={`${styles.liveBadge} ${isLiveDraft ? styles.liveBadgeActive : ""} ${justUpdated ? styles.liveBadgeJustUpdated : ""}`}
              suppressHydrationWarning
              data-testid="preview-live-badge"
              title={lastUpdated ? `Terakhir disinkronkan pukul ${formatSyncTime(lastUpdated)}` : undefined}
            >
              <span className={styles.pulseDot} />
              <span>
                {isLiveDraft
                  ? `Live Terhubung${lastUpdated ? ` · ${formatSyncTime(lastUpdated)}` : ""}`
                  : "Pratinjau Nyata"}
              </span>
            </span>
          </div>
        </div>

        <div className={styles.rightGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${viewMode === "mobile" ? styles.toolBtnActive : ""}`}
            onClick={() => setViewMode("mobile")}
            data-testid="preview-view-mobile"
            title="Tampilan ponsel (390px)"
          >
            📱 Mobile
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${viewMode === "full" ? styles.toolBtnActive : ""}`}
            onClick={() => setViewMode("full")}
            data-testid="preview-view-full"
            title="Tampilan layar penuh responsif"
          >
            💻 Lebar Penuh
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleReplay}
            data-testid="preview-replay-btn"
            title="Scroll ke atas dan putar ulang animasi"
          >
            🔄 Putar Ulang
          </button>
        </div>
      </header>

      {/* Main Preview Stage */}
      <main ref={stageRef} className={styles.stage}>
        <div
          className={styles.deviceShell}
          data-view={viewMode}
          data-testid="preview-device-shell"
        >
          <PublicContextProvider
            value={{
              slug: `template-preview-${templateId}`,
              guestName: "Tamu Undangan",
            }}
          >
            <DocumentRenderer document={resolved} runtimeMode="preview" />
          </PublicContextProvider>
        </div>
      </main>

      {/* Helpful scroll hint */}
      <div className={styles.scrollHint} aria-hidden="true">
        <span>↓ Gulir ke bawah untuk melihat transisi & animasi template</span>
      </div>
    </div>
  );
}
