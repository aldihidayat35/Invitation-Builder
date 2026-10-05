"use client";

import type { OpeningTemplateProps } from "./types";
import styles from "./opening.module.css";

const PETALS = [
  { left: "10%", delay: "0s", duration: "7s" },
  { left: "25%", delay: "2s", duration: "9s" },
  { left: "45%", delay: "1s", duration: "8s" },
  { left: "65%", delay: "3.5s", duration: "10s" },
  { left: "80%", delay: "0.5s", duration: "8.5s" },
  { left: "92%", delay: "2.5s", duration: "9.5s" },
];

export function BotanicalWatercolorTemplate({
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
      className={`${styles.contentShell} ${styles.botanicalWatercolor} ${isClosing ? styles.closingFadeOut : ""}`}
      data-testid="opening-template-botanical-watercolor"
    >
      {/* Floating Petals Layer */}
      <div className={styles.floatingPetalsContainer} aria-hidden="true">
        {PETALS.map((p, idx) => (
          <div
            key={idx}
            className={styles.petal}
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className={styles.floralWreathBox}>
        <div className={styles.botanicalIcon} aria-hidden="true">
          🌿
        </div>

        <span className={styles.eyebrowBadge} style={{ color: "#557153" }}>
          {title}
        </span>

        {subtitle ? (
          <p style={{ fontSize: "0.8rem", color: "#7d8f78", margin: "0 0 0.5rem" }}>
            {subtitle}
          </p>
        ) : null}

        <h1
          className={styles.coupleTitle}
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#2d3b2f" }}
        >
          {coupleName}
        </h1>

        {dateText ? (
          <p className={styles.dateBadge} style={{ color: "#557153", fontWeight: 600 }}>
            {dateText}
          </p>
        ) : null}

        {locationText ? (
          <p style={{ fontSize: "0.75rem", color: "#6b7d6a", marginTop: "0.25rem" }}>
            📍 {locationText}
          </p>
        ) : null}

        {/* Botanical Guest Box */}
        <div
          className={styles.guestBox}
          style={{
            background: "rgba(85, 113, 83, 0.08)",
            border: "1px solid rgba(85, 113, 83, 0.25)",
            color: "#2d3b2f",
            marginTop: "1.75rem",
          }}
        >
          <span className={styles.guestPrefix} style={{ color: "#557153" }}>
            {guestLabel}
          </span>
          <span className={styles.guestName} data-testid="opening-guest-name">
            {guestName}
          </span>
          <span className={styles.guestNote} style={{ color: "#7d8f78" }}>
            Bapak/Ibu/Saudara/i
          </span>
        </div>

        {/* Botanical Button */}
        <button
          type="button"
          className={`${styles.openButton} ${styles.botanicalBtn}`}
          onClick={onOpen}
          data-testid="opening-open-btn"
        >
          <span>❀</span>
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}
