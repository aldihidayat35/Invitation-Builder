import type { Metadata } from "next";
import "./dashboard.css";

export const metadata: Metadata = {
  title: {
    default: "Digital Invitation Builder",
    template: "%s · Digital Invitation Builder",
  },
  description:
    "Studio undangan digital: template reusable, data binding, widget, dan output HTML mobile-first.",
  // Dashboard is an authenticated workspace tool; never index it.
  robots: { index: false, follow: false },
};

/**
 * Root layout for the authenticated dashboard/editor area.
 * Separate root layout from (public) so dashboard CSS can never leak into
 * the public invitation runtime (PRD §5.1, ADR 0001 #3).
 */
export default function DashboardRootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* This route group has its own root layout, so the font applies to every dashboard page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
