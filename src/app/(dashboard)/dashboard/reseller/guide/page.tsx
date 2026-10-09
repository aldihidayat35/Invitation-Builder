import type { Metadata } from "next";
import { getResellerOverview } from "@/features/reseller/api";
import { SellerOnboardingGuide } from "@/features/reseller/components";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Panduan & Aturan Seller",
  description: "Panduan cara kerja, alur pemesanan, dan aturan kemitraan bagi Seller platform undangan digital.",
};

export default async function ResellerGuidePage() {
  await requireReseller();
  const stats = await getResellerOverview();

  return (
    <SellerOnboardingGuide
      agencyName={stats.agencyName}
      slug={stats.slug}
    />
  );
}
