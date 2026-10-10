import type { Metadata } from "next";
import Link from "next/link";
import { formatIndonesianDate } from "@/features/invitations/expiry";

interface ExpiredInvitationViewProps {
  title: string;
  groomBrideNames?: string;
  closedReason?: "expired" | "manual";
  publishedAt?: Date | null;
  expiresAt?: Date | null;
}

export function ExpiredInvitationView({
  title,
  groomBrideNames,
  closedReason = "expired",
  publishedAt,
  expiresAt,
}: ExpiredInvitationViewProps) {
  const coupleText = groomBrideNames || title;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#faf8f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.25rem",
        fontFamily: "var(--font-sans, system-ui, -apple-system, sans-serif)",
        color: "#2c221e",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          border: "1px solid rgba(132, 99, 63, 0.2)",
          boxShadow: "0 20px 50px rgba(44, 34, 30, 0.08)",
          padding: "3.5rem 2.25rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle Decorative Golden Top Border */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #d4af37 0%, #bd9b2f 50%, #84633f 100%)",
          }}
        />

        {/* Elegant Icon Badge */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "rgba(212, 175, 55, 0.12)",
            border: "1px solid rgba(212, 175, 55, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.75rem",
            color: "#84633f",
            fontSize: "2rem",
          }}
        >
          💍
        </div>

        {/* Status Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 1rem",
            borderRadius: "9999px",
            backgroundColor: "rgba(44, 34, 30, 0.06)",
            border: "1px solid rgba(132, 99, 63, 0.18)",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#84633f",
            marginBottom: "1.25rem",
          }}
        >
          {closedReason === "manual"
            ? "🔒 Undangan Telah Ditutup"
            : "⏳ Masa Aktif Undangan Selesai"}
        </div>

        {/* Couple Title */}
        <h1
          style={{
            fontFamily: "var(--font-serif, 'Cinzel', 'Playfair Display', Georgia, serif)",
            fontSize: "2.1rem",
            fontWeight: 700,
            color: "#2c221e",
            margin: "0 0 1rem",
            lineHeight: 1.25,
          }}
        >
          {coupleText}
        </h1>

        <div
          style={{
            width: "60px",
            height: "2px",
            backgroundColor: "#d4af37",
            margin: "0 auto 1.75rem",
            opacity: 0.6,
          }}
        />

        {/* Heartfelt Message */}
        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.75,
            color: "#5c4f47",
            margin: "0 0 2rem",
          }}
        >
          Terima kasih yang sebesar-besarnya atas doa restu, kehadiran, dan kasih sayang yang telah
          diberikan kepada kami dan keluarga besar. Momen bahagia pernikahan kami telah terlaksana
          dengan penuh berkah dan kehangatan.
        </p>

        {/* Date Context Card */}
        <div
          style={{
            backgroundColor: "#faf8f5",
            border: "1px solid rgba(132, 99, 63, 0.12)",
            borderRadius: "14px",
            padding: "1.1rem 1.25rem",
            fontSize: "0.88rem",
            color: "#75665e",
            marginBottom: "2.25rem",
            lineHeight: 1.5,
          }}
        >
          {expiresAt ? (
            <div>
              <span>Masa penayangan undangan digital ini berakhir pada:</span>
              <div style={{ fontWeight: 700, color: "#2c221e", marginTop: "0.25rem" }}>
                {formatIndonesianDate(expiresAt)}
              </div>
            </div>
          ) : publishedAt ? (
            <div>
              <span>Dipublikasikan pada:</span>
              <div style={{ fontWeight: 700, color: "#2c221e", marginTop: "0.25rem" }}>
                {formatIndonesianDate(publishedAt)}
              </div>
            </div>
          ) : (
            <span>Masa penayangan website undangan digital ini telah selesai.</span>
          )}
        </div>

        {/* Footer Note */}
        <p
          style={{
            fontSize: "0.82rem",
            color: "#a1938b",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Semoga keberkahan dan kebahagiaan senantiasa menyertai kita semua.
        </p>
      </div>
    </div>
  );
}
