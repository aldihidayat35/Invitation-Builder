import type { Metadata } from "next";
import { RendererViewport } from "@/features/renderer";
import { CANONICAL_BASE_WIDTH } from "@/lib/schema/constants";
import styles from "./smoke.module.css";

export const metadata: Metadata = {
  title: "Renderer smoke test",
  description: "Smoke route untuk memverifikasi runtime publik dirender sebagai HTML/DOM.",
};

/**
 * Public renderer smoke route (Fase 0, P-04 / AC-11 groundwork).
 * No business logic and no invitation/client data — it only proves the
 * public runtime path produces semantic, selectable DOM text (no canvas).
 */
export default function RendererSmokePage() {
  return (
    <RendererViewport runtimeMode="smoke">
      <main className={styles.stage} data-testid="renderer-smoke">
        <div className={styles.ornament} aria-hidden="true" />
        <p className={styles.kicker}>Public Runtime · Smoke</p>
        <h1 className={styles.heading}>HTML Renderer OK</h1>
        <p className={styles.body}>
          Halaman ini dirender sebagai DOM/HTML/CSS. Teks dapat diseleksi dan dibaca screen reader.
          Artboard kanonik {CANONICAL_BASE_WIDTH}px.
        </p>
        <div className={styles.divider} aria-hidden="true" />
        <p className={styles.note}>Tidak ada data undangan pada route ini.</p>
      </main>
    </RendererViewport>
  );
}
