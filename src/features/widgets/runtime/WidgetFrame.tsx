import type { CSSProperties, ReactNode } from "react";
import styles from "./runtime.module.css";

/** Plain CSS values already resolved from theme tokens by the renderer. */
export interface WidgetStyleProps {
  readonly color?: string;
  readonly background?: string;
  readonly radius?: number;
  readonly opacity?: number;
}

export function WidgetFrame({
  type,
  style,
  className,
  children,
}: {
  type: string;
  style?: WidgetStyleProps | undefined;
  className?: string;
  children: ReactNode;
}) {
  const vars: Record<string, string | number> = {};
  if (style?.color) vars["--widget-color"] = style.color;
  if (style?.background) vars["--widget-bg"] = style.background;
  if (style?.radius !== undefined) vars["--widget-radius"] = `${style.radius}px`;
  if (style?.opacity !== undefined) vars["--widget-opacity"] = style.opacity;
  return (
    <div
      className={[styles.widget, className].filter(Boolean).join(" ")}
      style={vars as CSSProperties}
      data-widget={type}
    >
      {children}
    </div>
  );
}
