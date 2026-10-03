"use client";

import type { CSSProperties, ReactElement } from "react";
import styles from "./text-splitter.module.css";

export interface AccessibleAnimatedTextProps {
  readonly text: string;
  readonly staggerUnit?: "none" | "char" | "word";
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Renders text with visual splitting for letter-by-letter or word-by-word
 * animation while preserving 100% accessible semantics for screen readers (NFR-A11Y-001, FR-ANM-004).
 */
export function AccessibleAnimatedText({
  text,
  staggerUnit = "none",
  className,
  style,
}: AccessibleAnimatedTextProps): ReactElement {
  if (staggerUnit === "none" || !text) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  // Split into alternating words and whitespace tokens
  const tokens = text.split(/(\s+)/);

  return (
    <span
      className={`${styles.accessibleRoot} ${className ?? ""}`.trim()}
      style={style}
      aria-label={text}
      role="text"
      data-testid="accessible-animated-text"
      data-stagger-unit={staggerUnit}
    >
      <span aria-hidden="true" className={styles.visualContainer}>
        {tokens.map((token, tokenIdx) => {
          // If token is whitespace
          if (/^\s+$/.test(token)) {
            return (
              <span key={`ws-${tokenIdx}`} className={styles.space}>
                {token}
              </span>
            );
          }

          if (staggerUnit === "word") {
            return (
              <span
                key={`w-${tokenIdx}`}
                data-anim-word
                className={styles.word}
              >
                {token}
              </span>
            );
          }

          // staggerUnit === "char"
          return (
            <span key={`wb-${tokenIdx}`} className={styles.wordBlock}>
              {Array.from(token).map((char, charIdx) => (
                <span
                  key={`c-${tokenIdx}-${charIdx}`}
                  data-anim-char
                  className={styles.char}
                >
                  {char}
                </span>
              ))}
            </span>
          );
        })}
      </span>
    </span>
  );
}
