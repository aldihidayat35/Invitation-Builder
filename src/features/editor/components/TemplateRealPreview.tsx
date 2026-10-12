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
import { GUEST_PREVIEW_CHANGED_EVENT, getGuestPreviewName } from "../core/display";
import {
  IconArrowLeft,
  IconMonitor,
  IconReplay,
  IconSmartphone,
  IconSparkle,
} from "./icons";
import styles from "./TemplateRealPreview.module.css";

export interface TemplateRealPreviewProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly initialDocument: CanonicalDocument;
  readonly initialGuestName?: string;
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
  initialGuestName,
}: TemplateRealPreviewProps) {
  const [viewMode, setViewMode] = useState<"mobile" | "full">("mobile");
  const [justUpdated, setJustUpdated] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);

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

  const [guestPreviewName, setGuestPreviewName] = useState(
    () => initialGuestName?.trim() || getGuestPreviewName(),
  );

  useEffect(() => {
    const onGuestPreviewChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setGuestPreviewName(typeof detail === "string" ? detail : getGuestPreviewName());
    };
    window.addEventListener(GUEST_PREVIEW_CHANGED_EVENT, onGuestPreviewChange);
    return () => {
      window.removeEventListener(GUEST_PREVIEW_CHANGED_EVENT, onGuestPreviewChange);
    };
  }, []);

  const resolved = useMemo(() => {
    const registry = createVariableRegistry(document.variables);
    const data = applyDefaults(registry, {});
    const guest = { name: guestPreviewName || "Bapak / Ibu / Saudara(i)" };
    return resolveDocument(document, data, guest);
  }, [document, guestPreviewName]);

  const hasOpeningSection = document.sections.some((s) => s.isOpening);
  const [isCoverOpened, setIsCoverOpened] = useState(false);

  useEffect(() => {
    const onOpen = () => setIsCoverOpened(true);
    const onReplay = () => setIsCoverOpened(false);
    window.addEventListener("dib:open-invitation", onOpen);
    window.addEventListener("dib:replay-opening", onReplay);
    return () => {
      window.removeEventListener("dib:open-invitation", onOpen);
      window.removeEventListener("dib:replay-opening", onReplay);
    };
  }, []);

  const stageRef = useRef<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  function handleReplay() {
    setIsCoverOpened(false);
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
      {/* Floating Trigger Button: Membuka kontrol preview saat diklik */}
      {!isNavOpen && (
        <button
          type="button"
          className={styles.floatingTriggerBtn}
          onClick={() => setIsNavOpen(true)}
          data-testid="preview-open-navbar-btn"
          aria-label="Buka Menu Kontrol Preview"
        >
          <svg
            width={15}
            height={15}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          <span>Kontrol Preview</span>
        </button>
      )}

      {/* Floating Preview Top Bar (Hanya tampil saat dibuka) */}
      <header
        className={`${styles.topBar} ${isNavOpen ? styles.topBarOpen : ""}`}
        aria-hidden={!isNavOpen}
      >
        <div className={styles.leftGroup}>
          <Link
            href={`/editor/${templateId}`}
            className={styles.backLink}
            data-testid="preview-back-editor"
          >
            <IconArrowLeft size={14} />
            <span>Kembali ke Editor</span>
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
          {hasOpeningSection ? (
            <>
              <button
                type="button"
                className={`${styles.toolBtn} ${showCover ? styles.toolBtnActive : ""}`}
                onClick={() => {
                  setShowCover((v) => !v);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("dib:replay-opening"));
                  }
                }}
                data-testid="preview-toggle-cover"
                title="Aktifkan/nonaktifkan Cover Opening (Section 0)"
              >
                <IconSparkle size={13} />
                <span>Cover (#0): {showCover ? "On" : "Off"}</span>
              </button>
              {showCover && (
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => {
                    setIsCoverOpened(false);
                    if (typeof shellRef.current?.scrollTo === "function") {
                      shellRef.current.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("dib:replay-opening"));
                    }
                  }}
                  data-testid="preview-replay-cover"
                  title="Tampilkan kembali Cover Opening di dalam frame"
                >
                  <IconReplay size={13} />
                  <span>Ulangi Cover</span>
                </button>
              )}
            </>
          ) : null}

          <button
            type="button"
            className={`${styles.toolBtn} ${viewMode === "mobile" ? styles.toolBtnActive : ""}`}
            onClick={() => setViewMode("mobile")}
            data-testid="preview-view-mobile"
            title="Tampilan ponsel (390px)"
          >
            <IconSmartphone size={13} />
            <span>Mobile</span>
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${viewMode === "full" ? styles.toolBtnActive : ""}`}
            onClick={() => setViewMode("full")}
            data-testid="preview-view-full"
            title="Tampilan layar penuh responsif"
          >
            <IconMonitor size={13} />
            <span>Lebar Penuh</span>
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={handleReplay}
            data-testid="preview-replay-btn"
            title="Scroll ke atas dan putar ulang animasi"
          >
            <IconReplay size={13} />
            <span>Putar Ulang</span>
          </button>

          {/* Tombol Tutup Navbar */}
          <button
            type="button"
            className={styles.closeNavBtn}
            onClick={() => setIsNavOpen(false)}
            data-testid="preview-close-navbar-btn"
            title="Sembunyikan Menu Preview"
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Tutup</span>
          </button>
        </div>
      </header>

      {/* Main Preview Stage */}
      <main ref={stageRef} className={styles.stage}>
        <div
          ref={shellRef}
          className={styles.deviceShell}
          data-view={viewMode}
          data-opening-active={hasOpeningSection && showCover && !isCoverOpened}
          data-testid="preview-device-shell"
        >
          <PublicContextProvider
            value={{
              slug: `template-preview-${templateId}`,
              guestName: guestPreviewName?.trim() || "Tamu Undangan",
            }}
          >
            <DocumentRenderer
              document={resolved}
              runtimeMode="preview"
              showOpeningScreen={showCover}
            />
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
