import styles from "@/features/templates/components/templates.module.css";

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Memuat Template Library">
      <h1 className={styles.title}>Template Library</h1>
      <div className={styles.list} style={{ marginTop: 28 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    </main>
  );
}
