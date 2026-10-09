/** Inline SVG icons for the dashboard chrome, styled to match the dark warm dashboard palette. */
import type { ReactNode } from "react";

function Svg({ children, size = 21 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Dashboard / Window layout grid icon */
export const IconHome = () => (
  <Svg>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
  </Svg>
);

/** Template catalog icon */
export const IconTemplate = () => (
  <Svg>
    <rect x="3" y="3.5" width="18" height="17" rx="2.5" />
    <path d="M3 8.5h18" />
    <path d="M8 13h4M8 16.5h7" />
  </Svg>
);

/** Website invitation / envelope icon */
export const IconInvitation = () => (
  <Svg>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
);

/** Analytics trending line icon */
export const IconAnalytics = () => (
  <Svg>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
    <polyline points="15 9 19 9 19 13" />
  </Svg>
);

/** Orders / Receipt document icon */
export const IconReceipt = () => (
  <Svg>
    <rect width="16" height="19" x="4" y="2.5" rx="2" />
    <line x1="8" x2="16" y1="7.5" />
    <line x1="8" x2="16" y1="11.5" />
    <line x1="8" x2="12" y1="15.5" />
  </Svg>
);

/** Partner / Mitra seller icon */
export const IconUsers = () => (
  <Svg>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

/** Storefront / Agency icon for Mitra Seller */
export const IconStore = () => (
  <Svg>
    <path d="m2 7 3-4h14l3 4" />
    <path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
    <path d="M14 22v-6a2 2 0 0 0-2-2h-0a2 2 0 0 0-2 2v6" />
    <path d="M2 7h20" />
  </Svg>
);

/** Super Admin user management directory icon */
export const IconUserShield = () => (
  <Svg>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </Svg>
);


/** Code brackets icon for Engine Playground */
export const IconFlask = () => (
  <Svg>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </Svg>
);

/** Font & Component studio icon */
export const IconComponentStudio = () => (
  <Svg>
    <path d="M4 7V4h16v3" />
    <path d="M9 20h6" />
    <path d="M12 4v16" />
  </Svg>
);

/** Media & Storage hard disk icon */
export const IconStorage = () => (
  <Svg>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </Svg>
);

export const IconLogout = () => (
  <Svg size={18}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Svg>
);

export const IconArrowRight = () => (
  <Svg size={18}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconPlus = () => (
  <Svg size={18}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconCoins = () => (
  <Svg size={18}>
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h2v4H7M14 12h2v4h-2" />
  </Svg>
);

export const IconBank = () => (
  <Svg size={18}>
    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3 2 10h20L12 3Z" />
  </Svg>
);

export const IconSettings = () => (
  <Svg size={20}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

export const IconStar = () => (
  <Svg size={20}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Svg>
);

export const IconBook = () => (
  <Svg size={20}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8M8 11h6" />
  </Svg>
);

export const IconGlobe = () => (
  <Svg size={20}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

export const IconPalette = () => (
  <Svg size={20}>
    <circle cx="13.5" cy="6.5" r=".75" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".75" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".75" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".75" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
  </Svg>
);

export const IconShieldCheck = () => (
  <Svg size={20}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconServer = () => (
  <Svg size={20}>
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" strokeWidth={2.5} />
    <line x1="6" x2="6.01" y1="18" y2="18" strokeWidth={2.5} />
  </Svg>
);
