import type { Metadata } from "next";
import { getResellerBrandingProfile } from "@/features/reseller/api";
import { ResellerBrandingForm } from "@/features/reseller/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireReseller } from "@/lib/auth/server";
import { updateBrandingAction, verifyDomainAction } from "../branding/actions";

export const metadata: Metadata = {
  title: "Website & Domain Khusus Seller — Portal Seller",
  description: "Pengaturan website toko online, domain khusus, logo, dan nomor WhatsApp CS.",
};

export default async function ResellerStorefrontPage() {
  await requireReseller();
  const profile = await getResellerBrandingProfile();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="PORTAL SELLER • WEBSITE TOKO"
        title="Website Toko & Domain Khusus"
        description="Atur identitas website toko khusus seller Anda sebagai sarana melayani customer, termasuk nama brand, logo, domain sendiri, dan kontak CS WhatsApp."
        actions={
          <a
            href={`/seller/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors"
          >
            <span>Pratinjau Toko</span>
            <span>↗</span>
          </a>
        }
      />

      <ResellerBrandingForm
        initialData={{
          agencyName: profile.agencyName,
          slug: profile.slug,
          whatsappContact: profile.whatsappContact,
          logoUrl: profile.logoUrl,
          brandColor: profile.brandColor,
          customDomain: profile.customDomain,
          heroImageUrl: profile.heroImageUrl,
          heroTitle: profile.heroTitle,
          heroSubtitle: profile.heroSubtitle,
          heroBadge: profile.heroBadge,
          domainStatus: profile.domainStatus,
          domainVerificationToken: profile.domainVerificationToken,
          domainLastCheckedAt: profile.domainLastCheckedAt,
          tlsStatus: profile.tlsStatus,
        }}
        action={updateBrandingAction}
        verifyAction={verifyDomainAction}
      />
    </div>
  );
}
