import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth/server";
import { getAdminAppSettings } from "@/features/admin/api";
import { AppSettingsForm } from "@/features/admin/components/AppSettingsForm";
import { DashboardHeroHeader } from "@/features/dashboard-layout";

export const metadata: Metadata = {
  title: "Pengaturan Aplikasi Umum",
  description: "Kelola identitas aplikasi, logo, kontak resmi, dan informasi alamat platform Undangan.id.",
};

export default async function AdminSettingsPage() {
  await requireOwner();

  const settings = await getAdminAppSettings();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • IDENTITAS & KONTAK"
        title="Pengaturan Aplikasi Umum"
        description="Kelola nama platform, logo, kontak resmi WhatsApp & Email, serta alamat operasional yang otomatis diterapkan secara dinamis di seluruh halaman website, header, dan sidebar."
      />

      <AppSettingsForm initialSettings={settings} />
    </div>
  );
}
