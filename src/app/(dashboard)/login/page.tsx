import type { Metadata } from "next";
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
          <span className={styles.mark} aria-hidden="true" />
          <span>
            Invitation<strong>Studio</strong>
          </span>
        </div>
        <h1 id="login-title" className={styles.title}>
          Masuk ke dashboard
        </h1>
        <p className={styles.lead}>Kelola template undangan digital workspace Anda.</p>
        <LoginForm next={next} />
      </section>
    </main>
  );
}
