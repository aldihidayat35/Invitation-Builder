import { greetingParts } from "../logic";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface GuestGreetingWidgetProps {
  readonly guestName?: unknown;
  readonly prefix?: unknown;
  readonly fallback?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

/** "Kepada Yth. {guest}" with a generic fallback when no guest name is available (AC-06). */
export function GuestGreetingWidget({
  guestName,
  prefix,
  fallback,
  style,
}: GuestGreetingWidgetProps) {
  const parts = greetingParts({ guestName, prefix, fallback });
  const monogram = parts.name.trim().charAt(0).toLocaleUpperCase() || "T";
  return (
    <WidgetFrame type="guestGreeting" style={style}>
      <span className={styles.greetingMonogram} aria-hidden="true">
        {monogram}
      </span>
      <span className={styles.diamondLeft} aria-hidden="true">◆</span>
      <p className={styles.greeting}>
        <span className={styles.prefix}>{parts.prefix}</span>
        <span
          className={styles.name}
          data-testid="greeting-name"
          data-fallback={parts.usedFallback}
        >
          {parts.name}
        </span>
      </p>
      <span className={styles.diamondRight} aria-hidden="true">◆</span>
      <span className={styles.greetingOrnament} aria-hidden="true" />
    </WidgetFrame>
  );
}
