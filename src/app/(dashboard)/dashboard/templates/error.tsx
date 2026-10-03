"use client";

import styles from "@/features/templates/components/templates.module.css";

export default function TemplatesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Terjadi kesalahan</h1>
      <div className={styles.empty} role="alert" data-testid="error-state">
        <p>Template Library tidak dapat dimuat. Coba lagi dalam beberapa saat.</p>
        <button type="button" className={styles.primary} onClick={reset}>
          Coba lagi
        </button>
      </div>
    </main>
  );
}
