import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/server";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(rawNext);
  // Verified (DB) check; a stale cookie falls through and shows the form.
  if (await getCurrentUser()) redirect(next);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true">
            IS
          </span>
          <strong>Invitation Studio</strong>
        </div>
        <h1 id="login-title" className={styles.title}>
          Masuk ke dashboard
        </h1>
        <p className={styles.lead}>Desain template dan kelola undangan digital workspace Anda.</p>
        <LoginForm next={next} />

        <div className={styles.divider}>
          <span>atau</span>
        </div>

        <div className={styles.resellerCta}>
          <p className={styles.resellerCtaText}>
            Ingin bermitra dan menjual undangan digital dengan brand Anda sendiri?
          </p>
          <Link href="/register-reseller" className={styles.resellerBtn} id="btn-register-reseller">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <span>Daftar Jadi Reseller</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
