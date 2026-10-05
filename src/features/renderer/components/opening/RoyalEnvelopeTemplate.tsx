"use client";

import type { OpeningTemplateProps } from "./types";
import styles from "./opening.module.css";

export function RoyalEnvelopeTemplate({
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
  // Extract couple initials for wax seal monogram
  const initials = coupleName
    .split("&")
    .map((s) => s.trim()[0])
    .filter(Boolean)
    .join(" & ") || "W";

  return (
    <div
      className={`${styles.contentShell} ${styles.royalEnvelope} ${isClosing ? styles.closingFadeOut : ""}`}
      data-testid="opening-template-royal-envelope"
    >
      <div className={styles.envelopeContainer}>
        {/* Envelope Body */}
        <div className={styles.envelopeBody} />

        {/* 3D Top Flap */}
        <div
          className={`${styles.envelopeFlap} ${isClosing ? styles.envelopeFlapOpen : ""}`}
          aria-hidden="true"
        />

        {/* Letter Card Inside */}
        <div
          className={`${styles.envelopeCard} ${isClosing ? styles.envelopeCardSlideUp : ""}`}
        >
          <div className={styles.envelopeCardBorder} />

          <div>
            <span className={styles.eyebrowBadge} style={{ color: "#b8860b" }}>
              {title}
            </span>
            {subtitle ? (
              <p style={{ fontSize: "0.8rem", color: "#6b5e4f", margin: "0 0 0.5rem" }}>
                {subtitle}
              </p>
            ) : null}
            <h1
              className={styles.coupleTitle}
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#2c251e" }}
            >
              {coupleName}
            </h1>
            {dateText ? (
              <p className={styles.dateBadge} style={{ color: "#7a6b58" }}>
                {dateText}
              </p>
            ) : null}
            {locationText ? (
              <p style={{ fontSize: "0.75rem", color: "#8c7e6c", marginTop: "0.25rem" }}>
                📍 {locationText}
              </p>
            ) : null}
          </div>

          {/* Guest Greeting Card */}
          <div
            className={styles.guestBox}
            style={{
              background: "rgba(212, 175, 55, 0.08)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              color: "#3d3224",
            }}
          >
            <span className={styles.guestPrefix}>{guestLabel}</span>
            <span className={styles.guestName} data-testid="opening-guest-name">
              {guestName}
            </span>
            <span className={styles.guestNote}>Di Tempat</span>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            className={styles.openButton}
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #aa771c 100%)",
              color: "#ffffff",
            }}
            onClick={onOpen}
            data-testid="opening-open-btn"
          >
            <span>✉️</span>
            <span>{buttonText}</span>
          </button>
        </div>

        {/* 3D Wax Seal Stamp (can also be tapped) */}
        {!isClosing && (
          <button
            type="button"
            className={styles.waxSealBtn}
            onClick={onOpen}
            title={buttonText}
            aria-label={buttonText}
            style={{ position: "absolute", bottom: "10px", left: "calc(50% - 34px)" }}
          >
            <span className={styles.waxSealMonogram}>{initials}</span>
            <span className={styles.waxSealSub}>Buka</span>
          </button>
        )}
      </div>
    </div>
  );
}
