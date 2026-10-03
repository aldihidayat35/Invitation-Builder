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
      <body>{children}</body>
    </html>
  );
}
