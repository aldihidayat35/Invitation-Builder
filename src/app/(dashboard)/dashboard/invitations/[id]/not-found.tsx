import Link from "next/link";
import styles from "@/features/invitations/components/invitations.module.css";

export default function InvitationNotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Undangan tidak ditemukan</h1>
      <div className={styles.empty} data-testid="not-found-state">
        <p>Undangan tidak ada, atau Anda tidak memiliki akses.</p>
        <Link href="/dashboard/invitations" className={styles.secondary}>
          Kembali ke daftar undangan
        </Link>
      </div>
    </main>
  );
}
