import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { RegisterForm } from "./register-form";
import styles from "./register.module.css";

import { getPublicSiteSettings } from "@/features/site/api";
import { buildPublicMetadata } from "@/lib/seo/config";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings().catch(() => null);
  return buildPublicMetadata({
    title: "Pendaftaran Mitra Reseller",
    description:
      "Daftarkan brand dan bisnis undangan digital Anda untuk mendapatkan dashboard dan storefront khusus reseller resmi.",
    canonicalPath: "/register-reseller",
    keywords: ["mitra reseller undangan", "bisnis undangan digital", "daftar reseller undangan"],
    settings,
  });
}

export default async function RegisterResellerPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="register-title">
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            IS
          </span>
          <strong>Invitation Studio</strong>
        </div>

        <span className={styles.badge}>Program Mitra Reseller</span>
        <h1 id="register-title" className={styles.title}>
          Daftar Sebagai Reseller
        </h1>
        <p className={styles.lead}>
          Bangun bisnis undangan digital Anda sendiri. Lengkapi formulir di bawah ini untuk
          mengajukan akun kemitraan reseller.
        </p>

        <RegisterForm />
      </section>
    </main>
  );
}
