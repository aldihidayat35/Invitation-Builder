/**
 * Minimal inline SVG icon set for the editor chrome (no icon dependency).
 * Icons are decorative: callers provide the accessible name (aria-label/text).
 */
import type { ReactNode, SVGProps } from "react";
import type { Element } from "@/lib/schema";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { readonly size?: number };

function Svg({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
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

export const IconText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6V4h14v2M12 4v16M9 20h6" />
  </Svg>
);
export const IconSquare = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
  </Svg>
);
export const IconCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
  </Svg>
);
export const IconLine = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19 19 5" />
  </Svg>
);
export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11Z" />
    <circle cx="12" cy="10" r="2.2" />
  </Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);
export const IconImages = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m20 16-4.5-4.5L7 19" />
  </Svg>
);
export const IconMusic = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </Svg>
);
export const IconGift = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="9" width="16" height="11" rx="1.5" />
    <path d="M3 9h18M12 9v11M12 9S10.5 4.5 8 5s-1 4 4 4ZM12 9s1.5-4.5 4-4 1 4-4 4Z" />
  </Svg>
);
export const IconPuzzle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 4h4v3a2 2 0 1 0 4 0V4h2v6h-3a2 2 0 1 0 0 4h3v6h-6v-3a2 2 0 1 0-4 0v3H4v-6h3a2 2 0 1 0 0-4H4V4Z" />
  </Svg>
);
export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);
export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);
export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l16 16M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.3 7.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4.2-1" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const IconUnlock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.7-1.5" />
  </Svg>
);
export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
  </Svg>
);
export const IconBringFront = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v10M8 8l4-4 4 4M5 20h14" />
  </Svg>
);
export const IconForward = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6v12M8 10l4-4 4 4" />
  </Svg>
);
export const IconBackward = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6v12M8 14l4 4 4-4" />
  </Svg>
);
export const IconSendBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20V10M8 16l4 4 4-4M5 4h14" />
  </Svg>
);
export const IconPlay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5v14l11-7L7 5Z" />
  </Svg>
);
export const IconReplay = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
  </Svg>
);
export const IconCursor = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 3 14 7-6 2-2 6L5 3Z" />
  </Svg>
);
export const IconSection = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="16" height="7" rx="1.5" />
    <rect x="4" y="13.5" width="16" height="7" rx="1.5" />
  </Svg>
);

const WIDGET_ICONS: Readonly<Record<string, (p: IconProps) => ReactNode>> = {
  map: IconMapPin,
  countdown: IconClock,
  guestGreeting: IconUser,
  rsvp: IconMail,
  gallery: IconImages,
  music: IconMusic,
  gift: IconGift,
};

export function WidgetIcon({ type, ...rest }: IconProps & { readonly type: string }) {
  const Icon = WIDGET_ICONS[type] ?? IconPuzzle;
  return <Icon {...rest} />;
}

/** Icon matching an element kind (layers list, inspector header). */
export function ElementIcon({ element, ...rest }: IconProps & { readonly element: Element }) {
  switch (element.type) {
    case "text":
      return <IconText {...rest} />;
    case "image":
      return <IconImages {...rest} />;
    case "widget":
      return <WidgetIcon type={element.widgetType} {...rest} />;
    case "shape":
      if (element.shapeType === "circle") return <IconCircle {...rest} />;
      if (element.shapeType === "line") return <IconLine {...rest} />;
      return <IconSquare {...rest} />;
    default:
      return <IconSparkle {...rest} />;
  }
}
