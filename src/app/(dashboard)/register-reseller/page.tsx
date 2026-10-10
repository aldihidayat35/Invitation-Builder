import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { RegisterForm } from "./register-form";
import styles from "./register.module.css";

export const metadata: Metadata = {
  title: "Pendaftaran Mitra Reseller",
  description:
    "Daftarkan brand dan bisnis undangan digital Anda untuk mendapatkan dashboard dan storefront khusus reseller.",
};

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
