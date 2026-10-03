import type { Metadata } from "next";
import Link from "next/link";
import {
  CANONICAL_BASE_WIDTH,
  TARGET_VIEWPORT_MAX,
  TARGET_VIEWPORT_MIN,
} from "@/lib/schema/constants";
import { ROADMAP_PHASES, type PhaseStatus } from "./roadmap";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard",
};

const STATUS_LABEL: Record<PhaseStatus, string> = {
  done: "Selesai",
  "in-progress": "Berjalan",
  planned: "Direncanakan",
};

/**
 * Dashboard placeholder (Fase 0). Intentionally contains NO editor and NO
 * hardcoded invitation data — business features arrive in later phases.
 */
export default function DashboardPage() {
  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Dashboard</p>
        <h1 className={styles.title}>Digital Invitation Builder</h1>
        <p className={styles.lead}>
          Auth, workspace, dan Template Library aktif. Fitur lain (editor, widget, publishing)
          dibangun bertahap sesuai PRD v1.0 dan dapat ditelusuri lewat requirements matrix.
        </p>
        <div className={styles.facts}>
          <span className={styles.fact}>
            Artboard kanonik <strong>{CANONICAL_BASE_WIDTH}px</strong>
          </span>
          <span className={styles.fact}>
            Target viewport{" "}
            <strong>
              {TARGET_VIEWPORT_MIN}–{TARGET_VIEWPORT_MAX}px
            </strong>
          </span>
          <span className={styles.fact}>
            Output <strong>HTML/DOM</strong>
          </span>
        </div>
        <Link href="/dashboard/templates" className={styles.cta} id="open-template-library">
          Buka Template Library
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/smoke/renderer" className={styles.ghost} id="open-renderer-smoke">
          Public renderer smoke
        </Link>
      </header>

      <section aria-labelledby="roadmap-heading">
        <h2 id="roadmap-heading" className={styles.sectionTitle}>
          Roadmap implementasi
        </h2>
        <ol className={styles.grid}>
          {ROADMAP_PHASES.map((phase) => (
            <li key={phase.id} className={styles.card} data-status={phase.status}>
              <div className={styles.cardHead}>
                <span className={styles.phaseId}>{phase.id}</span>
                <span className={styles.badge}>{STATUS_LABEL[phase.status]}</span>
              </div>
              <h3 className={styles.cardTitle}>{phase.title}</h3>
              <ul className={styles.tags} aria-label="Requirement PRD">
                {phase.prdTargets.map((id) => (
                  <li key={id} className={styles.tag}>
                    {id}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
