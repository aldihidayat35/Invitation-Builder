"use client";

import type { OpeningTemplateProps } from "./types";
import styles from "./opening.module.css";

export function ModernEditorialTemplate({
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
      className={`${styles.contentShell} ${styles.modernEditorial} ${isClosing ? styles.closingSlideUp : ""}`}
      data-testid="opening-template-modern-editorial"
    >
      <div className={styles.editorialFrame}>
        {/* Precise corner markers */}
        <div className={`${styles.cornerMarker} ${styles.cornerTL}`} />
        <div className={`${styles.cornerMarker} ${styles.cornerTR}`} />
        <div className={`${styles.cornerMarker} ${styles.cornerBL}`} />
        <div className={`${styles.cornerMarker} ${styles.cornerBR}`} />

        <div className={styles.editorialIssue}>
          INVITATION ISSUE · SPECIAL EDITION
        </div>

        <span className={styles.eyebrowBadge} style={{ color: "#737373" }}>
          {title}
        </span>

        <h1 className={`${styles.coupleTitle} ${styles.editorialTitle}`}>
          {coupleName}
        </h1>

        <div className={styles.editorialDivider} />

        {subtitle ? (
          <p style={{ fontSize: "0.825rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#525252", margin: "0.5rem 0" }}>
            {subtitle}
          </p>
        ) : null}

        {dateText ? (
          <p className={styles.dateBadge} style={{ color: "#171717", fontWeight: 600 }}>
            {dateText}
          </p>
        ) : null}

        {locationText ? (
          <p style={{ fontSize: "0.75rem", color: "#737373", letterSpacing: "0.05em", marginTop: "0.25rem" }}>
            {locationText}
          </p>
        ) : null}

        {/* Guest Ticket Box */}
        <div
          className={styles.guestBox}
          style={{
            background: "#fafafa",
            border: "1px dashed #d4d4d4",
            color: "#171717",
            marginTop: "2rem",
          }}
        >
          <span className={styles.guestPrefix}>{guestLabel}</span>
          <span className={styles.guestName} data-testid="opening-guest-name">
            {guestName}
          </span>
          <span className={styles.guestNote}>Tamu Spesial</span>
        </div>

        {/* Editorial Button */}
        <button
          type="button"
          className={`${styles.openButton} ${styles.editorialBtn}`}
          onClick={onOpen}
          data-testid="opening-open-btn"
        >
          <span>{buttonText}</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}
