import type { Metadata } from "next";
import { AnimatedElement, RendererViewport } from "@/features/renderer";
import { AccessibleAnimatedText } from "@/features/animations";
import { CANONICAL_BASE_WIDTH } from "@/lib/schema/constants";
import styles from "./smoke.module.css";

export const metadata: Metadata = {
  title: "Renderer smoke test",
  description: "Smoke route untuk memverifikasi runtime publik dirender sebagai HTML/DOM.",
};

/**
 * Public renderer smoke route (Fase 0, P-04 / AC-11 groundwork + Fase 7 animations).
 * No business logic and no invitation/client data — it proves the public runtime path
 * produces semantic, selectable DOM text with accessible animations (no canvas).
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

        <AnimatedElement
          element={{
            id: "smoke_anim_couple",
            type: "text",
            frame: { x: 0, y: 0, w: 320, h: 40, rotation: 0 },
            visible: true,
            locked: false,
            content: { segments: [{ text: "Romeo & Juliet" }] },
            style: {
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.4,
              letterSpacing: 0,
              textAlign: "center",
              color: "#333333",
              opacity: 1,
            },
            animations: {
              enter: {
                presetId: "charRise",
                trigger: "onLoad",
                durationMs: 600,
                delayMs: 0,
                easing: "back.out",
                repeat: 0,
                yoyo: false,
                staggerUnit: "char",
                staggerAmountMs: 40,
                once: true,
              },
            },
          }}
          data-testid="smoke-animated-text"
        >
          <AccessibleAnimatedText text="Romeo & Juliet" staggerUnit="char" />
        </AnimatedElement>

        <div className={styles.divider} aria-hidden="true" />
        <p className={styles.note}>Tidak ada data undangan pada route ini.</p>
      </main>
    </RendererViewport>
  );
}
