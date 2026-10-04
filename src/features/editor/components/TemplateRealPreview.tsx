"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";
import { applyDefaults, createVariableRegistry, resolveDocument } from "@/lib/engine";
import { DocumentRenderer } from "@/features/renderer";
import { PublicContextProvider } from "@/features/widgets/runtime";
import styles from "./TemplateRealPreview.module.css";

export interface TemplateRealPreviewProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly initialDocument: CanonicalDocument;
}

function getInitialDocState(
  templateId: string,
  initialDocument: CanonicalDocument,
): { document: CanonicalDocument; isLiveDraft: boolean } {
  if (typeof window === "undefined") {
    return { document: initialDocument, isLiveDraft: false };
  }
  try {
    const cached = localStorage.getItem(`dib_preview_doc_${templateId}`);
    if (cached) {
      const parsed = canonicalDocumentSchema.safeParse(JSON.parse(cached));
      if (parsed.success) {
        return { document: parsed.data, isLiveDraft: true };
      }
    }
  } catch {
    // ignore
  }
  return { document: initialDocument, isLiveDraft: false };
}

export function TemplateRealPreview({
  templateId,
  templateName,
  initialDocument,
}: TemplateRealPreviewProps) {
  const [docState, setDocState] = useState(() =>
    getInitialDocState(templateId, initialDocument),
  );
  const [viewMode, setViewMode] = useState<"mobile" | "full">("mobile");

  const document = docState.document;
  const isLiveDraft = docState.isLiveDraft;

  // React to cross-tab storage changes from editor saves
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === `dib_preview_doc_${templateId}` && e.newValue) {
        try {
          const parsed = canonicalDocumentSchema.safeParse(JSON.parse(e.newValue));
          if (parsed.success) {
            setDocState({ document: parsed.data, isLiveDraft: true });
          }
        } catch {
          // ignore storage parse errors
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [templateId]);

  const resolved = useMemo(() => {
    const registry = createVariableRegistry(document.variables);
    const data = applyDefaults(registry, {});
    const guest = { name: "Bapak / Ibu / Saudara(i)" };
    return resolveDocument(document, data, guest);
  }, [document]);

  function handleReplay() {
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
            <span className={styles.liveBadge}>
              <span className={styles.pulseDot} />
              {isLiveDraft ? "Pratinjau Live Draft" : "Pratinjau Nyata"}
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
      <main className={styles.stage}>
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
