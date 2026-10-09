"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ResolvedDocumentAudio } from "@/lib/engine";
import type { ThemeTokens } from "@/lib/schema";
import styles from "./GlobalBacksoundPlayer.module.css";

export interface GlobalBacksoundPlayerProps {
  readonly audio: ResolvedDocumentAudio;
  readonly hasOpening: boolean;
  readonly tokens?: ThemeTokens;
}

function MusicNoteIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx={6} cy={18} r={3} />
      <circle cx={18} cy={16} r={3} />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={7} height={7} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x={6} y={4} width={4} height={16} rx={1} />
      <rect x={14} y={4} width={4} height={16} rx={1} />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width={7} height={7} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function GlobalBacksoundPlayer({
  audio,
  hasOpening,
  tokens,
}: GlobalBacksoundPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [opened, setOpened] = useState(!hasOpening);
  const [showTooltip, setShowTooltip] = useState(false);

  const accentColor =
    tokens?.colors?.accent ??
    tokens?.colors?.primary ??
    "#d4af37";

  const positionClass =
    audio.position === "bottom-left"
      ? styles.pos_bottom_left
      : audio.position === "top-right"
        ? styles.pos_top_right
        : audio.position === "top-left"
          ? styles.pos_top_left
          : styles.pos_bottom_right;

  // 1. Koordinasi dengan Cover Opening:
  // Ketika tombol "Buka Undangan" diklik, event 'dib:open-invitation' dikirim oleh OpeningCoverCanvas
  useEffect(() => {
    if (!hasOpening) return;

    const handleOpen = () => {
      setOpened(true);
      if (audio.autoplayOnOpen !== false && audioRef.current) {
        audioRef.current
          .play()
          .then(() => setPlaying(true))
          .catch(() => {
            // Browser autoplay restrictions fallback
          });
      }
    };

    window.addEventListener("dib:open-invitation", handleOpen);
    return () => window.removeEventListener("dib:open-invitation", handleOpen);
  }, [hasOpening, audio.autoplayOnOpen]);

  // 2. Jika template TIDAK memiliki opening, putar pada interaksi pertama tamu
  useEffect(() => {
    if (hasOpening || !audio.src) return;

    const startOnGesture = () => {
      if (audioRef.current && !playing) {
        audioRef.current
          .play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }
    };

    window.addEventListener("pointerdown", startOnGesture, { once: true });
    window.addEventListener("scroll", startOnGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startOnGesture);
      window.removeEventListener("scroll", startOnGesture);
    };
  }, [hasOpening, audio.src, playing]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  if (!audio.src) return null;

  const trackTitle = audio.title?.trim() || "Musik Latar Undangan";

  return (
    <>
      <audio
        ref={audioRef}
        src={audio.src}
        loop={audio.loop !== false}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (!audio.loop) setPlaying(false);
        }}
      />

      <aside
        className={`${styles.playerRoot} ${positionClass}`}
        data-hidden={hasOpening && !opened}
        style={{ "--audio-accent": accentColor } as CSSProperties}
        aria-label="Pemutar musik latar global"
      >
        {showTooltip && (
          <div className={styles.trackTooltip} role="status">
            {playing ? `▶ ${trackTitle}` : `⏸ ${trackTitle} (Dijeda)`}
          </div>
        )}

        <button
          type="button"
          className={styles.discButton}
          onClick={toggle}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label={playing ? `Jeda musik: ${trackTitle}` : `Putar musik: ${trackTitle}`}
          aria-pressed={playing}
          data-testid="global-backsound-disc"
          title={trackTitle}
        >
          {playing && <span className={styles.pulseRing} aria-hidden="true" />}
          <div className={styles.discGrooves} aria-hidden="true" />

          <div
            className={`${styles.discCenter} ${playing ? styles.discSpinning : styles.discPaused}`}
            aria-hidden="true"
          >
            <MusicNoteIcon />
            <span className={styles.discHole} />
          </div>

          <span className={styles.statusBadge} aria-hidden="true">
            {playing ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      </aside>
    </>
  );
}
