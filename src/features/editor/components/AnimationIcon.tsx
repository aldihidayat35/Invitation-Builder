"use client";

import type { SVGProps } from "react";

interface AnimationIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly presetId: string;
  readonly size?: number;
}

function Svg({
  size = 22,
  children,
  ...rest
}: {
  size?: number;
  children: React.ReactNode;
} & Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function AnimationPresetIcon({ presetId, size = 22, ...rest }: AnimationIconProps) {
  switch (presetId) {
    case "":
    case "none":
      // Tanpa Animasi / None: Circle with diagonal slash
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={1.8} />
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth={1.8} />
        </Svg>
      );

    // ==========================================
    // ENTER ANIMATIONS
    // ==========================================
    case "fadeIn":
      return (
        <Svg size={size} {...rest}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeDasharray="3 2"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.85" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth={1.5} />
        </Svg>
      );

    case "slideUp":
      return (
        <Svg size={size} {...rest}>
          <path d="M12 18V5M6 11l6-6 6 6" strokeWidth={2} />
          <path d="M5 21h14" strokeWidth={1.6} opacity="0.6" />
        </Svg>
      );

    case "slideDown":
      return (
        <Svg size={size} {...rest}>
          <path d="M12 6v13M6 13l6 6 6-6" strokeWidth={2} />
          <path d="M5 3h14" strokeWidth={1.6} opacity="0.6" />
        </Svg>
      );

    case "slideLeft":
      return (
        <Svg size={size} {...rest}>
          <path d="M18 12H5M11 6l-6 6 6 6" strokeWidth={2} />
          <path d="M21 5v14" strokeWidth={1.6} opacity="0.6" />
        </Svg>
      );

    case "slideRight":
      return (
        <Svg size={size} {...rest}>
          <path d="M6 12h13M13 6l6 6-6 6" strokeWidth={2} />
          <path d="M3 5v14" strokeWidth={1.6} opacity="0.6" />
        </Svg>
      );

    case "zoomIn":
      return (
        <Svg size={size} {...rest}>
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeWidth={1.8} />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </Svg>
      );

    case "rotateInSoft":
      return (
        <Svg size={size} {...rest}>
          <rect
            x="7"
            y="7"
            width="10"
            height="10"
            rx="2"
            transform="rotate(15 12 12)"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            opacity="0.5"
          />
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" strokeWidth={1.8} />
          <path d="M21 3v5h-5" strokeWidth={1.8} />
        </Svg>
      );

    case "charFade":
      return (
        <Svg size={size} {...rest}>
          <path d="M6 18l4-12 4 12M7.5 14h5" strokeWidth={1.8} />
          <circle cx="17" cy="8" r="1" fill="currentColor" opacity="0.35" />
          <circle cx="19" cy="12" r="1.3" fill="currentColor" opacity="0.65" />
          <circle cx="17" cy="16" r="1.6" fill="currentColor" />
        </Svg>
      );

    case "charRise":
      return (
        <Svg size={size} {...rest}>
          <path d="M5 18l3.5-11 3.5 11M6.2 14.5h4.6" strokeWidth={1.8} />
          <path d="M18 17V7M15 10l3-3 3 3" strokeWidth={1.8} />
        </Svg>
      );

    case "wordReveal":
      return (
        <Svg size={size} {...rest}>
          <rect
            x="3"
            y="6"
            width="6"
            height="4"
            rx="1"
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity="0.2"
          />
          <rect
            x="9"
            y="10"
            width="7"
            height="4"
            rx="1"
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity="0.5"
          />
          <rect
            x="15"
            y="14"
            width="6"
            height="4"
            rx="1"
            strokeWidth={1.5}
            fill="currentColor"
            fillOpacity="0.85"
          />
        </Svg>
      );

    case "letterSpread":
      return (
        <Svg size={size} {...rest}>
          <path d="M10 16l2-8 2 8M10.8 13.5h2.4" strokeWidth={1.8} />
          <path d="M5 12H2m0 0l2-2M2 12l2 2M19 12h3m0 0l-2-2m2 2l-2 2" strokeWidth={1.8} />
        </Svg>
      );

    // ==========================================
    // EXIT ANIMATIONS (OUT)
    // ==========================================
    case "fadeOut":
      return (
        <Svg size={size} {...rest}>
          <rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeDasharray="2 3"
            opacity="0.45"
          />
          <path d="M9 15l6-6M9 9l6 6" strokeWidth={1.8} opacity="0.8" />
        </Svg>
      );

    case "slideOut":
      // Geser Turun Keluar (Slide Down Exit)
      return (
        <Svg size={size} {...rest}>
          <path d="M12 4v12M7 11l5 5 5-5" strokeWidth={1.8} />
          <path d="M4 20h16" strokeWidth={2} />
        </Svg>
      );

    case "slideOutUp":
      // Geser Naik Keluar (Slide Up Exit)
      return (
        <Svg size={size} {...rest}>
          <path d="M12 20V8M7 13l5-5 5 5" strokeWidth={1.8} />
          <path d="M4 4h16" strokeWidth={2} />
        </Svg>
      );

    case "slideOutLeft":
      // Geser Kiri Keluar
      return (
        <Svg size={size} {...rest}>
          <path d="M20 12H8M13 7l-5 5 5 5" strokeWidth={1.8} />
          <path d="M4 4v16" strokeWidth={2} />
        </Svg>
      );

    case "slideOutRight":
      // Geser Kanan Keluar
      return (
        <Svg size={size} {...rest}>
          <path d="M4 12h12M11 7l5 5-5 5" strokeWidth={1.8} />
          <path d="M20 4v16" strokeWidth={2} />
        </Svg>
      );

    case "zoomOut":
      return (
        <Svg size={size} {...rest}>
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeWidth={1.6} />
          <path d="M9 9l-4-4M15 9l4-4M9 15l-4 4M15 15l4 4" strokeWidth={1.6} />
        </Svg>
      );

    // ==========================================
    // ATTENTION / LAIN-LAIN (CONTINUOUS / LOOP)
    // ==========================================
    case "float":
      return (
        <Svg size={size} {...rest}>
          <circle
            cx="12"
            cy="6"
            r="2.5"
            fill="currentColor"
            fillOpacity="0.4"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <path d="M3 17c3-3 6-3 9 0s6 3 9 0M3 13c3-3 6-3 9 0s6 3 9 0" strokeWidth={1.8} />
        </Svg>
      );

    case "pulseSoft":
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle
            cx="12"
            cy="12"
            r="6"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeDasharray="3 2"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.3} opacity="0.6" />
        </Svg>
      );

    case "sway":
      return (
        <Svg size={size} {...rest}>
          <path d="M12 3v10" strokeWidth={1.8} />
          <circle cx="12" cy="15" r="2.5" fill="currentColor" />
          <path d="M6 19a8 8 0 0 0 12 0M5 17l1 2.5 2.5-.5M19 17l-1 2.5-2.5-.5" strokeWidth={1.5} />
        </Svg>
      );

    case "heartbeat":
      return (
        <Svg size={size} {...rest}>
          <path
            d="M12 20.2l-1.3-1.2C5.4 14.6 2 11.5 2 7.7 2 4.6 4.4 2.2 7.5 2.2c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1 3.1 0 5.5 2.4 5.5 5.5 0 3.8-3.4 6.9-8.7 11.3L12 20.2z"
            strokeWidth={1.6}
            fill="none"
          />
          <path d="M6.5 11h2l1.5-3 2 6 1.5-3h4" strokeWidth={1.6} />
        </Svg>
      );

    case "bounce":
      return (
        <Svg size={size} {...rest}>
          <circle cx="6" cy="6" r="2.5" fill="currentColor" />
          <path d="M6 10c2 4 4 8 7 8 2.5 0 4-3 5-7M3 20h18" strokeWidth={1.8} />
        </Svg>
      );

    case "shimmer":
      return (
        <Svg size={size} {...rest}>
          <path
            d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16zM5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6L5 16z"
            fill="currentColor"
            stroke="none"
          />
        </Svg>
      );

    // ==========================================
    // MOTION PATH PRESETS
    // ==========================================
    case "leftToRight":
      return (
        <Svg size={size} {...rest}>
          <circle cx="5" cy="12" r="2" fill="currentColor" />
          <path d="M7 12h11M15 8l4 4-4 4" strokeWidth={1.8} />
        </Svg>
      );

    case "rightToLeft":
      return (
        <Svg size={size} {...rest}>
          <circle cx="19" cy="12" r="2" fill="currentColor" />
          <path d="M17 12H6M9 8l-4 4 4 4" strokeWidth={1.8} />
        </Svg>
      );

    case "topToBottom":
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="5" r="2" fill="currentColor" />
          <path d="M12 7v11M8 15l4 4 4-4" strokeWidth={1.8} />
        </Svg>
      );

    case "bottomToTop":
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="19" r="2" fill="currentColor" />
          <path d="M12 17V6M8 9l4-4 4 4" strokeWidth={1.8} />
        </Svg>
      );

    case "diagonalDownRight":
      return (
        <Svg size={size} {...rest}>
          <circle cx="6" cy="6" r="2" fill="currentColor" />
          <path d="M7.5 7.5 17 17M12 17h5v-5" strokeWidth={1.8} />
        </Svg>
      );

    case "diagonalUpRight":
      return (
        <Svg size={size} {...rest}>
          <circle cx="6" cy="18" r="2" fill="currentColor" />
          <path d="M7.5 16.5 17 7M12 7h5v5" strokeWidth={1.8} />
        </Svg>
      );

    case "arcUp":
      return (
        <Svg size={size} {...rest}>
          <circle cx="4" cy="17" r="2" fill="currentColor" />
          <path d="M5 15C8 7 16 7 19 15" strokeWidth={1.8} />
          <circle cx="20" cy="17" r="2" fill="currentColor" />
        </Svg>
      );

    case "arcDown":
      return (
        <Svg size={size} {...rest}>
          <circle cx="4" cy="7" r="2" fill="currentColor" />
          <path d="M5 9C8 17 16 17 19 9" strokeWidth={1.8} />
          <circle cx="20" cy="7" r="2" fill="currentColor" />
        </Svg>
      );

    case "waveHorizontal":
      return (
        <Svg size={size} {...rest}>
          <circle cx="4" cy="12" r="2" fill="currentColor" />
          <path d="M5 12c3-6 5-6 8 0s5 6 7 0" strokeWidth={1.8} />
        </Svg>
      );

    case "circleOrbit":
      return (
        <Svg size={size} {...rest}>
          <ellipse cx="12" cy="12" rx="8" ry="6" strokeWidth={1.8} strokeDasharray="3 2" />
          <circle cx="20" cy="12" r="2.5" fill="currentColor" />
        </Svg>
      );

    case "custom":
      return (
        <Svg size={size} {...rest}>
          <circle cx="5" cy="18" r="2" fill="currentColor" />
          <circle cx="12" cy="7" r="2" fill="currentColor" />
          <circle cx="19" cy="15" r="2" fill="currentColor" />
          <path d="M6 17 11 8l7 6" strokeWidth={1.5} strokeDasharray="2 2" />
        </Svg>
      );

    default:
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth={1.8} />
          <path d="M9 12h6M12 9v6" strokeWidth={1.8} />
        </Svg>
      );
  }
}
