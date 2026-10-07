import type { Metadata } from "next";
import { getResellerBrandingProfile } from "@/features/reseller/api";
import { ResellerBrandingForm } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";
import { updateBrandingAction } from "./actions";

export const metadata: Metadata = {
  title: "Pengaturan Branding Agensi — Portal Reseller",
  description: "Pengaturan identitas white-label, logo, dan nomor WhatsApp CS agensi.",
};

export default async function ResellerBrandingPage() {
  await requireReseller();
  const profile = await getResellerBrandingProfile();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Portal Reseller · White-Label</p>
          <h1 className={styles.title}>Identitas & Branding Agensi</h1>
          <p className={styles.lead}>
            Atur nama brand, logo, dan kontak WhatsApp CS yang akan ditampilkan kepada klien Anda
            secara profesional.
          </p>
        </div>
      </header>

      <ResellerBrandingForm
        initialData={{
          agencyName: profile.agencyName,
          slug: profile.slug,
          whatsappContact: profile.whatsappContact,
          logoUrl: profile.logoUrl,
          brandColor: profile.brandColor,
          customDomain: profile.customDomain,
        }}
        action={updateBrandingAction}
      />
    </div>
  );
}
