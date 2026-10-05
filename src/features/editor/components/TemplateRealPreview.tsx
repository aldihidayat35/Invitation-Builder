"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CanonicalDocument, OpeningTemplate } from "@/lib/schema";
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
  const [coverMode, setCoverMode] = useState<OpeningTemplate | "off">(
    initialDocument.design.opening?.template ?? "royal-envelope",
  );

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
    const base = resolveDocument(document, data, guest);
    if (coverMode === "off") {
      return {
        ...base,
        opening: undefined,
      };
    }
    const current = base.opening;
    return {
      ...base,
      opening: {
        enabled: true,
        template: coverMode,
        title: current?.title ?? "The Wedding Of",
        subtitle: current?.subtitle ?? "Undangan Pernikahan",
        coupleName: current?.coupleName ?? "Anindya & Raka",
        dateText: current?.dateText ?? "Minggu, 14 Maret 2027",
        locationText: current?.locationText ?? "Gedung Serbaguna, Jakarta",
        guestLabel: current?.guestLabel ?? "Kepada Yth. Bapak/Ibu/Saudara/i:",
        buttonText: current?.buttonText ?? "Buka Undangan",
        overlayOpacity: current?.overlayOpacity ?? 0.4,
      },
    };
  }, [document, coverMode]);

  const stageRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  function handleReplay() {
    if (typeof stageRef.current?.scrollTo === "function") {
      stageRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (typeof shellRef.current?.scrollTo === "function") {
      shellRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dib:replay-animation", { detail: {} }));
      window.dispatchEvent(new CustomEvent("dib:replay-opening", { detail: {} }));
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              Cover:
            </span>
            <select
              className={styles.toolBtn}
              value={coverMode}
              onChange={(e) => {
                setCoverMode(e.target.value as OpeningTemplate | "off");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("dib:replay-opening"));
                }
              }}
              data-testid="preview-cover-select"
              title="Pilih Desain Template Cover Opening"
              style={{
                cursor: "pointer",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                padding: "0.35rem 0.55rem",
                color: "#ffffff",
                fontSize: "0.78rem",
              }}
            >
              <option value="royal-envelope" style={{ background: "#1f2937", color: "#fff" }}>✉️ Royal Envelope</option>
              <option value="modern-editorial" style={{ background: "#1f2937", color: "#fff" }}>📰 Modern Editorial</option>
              <option value="luxury-arch" style={{ background: "#1f2937", color: "#fff" }}>👑 Luxury Arch</option>
              <option value="botanical-watercolor" style={{ background: "#1f2937", color: "#fff" }}>🌿 Botanical Garden</option>
              <option value="cinematic-glass" style={{ background: "#1f2937", color: "#fff" }}>💎 Cinematic Glass</option>
              <option value="off" style={{ background: "#1f2937", color: "#fff" }}>Tutup Cover (Off)</option>
            </select>
          </div>

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
          ref={shellRef}
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
