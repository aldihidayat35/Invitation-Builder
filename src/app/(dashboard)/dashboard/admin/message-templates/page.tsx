import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth/server";
import { getAdminMessageTemplates } from "@/features/admin/api";
import { MessageTemplatesManager } from "@/features/admin/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";

export const metadata: Metadata = {
  title: "Format Pesan Tamu Dinamis — Super Admin",
  description: "Kelola template pesan broadcast WhatsApp dan undangan link untuk berbagai jenis acara.",
};

export default async function AdminMessageTemplatesPage() {
  await requireOwner();

  const templates = await getAdminMessageTemplates();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • PESAN & BROADCAST TAMU"
        title="Format Pesan Undangan WhatsApp"
        description="Kelola template pesan undangan WhatsApp dinamis berdasarkan jenis acara (Pernikahan, Khitanan, Aqiqah, Ulang Tahun, Wisuda, Corporate, dan Umum). Klien di portal mandiri dapat memilih template sekali klik atau menyesuaikan teks dengan variabel dinamis."
      />

      <MessageTemplatesManager initialTemplates={templates} />
    </div>
  );
}
