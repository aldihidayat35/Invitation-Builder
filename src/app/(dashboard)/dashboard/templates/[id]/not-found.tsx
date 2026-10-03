import Link from "next/link";
import styles from "@/features/templates/components/templates.module.css";

export default function TemplateNotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Template tidak ditemukan</h1>
      <div className={styles.empty} data-testid="not-found-state">
        <p>Template tidak ada, atau Anda tidak memiliki akses.</p>
        <Link href="/dashboard/templates" className={styles.secondary}>
          Kembali ke library
        </Link>
      </div>
    </main>
  );
}
