"use client";

import type { OpeningTemplateProps } from "./types";
import styles from "./opening.module.css";

export function CinematicGlassTemplate({
  title,
  subtitle,
  coupleName,
  dateText,
  locationText,
  guestLabel,
  guestName,
  buttonText,
  isClosing,
  onOpen,
}: OpeningTemplateProps) {
  // Extract couple monogram initials
  const initials = coupleName
    .split("&")
    .map((s) => s.trim()[0])
    .filter(Boolean)
    .join(" & ") || "C";

  return (
    <div
      className={`${styles.contentShell} ${styles.cinematicGlass} ${isClosing ? styles.closingFadeOut : ""}`}
      data-testid="opening-template-cinematic-glass"
    >
      {/* Ambient Aurora Orbs */}
      <div className={styles.auroraMesh} aria-hidden="true">
        <div className={styles.auroraOrb1} />
        <div className={styles.auroraOrb2} />
      </div>

      <div className={styles.glassCard}>
        {/* Monogram Seal */}
        <div className={styles.glassMonogram} aria-hidden="true">
          <span>{initials}</span>
        </div>

        <span className={styles.eyebrowBadge} style={{ color: "#f472b6" }}>
          {title}
        </span>

        {subtitle ? (
          <p style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.7)", letterSpacing: "0.1em", margin: "0.25rem 0" }}>
            {subtitle}
          </p>
        ) : null}

        <h1
          className={styles.coupleTitle}
          style={{
            fontFamily: "'Outfit', sans-serif",
            background: "linear-gradient(135deg, #ffffff 0%, #fbcfe8 50%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {coupleName}
        </h1>

        {dateText ? (
          <p className={styles.dateBadge} style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            ✨ {dateText}
          </p>
        ) : null}

        {locationText ? (
          <p style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.65)", marginTop: "0.25rem" }}>
            📍 {locationText}
          </p>
        ) : null}

        {/* Glass Guest Box */}
        <div
          className={styles.guestBox}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            marginTop: "1.75rem",
          }}
        >
          <span className={styles.guestPrefix} style={{ color: "rgba(255, 255, 255, 0.75)" }}>
            {guestLabel}
          </span>
          <span
            className={styles.guestName}
            style={{ color: "#ffffff", textShadow: "0 0 16px rgba(244, 114, 182, 0.6)" }}
            data-testid="opening-guest-name"
          >
            {guestName}
          </span>
          <span className={styles.guestNote} style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            Tamu Undangan
          </span>
        </div>

        {/* Cinematic Button */}
        <button
          type="button"
          className={`${styles.openButton} ${styles.glassBtn}`}
          onClick={onOpen}
          data-testid="opening-open-btn"
        >
          <span>✨</span>
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}
