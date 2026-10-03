import type { Metadata, Viewport } from "next";
import "./public.css";

export const metadata: Metadata = {
  // PRD §13.1 / §19: public invitations are noindex by default.
  robots: { index: false, follow: false },
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
      <body>{children}</body>
    </html>
  );
}
