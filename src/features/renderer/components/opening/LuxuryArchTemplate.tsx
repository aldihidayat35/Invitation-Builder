"use client";

import type { OpeningTemplateProps } from "./types";
import styles from "./opening.module.css";

export function LuxuryArchTemplate({
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
  return (
    <div
      className={`${styles.contentShell} ${styles.luxuryArch} ${isClosing ? styles.closingCurtainSplit : ""}`}
      data-testid="opening-template-luxury-arch"
    >
      <div className={styles.archWindow}>
        {/* Royal Crest / Flourish */}
        <div className={styles.archFlourish} aria-hidden="true">
          ⚜ 👑 ⚜
        </div>

        <span className={styles.eyebrowBadge} style={{ color: "#d4af37" }}>
          {title}
        </span>

        {subtitle ? (
          <p style={{ fontSize: "0.85rem", color: "#e6ca65", letterSpacing: "0.12em", margin: "0.25rem 0" }}>
            {subtitle}
          </p>
        ) : null}

        <h1 className={`${styles.coupleTitle} ${styles.goldMetallicText}`}>
          {coupleName}
        </h1>

        {dateText ? (
          <p className={styles.dateBadge} style={{ color: "#fdf6e2", opacity: 0.9 }}>
            {dateText}
          </p>
        ) : null}

        {locationText ? (
          <p style={{ fontSize: "0.75rem", color: "#d4af37", marginTop: "0.25rem", opacity: 0.85 }}>
            🏛 {locationText}
          </p>
        ) : null}

        {/* Royal Decree Guest Box */}
        <div
          className={styles.guestBox}
          style={{
            background: "rgba(212, 175, 55, 0.08)",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            color: "#fdf6e2",
            marginTop: "1.75rem",
          }}
        >
          <span className={styles.guestPrefix} style={{ color: "#e6ca65" }}>
            {guestLabel}
          </span>
          <span
            className={styles.guestName}
            style={{ color: "#ffffff", textShadow: "0 0 12px rgba(212, 175, 55, 0.5)" }}
            data-testid="opening-guest-name"
          >
            {guestName}
          </span>
          <span className={styles.guestNote} style={{ color: "#e6ca65" }}>
            Tamu Kehormatan
          </span>
        </div>

        {/* Golden Gate CTA Button */}
        <button
          type="button"
          className={`${styles.openButton} ${styles.goldArchBtn}`}
          onClick={onOpen}
          data-testid="opening-open-btn"
        >
          <span>🗝</span>
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}
