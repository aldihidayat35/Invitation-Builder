"use client";

import { useState } from "react";
import styles from "./landing.module.css";

interface FaqItem {
  q: string;
  a: string;
}

export function LandingFaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className={styles.faqContainer}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.q} className={styles.faqItem}>
            <button
              type="button"
              className={styles.faqQuestion}
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span
                className={styles.faqIcon}
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            {isOpen && (
              <div className={styles.faqAnswer}>
                <p style={{ margin: 0 }}>{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FloatingHeroAudioBadge() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      onClick={() => setIsPlaying(!isPlaying)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setIsPlaying(!isPlaying);
      }}
      className={styles.floatingCard2}
      style={{ cursor: "pointer" }}
      title="Klik untuk simulasi musik latar"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: isPlaying ? "#D4AF37" : "#EFE9DF",
          color: isPlaying ? "#2C221E" : "#84633F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 800,
          transition: "all 0.2s ease",
        }}
      >
        {isPlaying ? "❚❚" : "▶"}
      </div>
      <div>
        <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#84633F", textTransform: "uppercase" }}>
          Musik Latar
        </span>
        <strong style={{ fontSize: 12, color: "#2C221E" }}>
          {isPlaying ? "Sedang Memutar Romansa Akustik" : "Sentuh untuk Putar Musik"}
        </strong>
      </div>
    </div>
  );
}
