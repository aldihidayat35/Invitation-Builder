import type { Metadata } from "next";
import { getResellerBrandingProfile } from "@/features/reseller/api";
import { ResellerBrandingForm } from "@/features/reseller/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireReseller } from "@/lib/auth/server";
import { updateBrandingAction, verifyDomainAction } from "./actions";

export const metadata: Metadata = {
  title: "Pengaturan Branding Agensi — Portal Reseller",
  description: "Pengaturan identitas white-label, logo, dan nomor WhatsApp CS agensi.",
};

export default async function ResellerBrandingPage() {
  await requireReseller();
  const profile = await getResellerBrandingProfile();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="PORTAL RESELLER • WHITE-LABEL"
        title="Identitas & Branding Agensi"
        description="Atur nama brand, logo, dan kontak WhatsApp CS yang akan ditampilkan kepada klien Anda secara profesional."
      />

      <ResellerBrandingForm
        initialData={{
          agencyName: profile.agencyName,
          slug: profile.slug,
          whatsappContact: profile.whatsappContact,
          logoUrl: profile.logoUrl,
          brandColor: profile.brandColor,
          customDomain: profile.customDomain,
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
