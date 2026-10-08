import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { listAdminTestimonials } from "@/lib/db/repositories/testimonials";
import { TestimonialsManager } from "@/features/admin/components";
import { DashboardHeroHeader } from "@/features/dashboard-layout";

export const metadata: Metadata = {
  title: "Manajemen Review & Testimoni — Super Admin",
  description: "Kelola daftar ulasan dan testimoni pelanggan yang ditampilkan di halaman depan.",
};

export default async function AdminReviewsPage() {
  await requireOwner();
  const db = await getDb();
  const testimonials = await listAdminTestimonials(db);

  return (
    <div className="space-y-6">
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • ULASAN PELANGGAN"
        title="Manajemen Review & Testimoni Pelanggan"
        description="Kelola testimoni pengguna yang tampil di section 'Apa Kata Mereka' pada Landing Page. Anda dapat menambah, mengubah, mengurutkan, atau menyembunyikan testimoni kapan saja."
        actions={
          <Link
            href="/#testimoni"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-[#2C221E] shadow-sm hover:bg-[#BD9B2F] transition-colors"
          >
            <span>Lihat di Landing Page</span>
            <span>↗</span>
          </Link>
        }
      />

      <TestimonialsManager initialTestimonials={testimonials} />
    </div>
  );
}
