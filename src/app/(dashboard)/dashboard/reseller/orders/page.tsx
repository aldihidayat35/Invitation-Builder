import type { Metadata } from "next";
import Link from "next/link";
import { getResellerOrders } from "@/features/reseller/api";
import { ResellerOrdersTable } from "@/features/reseller/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { requireReseller } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Pesanan Customer - Mitra Seller",
  description: "Daftar pesanan customer yang masuk melalui website toko seller.",
};

export default async function ResellerOrdersPage() {
  await requireReseller();
  const orders = await getResellerOrders();

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="PORTAL SELLER • PESANAN CUSTOMER"
        title="Pesanan Customer Masuk"
        description="Pantau seluruh formulir pesanan customer yang masuk dari website toko Anda. Seluruh pembuatan dan pengubahan data undangan dikelola langsung oleh Admin."
        actions={
          <Link
            href="/dashboard/reseller"
            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-[#292524] px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#342F2C] transition-colors"
          >
            <span>← Kembali ke Dashboard Toko</span>
          </Link>
        }
      />

      <ResellerOrdersTable orders={orders} />
    </div>
  );
}
