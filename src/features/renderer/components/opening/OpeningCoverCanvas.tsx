"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactElement } from "react";
import type { ResolvedDocument, ResolvedSection } from "@/lib/engine";
import type { RuntimeMode } from "../../types";
import { PublicImage } from "../PublicImage";
import styles from "./opening-canvas.module.css";
import rendererStyles from "../DocumentRenderer.module.css";

import type { ReactNode } from "react";

export interface OpeningCoverCanvasProps {
  readonly openingSection: ResolvedSection;
  readonly nextSectionId?: string;
  readonly tokens: ResolvedDocument["tokens"];
  readonly baseWidth: number;
  readonly runtimeMode: RuntimeMode;
  readonly onOpen?: () => void;
  readonly renderElements?: (section: ResolvedSection) => ReactElement[];
  readonly children?: ReactNode;
}

function TapHintIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a4 4 0 0 1 4 4v5" />
      <path d="M8 7a4 4 0 0 0-4 4v5a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3a2 2 0 0 0-2-2 2 2 0 0 0-2-2v-4a2 2 0 0 0-4 0v4" />
    </svg>
  );
}

export function OpeningCoverCanvas({
  openingSection,
  nextSectionId,
  tokens,
  baseWidth,
  renderElements,
  onOpen,
  children,
}: OpeningCoverCanvasProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleOpen = useCallback(() => {
    if (isClosing || isOpened) return;
    setIsClosing(true);

    // 1. Dispatch audio / music autoplay gesture event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dib:open-invitation", { detail: { timestamp: Date.now() } }));
      try {
        window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      } catch {
        // Fallback for environments where PointerEvent constructor isn't available
      }

      // 2. Trigger Section 1 entrance animations ("animasi untuk section 1 dia berjalan, animasi masuknya")
      window.dispatchEvent(
        new CustomEvent("dib:replay-animation", {
          detail: { sectionId: nextSectionId },
        }),
      );
    }

    const timer = setTimeout(() => {
      setIsOpened(true);
      setIsClosing(false);
      onOpen?.();
    }, 700);

    return () => clearTimeout(timer);
  }, [isClosing, isOpened, nextSectionId, onOpen]);

  // Lock body scroll while opening screen is active
  useEffect(() => {
    if (isOpened) {
      document.body.style.overflow = "";
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpened]);

  // Replay trigger from preview or tests
  useEffect(() => {
    const handleReplay = () => {
      setIsOpened(false);
      setIsClosing(false);
    };
    window.addEventListener("dib:replay-opening", handleReplay);
    return () => window.removeEventListener("dib:replay-opening", handleReplay);
  }, []);

  // Keyboard accessibility: Enter or Space opens invitation
  useEffect(() => {
    if (isOpened) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        handleOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpened, handleOpen]);

  if (isOpened) {
    return null;
  }

  const rawBg = typeof openingSection.background.color === "string"
    ? openingSection.background.color
    : openingSection.background.color?.token
      ? tokens.colors[openingSection.background.color.token]
      : undefined;

  const background = rawBg ?? (openingSection.background.image ? undefined : "#ffffff");

  return (
    <div
      className={`${styles.openingCoverRoot} ${isClosing ? styles.openingCoverClosing : ""}`}
      onClick={handleOpen}
      data-testid="opening-cover-canvas"
      data-section-id={openingSection.id}
      role="dialog"
      aria-modal="true"
      aria-label={openingSection.name || "Cover Opening (Section 0)"}
      tabIndex={0}
    >
      <div className={styles.canvasViewport}>
        <div
          className={`${styles.canvasInner} ${rendererStyles.sectionInner}`}
          style={
            {
              "--u": `calc(100cqw / ${baseWidth})`,
              aspectRatio: `${baseWidth} / ${openingSection.baseHeight}`,
              background,
              overflow: openingSection.overflow,
            } as CSSProperties
          }
        >
          {openingSection.background.image ? (
            <div className={rendererStyles.sectionBackground} aria-hidden="true">
              <PublicImage
                assetId={openingSection.background.image.assetId}
                alt=""
                width={baseWidth}
                height={openingSection.baseHeight}
                fit={openingSection.background.fit}
                priority={true}
              />
            </div>
          ) : null}

          {/* Designer-crafted elements on Section 0 */}
          {renderElements ? renderElements(openingSection) : children}
        </div>
      </div>

      {/* Floating click-to-open hint badge */}
      <div className={styles.openHintBanner} aria-hidden="true">
        <span className={styles.openHintIcon}>
          <TapHintIcon />
        </span>
        <span>Klik di mana saja untuk membuka undangan</span>
      </div>
    </div>
  );
}
