import type { Metadata, Viewport } from "next";
import "./public.css";

export const metadata: Metadata = {
  // PRD §13.1 / §19: public invitations are noindex by default.
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/api/app-favicon", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/api/app-favicon",
    apple: "/api/app-favicon",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout for the public invitation runtime (/i/*, smoke routes).
 * Separate root layout => no dashboard CSS/JS chrome is shipped here.
 */
export default function PublicRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/api/app-favicon" sizes="any" />
        <link rel="apple-touch-icon" href="/api/app-favicon" />
      </head>
      <body>{children}</body>
    </html>
  );
}
