"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/features/analytics/track";
import { resolveWidgetStyleVariant } from "../widget-styles";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import { MusicIcon, PlayIcon } from "./WidgetIcons";

export interface MusicWidgetProps {
  readonly src?: unknown;
  readonly title?: unknown;
  readonly autoplay?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

const SAFE_SRC = /^(https?:\/\/|\/)/i;

/**
 * Background music control (FR-WDG-007). Play/pause is always rendered. The
 * audio element never preloads; autoplay is best-effort and only attempted
 * after the first user gesture. Any playback failure is swallowed.
 */
export function MusicWidget({ src, title, autoplay, style }: MusicWidgetProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = typeof src === "string" && SAFE_SRC.test(src) ? src : null;
  const label = typeof title === "string" && title.trim() ? title.trim() : "Putar musik";
  const currentVariant = resolveWidgetStyleVariant("music", style?.variant).kind === "current";

  async function start(): Promise<void> {
    const audio = audioRef.current;
    if (!audio || !url) return;
    try {
      await audio.play();
      setPlaying(true);
      setFailed(false);
      track("music_played");
    } catch {
      setPlaying(false);
      setFailed(true);
    }
  }

  useEffect(() => {
    if (autoplay !== true || !url) return;
    const attempt = () => {
      void start();
    };
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", attempt, opts);
    window.addEventListener("keydown", attempt, opts);
    return () => {
      window.removeEventListener("pointerdown", attempt);
      window.removeEventListener("keydown", attempt);
    };
    // `start` only reads refs/state setters; re-subscribing on url/autoplay is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, url]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void start();
    }
  }

  return (
    <WidgetFrame type="music" style={style}>
      {url ? (
        <audio ref={audioRef} src={url} preload="none" loop onError={() => setFailed(true)} />
      ) : null}
      <button
        type="button"
        className={styles.button}
        onClick={toggle}
        aria-pressed={playing}
        disabled={!url}
        data-testid="music-toggle"
      >
        {currentVariant ? (
          <>
            <span className={styles.musicDisc} aria-hidden="true">
              <MusicIcon className={styles.musicDiscNote} />
            </span>
            <span className={styles.musicToggleIcon} aria-hidden="true">
              <PlayIcon paused={playing} />
            </span>
            <span className={styles.musicCopy}>
              <small>{playing ? "Sedang diputar" : "Musik undangan"}</small>
              <span>{label}</span>
            </span>
            <span className={styles.equalizerBars} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </>
        ) : (
          <>
            <PlayIcon className={styles.legacyPlayIcon} paused={playing} aria-hidden="true" />
            {playing ? "Jeda" : "Putar"} · {label}
          </>
        )}
      </button>
      {currentVariant ? <span className={styles.musicProgress} aria-hidden="true" /> : null}
      {failed ? (
        <p className={styles.hint} role="status" data-testid="music-failed">
          Musik tidak dapat diputar.
        </p>
      ) : null}
    </WidgetFrame>
  );
}
