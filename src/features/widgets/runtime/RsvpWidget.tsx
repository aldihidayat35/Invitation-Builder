"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { track } from "@/features/analytics/track";
import { countdownTargetInstant } from "../logic";
import { usePublicContext } from "./PublicContext";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface RsvpWidgetProps {
  readonly title?: unknown;
  readonly enablePartySize?: unknown;
  readonly enableMessage?: unknown;
  readonly maxParty?: unknown;
  readonly deadline?: unknown;
  readonly style?: WidgetStyleProps | undefined;
}

type Phase = "idle" | "sending" | "done" | "error";

const str = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

/**
 * RSVP form (FR-WDG-005). Submits to the public API with the page's slug and
 * optional guest token. In preview (no public context) it renders but never
 * sends. Errors are shown generically.
 */
export function RsvpWidget({
  title,
  enablePartySize,
  enableMessage,
  maxParty,
  deadline,
  style,
}: RsvpWidgetProps) {
  const ctx = usePublicContext();
  const withParty = enablePartySize !== false;
  const withMessage = enableMessage !== false;
  const max =
    typeof maxParty === "number" && maxParty >= 1 ? Math.min(20, Math.floor(maxParty)) : 5;

  const [name, setName] = useState(ctx?.guestName ?? "");
  const [response, setResponse] = useState<"attending" | "not_attending">("attending");
  const [party, setParty] = useState(1);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  // Deadline is evaluated on the client only (server snapshot = open) to avoid hydration drift.
  const instant = countdownTargetInstant(deadline);
  const closed = useSyncExternalStore(
    () => () => undefined,
    () => instant !== null && Date.now() > instant,
    () => false,
  );

  const locked = ctx === null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ctx || closed) return;
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/public/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ctx.slug,
          ...(ctx.guestToken && { guestToken: ctx.guestToken }),
          name: name.trim(),
          response,
          ...(withParty && response === "attending" && { partySize: party }),
          ...(withMessage && message.trim() && { message: message.trim() }),
        }),
      });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Gagal mengirim. Silakan coba lagi.";
        setError(msg);
        setPhase("error");
        return;
      }
      track("rsvp_submitted", { response });
      setPhase("done");
    } catch {
      setError("Gagal mengirim. Periksa koneksi Anda.");
      setPhase("error");
    }
  }

  return (
    <WidgetFrame type="rsvp" style={style} className={styles.rsvp}>
      <h3 className={styles.label}>{str(title, "Konfirmasi Kehadiran")}</h3>
      {closed ? (
        <p className={styles.message} data-testid="rsvp-closed">
          Konfirmasi kehadiran sudah ditutup.
        </p>
      ) : phase === "done" ? (
        <p className={styles.message} role="status" data-testid="rsvp-done">
          Terima kasih! Konfirmasi Anda telah tersimpan.
        </p>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} aria-label="Formulir RSVP">
          <label className={styles.formField}>
            <span>Nama</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              autoComplete="name"
              readOnly={Boolean(ctx?.guestName)}
            />
          </label>
          <fieldset className={styles.choices}>
            <legend>Kehadiran</legend>
            <label>
              <input
                type="radio"
                name="response"
                value="attending"
                checked={response === "attending"}
                onChange={() => setResponse("attending")}
              />{" "}
              Hadir
            </label>
            <label>
              <input
                type="radio"
                name="response"
                value="not_attending"
                checked={response === "not_attending"}
                onChange={() => setResponse("not_attending")}
              />{" "}
              Tidak hadir
            </label>
          </fieldset>
          {withParty && response === "attending" ? (
            <label className={styles.formField}>
              <span>Jumlah tamu</span>
              <input
                type="number"
                name="partySize"
                min={1}
                max={max}
                value={party}
                onChange={(e) => setParty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              />
            </label>
          ) : null}
          {withMessage ? (
            <label className={styles.formField}>
              <span>Pesan (opsional)</span>
              <textarea
                name="message"
                rows={2}
                maxLength={1000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
          ) : null}
          {phase === "error" ? (
            <p role="alert" className={styles.formError}>
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className={styles.button}
            disabled={locked || phase === "sending"}
            data-testid="rsvp-submit"
          >
            {phase === "sending" ? "Mengirim…" : "Kirim"}
          </button>
          {locked ? <p className={styles.hint}>Pratinjau: pengiriman dinonaktifkan.</p> : null}
        </form>
      )}
    </WidgetFrame>
  );
}
