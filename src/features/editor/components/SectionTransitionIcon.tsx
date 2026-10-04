"use client";

import type { SVGProps } from "react";
import type { SectionTransitionType } from "@/lib/schema";

interface SectionTransitionIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly transitionType: SectionTransitionType | string;
  readonly size?: number;
}

function Svg({
  size = 20,
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

export function SectionTransitionIcon({
  transitionType,
  size = 20,
  ...rest
}: SectionTransitionIconProps) {
  switch (transitionType) {
    case "none":
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="12" r="8.5" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      );

    case "fade":
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="2.5" strokeDasharray="3 3" />
          <rect x="7" y="7" width="10" height="10" rx="1.5" />
        </Svg>
      );

    case "slideUp":
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="14" width="16" height="6" rx="1.5" />
          <path d="M12 11V3M8 7l4-4 4 4" />
        </Svg>
      );

    case "slideDown":
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="4" width="16" height="6" rx="1.5" />
          <path d="M12 13v8M8 17l4 4 4-4" />
        </Svg>
      );

    case "slideLeft":
      return (
        <Svg size={size} {...rest}>
          <rect x="14" y="4" width="6" height="16" rx="1.5" />
          <path d="M11 12H3M7 8l-4 4 4 4" />
        </Svg>
      );

    case "slideRight":
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="4" width="6" height="16" rx="1.5" />
          <path d="M13 12h8M17 8l4 4-4 4" />
        </Svg>
      );

    case "zoomIn":
      return (
        <Svg size={size} {...rest}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" strokeDasharray="3 3" />
          <rect x="8" y="8" width="8" height="8" rx="1.5" />
          <path d="M12 5v2M12 17v2M5 12h2M17 12h2" />
        </Svg>
      );

    case "zoomOut":
      return (
        <Svg size={size} {...rest}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <rect x="8" y="8" width="8" height="8" rx="1.5" strokeDasharray="2 2" />
          <path d="M9 5l3 3-3 3M15 19l-3-3 3-3" />
        </Svg>
      );

    case "flipUp":
      return (
        <Svg size={size} {...rest}>
          <path d="M4 18h16l-3-12H7L4 18Z" />
          <path d="M12 14v-4M9 12l3-3 3 3" />
        </Svg>
      );

    case "flipDown":
      return (
        <Svg size={size} {...rest}>
          <path d="M4 6h16l-3 12H7L4 6Z" />
          <path d="M12 10v4M9 12l3 3 3-3" />
        </Svg>
      );

    case "curtain":
      return (
        <Svg size={size} {...rest}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M12 4v16" strokeDasharray="2 2" />
          <path d="M7 8c1 2 2 4 2 8M17 8c-1 2-2 4-2 8" />
        </Svg>
      );

    case "blur":
      return (
        <Svg size={size} {...rest}>
          <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </Svg>
      );

    case "book":
      return (
        <Svg size={size} {...rest}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          <path d="M12 6v10" />
        </Svg>
      );

    default:
      return (
        <Svg size={size} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
        </Svg>
      );
  }
}
