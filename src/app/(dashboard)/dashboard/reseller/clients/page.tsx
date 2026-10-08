import type { Metadata } from "next";
import { getResellerClientsList } from "@/features/reseller/api";
import { ResellerClientsTable } from "@/features/reseller/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireReseller } from "@/lib/auth/server";
import { createClientAction } from "./actions";

export const metadata: Metadata = {
  title: "Kelola Klien Agensi — Portal Reseller",
  description: "Daftar klien dan pembuatan akun end-user di bawah agensi reseller.",
};

export default async function ResellerClientsPage() {
  await requireReseller();
  const clients = await getResellerClientsList();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="PORTAL RESELLER • KLIEN AGENSI"
        title="Manajemen Klien Agensi"
        description="Kelola daftar klien end-user yang dinaungi agensi Anda dan buatkan akun mandiri untuk klien mengisi data undangan pernikahan mereka."
      />

      <ResellerClientsTable clients={clients} createAction={createClientAction} />
    </div>
  );
}
