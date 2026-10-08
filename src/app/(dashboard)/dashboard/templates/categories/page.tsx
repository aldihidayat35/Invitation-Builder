import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth/server";
import { getTemplateCategories } from "@/features/templates/api";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import { CategoryManagementClient } from "./CategoryManagementClient";

export const metadata: Metadata = {
  title: "Manajemen Kategori Template",
};

export default async function TemplateCategoriesPage() {
  await requireOwner();
  const categories = await getTemplateCategories();

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A7A70] hover:text-[#2C221E] transition-colors mb-3"
        >
          <span>← Kembali ke Katalog Template</span>
        </Link>

        <DashboardHeroHeader
          eyebrow="KATALOG TEMPLATE • MASTER DATA"
          title="Manajemen Kategori Template"
          description="Atur kategori dinamis untuk mengelompokkan template undangan Anda. Kategori yang dibuat di sini akan langsung muncul pada pilihan metadata saat mendesain template."
          actions={
            <Link
              href="/dashboard/templates"
              className="inline-flex items-center gap-2 rounded-xl border border-[#D9CFC4] bg-white hover:bg-[#F9F7F3] px-4 py-2.5 text-xs font-bold text-[#5A4D44] shadow-xs transition-colors"
            >
              <span>Lihat Semua Template</span>
            </Link>
          }
        />
      </div>

      <CategoryManagementClient initialCategories={categories} />
    </main>
  );
}
