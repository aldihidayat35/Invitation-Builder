"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedOpeningScreen } from "@/lib/engine";
import { assetUrl } from "@/features/assets/urls";
import { usePublicContext } from "@/features/widgets/runtime";
import { RoyalEnvelopeTemplate } from "./RoyalEnvelopeTemplate";
import { ModernEditorialTemplate } from "./ModernEditorialTemplate";
import { LuxuryArchTemplate } from "./LuxuryArchTemplate";
import { BotanicalWatercolorTemplate } from "./BotanicalWatercolorTemplate";
import { CinematicGlassTemplate } from "./CinematicGlassTemplate";
import styles from "./opening.module.css";

export interface OpeningScreenProps {
  readonly opening: ResolvedOpeningScreen;
  readonly onOpen?: () => void;
  /** When true in preview/editor, forces the opening screen to stay visible. */
  readonly forceVisible?: boolean;
}

export function OpeningScreen({ opening, onOpen, forceVisible }: OpeningScreenProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const publicContext = usePublicContext();
  const guestName = publicContext?.guestName || "Tamu Undangan";

  const handleOpen = useCallback(() => {
    if (isClosing || isOpened) return;
    setIsClosing(true);

    // Trigger audio / music widget autoplay via simulated user interaction gesture
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dib:open-invitation", { detail: { timestamp: Date.now() } }));
      // Also emit pointerdown so audio elements with pointerdown listeners can play safely
      try {
        window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      } catch {
        // Fallback for environments where PointerEvent constructor isn't available
      }
    }

    const timer = setTimeout(() => {
      setIsOpened(true);
      setIsClosing(false);
      onOpen?.();
    }, 750);

    return () => clearTimeout(timer);
  }, [isClosing, isOpened, onOpen]);

  // Lock body scroll while opening screen is active
  useEffect(() => {
    if (isOpened && !forceVisible) {
      document.body.style.overflow = "";
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpened, forceVisible]);

  // Allow re-playing the opening screen via custom event
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

  if (isOpened && !forceVisible) {
    return null;
  }

  const templateProps = {
    title: opening.title,
    subtitle: opening.subtitle,
    coupleName: opening.coupleName,
    dateText: opening.dateText,
    locationText: opening.locationText,
    guestLabel: opening.guestLabel,
    guestName,
    buttonText: opening.buttonText,
    isClosing,
    onOpen: handleOpen,
  };

  const bgImageUrl = opening.bgImage ? assetUrl(opening.bgImage.assetId) : undefined;

  return (
    <div
      className={`${styles.openingRoot} ${isOpened && !forceVisible ? styles.openingHidden : ""}`}
      data-testid="opening-screen"
      role="dialog"
      aria-modal="true"
      aria-label={`${opening.title} - ${opening.coupleName}`}
    >
      {/* Optional Custom Background Image */}
      {bgImageUrl ? (
        <>
          <div
            className={styles.bgImageLayer}
            style={{ backgroundImage: `url(${bgImageUrl})` }}
            aria-hidden="true"
          />
          <div
            className={styles.bgOverlay}
            style={{
              backgroundColor: "rgba(0, 0, 0, " + (opening.overlayOpacity ?? 0.4) + ")",
            }}
            aria-hidden="true"
          />
        </>
      ) : null}

      {/* Render Selected Template */}
      {opening.template === "modern-editorial" ? (
        <ModernEditorialTemplate {...templateProps} />
      ) : opening.template === "luxury-arch" ? (
        <LuxuryArchTemplate {...templateProps} />
      ) : opening.template === "botanical-watercolor" ? (
        <BotanicalWatercolorTemplate {...templateProps} />
      ) : opening.template === "cinematic-glass" ? (
        <CinematicGlassTemplate {...templateProps} />
      ) : (
        <RoyalEnvelopeTemplate {...templateProps} />
      )}
    </div>
  );
}
