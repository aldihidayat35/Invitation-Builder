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
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
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
export const IconDuplicate = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    <path d="M14 11v6M11 14h6" />
  </Svg>
);
export const IconClipboardCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6M9 16h6" />
  </Svg>
);
export const IconClipboardPaste = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11v6M9 14l3 3 3-3" />
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
export const IconGripVertical = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconSection = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="3.5" width="16" height="7" rx="1.5" />
    <rect x="4" y="13.5" width="16" height="7" rx="1.5" />
  </Svg>
);
export const IconOpacity = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="12" r="6" />
    <circle cx="15" cy="12" r="6" />
  </Svg>
);
export const IconCrop = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </Svg>
);
export const IconWand = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 4 5 5L7 22l-5-5L15 4Z" />
    <path d="m12.5 6.5 3 3" />
    <path d="M9 2v2M19 12h2M18 3l-1.5 1.5M4 17l-1.5 1.5" />
  </Svg>
);
export const IconRotateRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
);
export const IconRotateLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 9-9c-2.5 0-4.8 1-6.5 2.7L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
);
export const IconFlipH = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2v20M8 5 3 12l5 7V5ZM16 5l5 7-5 7V5Z" />
  </Svg>
);
export const IconFlipV = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12h20M5 8l7-5 7 5H5ZM5 16l7 5 7-5H5Z" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const IconDropper = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 4 6 6-9 9-4.5.5.5-4.5 7-7Z" />
    <path d="m17 7-3 3" />
    <path d="m4.5 19.5-2.5 2.5" />
  </Svg>
);
export const IconExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </Svg>
);


export const IconFrame = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="6" y="6" width="12" height="12" rx="1" strokeDasharray="2 2" />
    <circle cx="9" cy="9" r="1" />
    <path d="M18 16l-3-3-5 5" />
  </Svg>
);

export const IconTimeline = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2" />
    <circle cx="6" cy="12" r="2" />
    <circle cx="6" cy="18" r="2" />
    <path d="M6 8v2M6 14v2" />
    <path d="M12 6h8M12 12h8M12 18h8" />
  </Svg>
);

export const IconWishes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M12 7.5a1.5 1.5 0 0 1 2.5 1.1c0 1.2-2.5 2.4-2.5 2.4s-2.5-1.2-2.5-2.4a1.5 1.5 0 0 1 2.5-1.1z" />
  </Svg>
);

export function IconOrnamentFrame({ size = 18, color = "currentColor", ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M7 3h10M7 21h10M3 7v10M21 7v10M7 3a4 4 0 0 0-4 4M17 3a4 4 0 0 1 4 4M3 17a4 4 0 0 0 4 4M21 17a4 4 0 0 1-4 4" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

const WIDGET_ICONS: Readonly<Record<string, (p: IconProps) => ReactNode>> = {
  map: IconMapPin,
  countdown: IconClock,
  guestGreeting: IconUser,
  rsvp: IconMail,
  gallery: IconImages,
  music: IconMusic,
  gift: IconGift,
  photoFrame: IconFrame,
  timeline: IconTimeline,
  wishes: IconWishes,
  ornamentFrame: IconOrnamentFrame,
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
