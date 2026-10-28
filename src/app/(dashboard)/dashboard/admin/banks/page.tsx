import type { Metadata } from "next";
import { requireOwner } from "@/lib/auth/server";
import { getMasterBanks } from "@/features/banks";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { BanksManager } from "./banks-manager";

export const metadata: Metadata = {
  title: "Master Bank & Logo Rekening — Super Admin",
  description: "Kelola daftar master bank, e-wallet, dan logo rekening untuk formulir amplop digital.",
};

export default async function AdminMasterBanksPage() {
  await requireOwner();

  const banks = await getMasterBanks();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • REKENING & HADIAH"
        title="Master Bank & Logo Rekening"
        description="Kelola daftar bank dan dompet digital resmi beserta logo asetnya. Pilihan di sini otomatis menjadi dropdown pada verifikasi rekening admin dan penginputan nomor rekening klien."
      />

      <BanksManager initialBanks={banks} />
    </div>
  );
}
