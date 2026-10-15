import type { Metadata } from "next";
import Script from "next/script";
import { getPublicSiteSettings } from "@/features/site/api";
import { getBaseUrl } from "@/lib/seo/config";
import "./dashboard.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings().catch(() => null);
  const baseUrl = getBaseUrl(settings);
  const appName = settings?.appName || "Undangan.id";
  const defaultDesc =
    settings?.metaDescription ||
    settings?.footerDescription ||
    "Studio undangan digital: template reusable, data binding, widget, dan output HTML mobile-first.";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: settings?.metaTitle || `${appName} — Template Undangan Digital Elegan & Modern`,
      template: `%s · ${appName}`,
    },
    description: defaultDesc,
    icons: {
      icon: [
        { url: "/api/app-favicon", type: "image/svg+xml" },
        { url: "/favicon.ico" },
      ],
      shortcut: "/api/app-favicon",
      apple: "/api/app-favicon",
    },
    verification: settings?.googleSiteVerification
      ? {
          google: settings.googleSiteVerification,
        }
      : undefined,
  };
}

/**
 * Root layout for the dashboard/marketing area.
 * Separate root layout from (public) so dashboard CSS can never leak into
 * the public invitation runtime (PRD §5.1, ADR 0001 #3).
 */
export default async function DashboardRootLayout({ children }: LayoutProps<"/">) {
  const settings = await getPublicSiteSettings().catch(() => null);

  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/api/app-favicon" sizes="any" />
        <link rel="apple-touch-icon" href="/api/app-favicon" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {settings?.googleSiteVerification && (
          <meta name="google-site-verification" content={settings.googleSiteVerification} />
        )}
      </head>
      <body>
        {children}
        {settings?.googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.googleAnalyticsId)}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${settings.googleAnalyticsId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
