"use client";

import { useSyncExternalStore } from "react";
import {
  COUNTDOWN_UNITS,
  DEFAULT_COUNTDOWN_LABELS,
  computeCountdown,
  type CountdownUnit,
} from "../logic";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

// One shared 1 s ticker for every countdown on the page. It starts with the first
// subscriber and is cleared with the last one, so unmounting never leaks a timer.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  snapshot = currentSecond();
  timer ??= setInterval(() => {
    snapshot = currentSecond();
    listeners.forEach((l) => l());
  }, 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  if (snapshot === 0) snapshot = currentSecond();
  return snapshot;
}

/** Server/hydration render has no clock: it shows placeholders, avoiding a hydration mismatch. */
const getServerSnapshot = (): number | null => null;

export interface CountdownWidgetProps {
  readonly targetDateTime?: unknown;
  readonly labels?: unknown;
  readonly afterState?: unknown;
  readonly afterMessage?: unknown;
  readonly style?: WidgetStyleProps | undefined;
  /** Test/preview hook: fixes the clock instead of subscribing to the real one. */
  readonly nowMs?: number;
}

function resolveLabels(value: unknown): Record<CountdownUnit, string> {
  const labels: Record<CountdownUnit, string> = { ...DEFAULT_COUNTDOWN_LABELS };
  if (value && typeof value === "object") {
    for (const unit of COUNTDOWN_UNITS) {
      const v = (value as Record<string, unknown>)[unit];
      if (typeof v === "string" && v.trim() !== "") labels[unit] = v.trim();
    }
  }
  return labels;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CountdownWidget(props: CountdownWidgetProps) {
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const now = props.nowMs ?? live;
  const labels = resolveLabels(props.labels);
  const result = now === null ? null : computeCountdown(props.targetDateTime, now);

  if (result?.state === "elapsed" && props.afterState === "hide") return null;

  return (
    <WidgetFrame type="countdown" style={props.style}>
      {result?.state === "elapsed" ? (
        <p className={styles.message} data-testid="countdown-after">
          {typeof props.afterMessage === "string" && props.afterMessage.trim() !== ""
            ? props.afterMessage
            : "Acara telah dimulai"}
        </p>
      ) : (
        <div
          className={styles.countdown}
          data-testid="countdown"
          data-state={result?.state ?? "pending"}
          role="timer"
          aria-live="off"
        >
          {COUNTDOWN_UNITS.map((unit, index) => (
            <div className={styles.unit} key={unit} data-unit={unit}>
              <span className={styles.value} data-testid={`countdown-${unit}`}>
                {result?.state === "counting" ? pad(result[unit]) : "--"}
              </span>
              <span className={styles.unitLabel}>{labels[unit]}</span>
              {index < COUNTDOWN_UNITS.length - 1 ? (
                <span className={styles.unitDivider} aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </WidgetFrame>
  );
}
