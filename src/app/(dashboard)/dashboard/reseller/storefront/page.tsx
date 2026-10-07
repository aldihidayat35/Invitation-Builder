import type { Metadata } from "next";
import { getResellerBrandingProfile } from "@/features/reseller/api";
import { ResellerBrandingForm } from "@/features/reseller/components";
import styles from "@/features/reseller/components/reseller.module.css";
import { requireReseller } from "@/lib/auth/server";
import { updateBrandingAction } from "../branding/actions";

export const metadata: Metadata = {
  title: "Website & Domain Khusus Seller — Portal Seller",
  description: "Pengaturan website toko online, domain khusus, logo, dan nomor WhatsApp CS.",
};

export default async function ResellerStorefrontPage() {
  await requireReseller();
  const profile = await getResellerBrandingProfile();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Portal Seller · Identitas & Toko</p>
          <h1 className={styles.title}>Website Toko & Domain Khusus</h1>
          <p className={styles.lead}>
            Atur identitas website toko khusus seller Anda sebagai sarana melayani customer,
            termasuk nama brand, logo, domain sendiri, dan kontak CS WhatsApp.
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
