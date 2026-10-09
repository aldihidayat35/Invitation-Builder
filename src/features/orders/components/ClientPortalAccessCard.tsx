"use client";

import { useEffect, useState } from "react";

interface ClientPortalAccessCardProps {
  token?: string | null;
  customerName: string;
  customerWhatsapp?: string | null;
  orderId?: string;
  invitationId?: string;
  canRegenerate?: boolean;
  regenerateAction?: (formData: FormData) => Promise<void>;
}

export function ClientPortalAccessCard({
  token,
  customerName,
  customerWhatsapp,
  orderId,
  invitationId,
  canRegenerate = false,
  regenerateAction,
}: ClientPortalAccessCardProps) {
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!token) {
    return (
      <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <h3 className="font-bold text-stone-900 flex items-center gap-2">
          <span>🔗</span> Link Akses Portal Klien
        </h3>
        <p className="mt-2 text-sm text-stone-500">
          Token portal klien belum digenerate untuk entitas ini.
        </p>
      </article>
    );
  }

  const portalRelativeUrl = `/c/${token}`;
  const fullPortalUrl = origin ? `${origin}${portalRelativeUrl}` : portalRelativeUrl;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullPortalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      prompt("Salin link portal klien berikut:", fullPortalUrl);
    }
  };

  const cleanPhone = (customerWhatsapp || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("0")
    ? "62" + cleanPhone.slice(1)
    : cleanPhone;

  const waMessage = encodeURIComponent(
    `Halo kak ${customerName},\n\nBerikut tautan portal khusus untuk undangan pernikahan Kakak:\n${fullPortalUrl}\n\nMelalui link ini, Kakak dapat:\n1. Melakukan review & konfirmasi undangan\n2. Menambah & mengelola daftar nama tamu\n3. Membagikan link undangan personal ke WhatsApp tamu\n4. Memantau kehadiran tamu (RSVP) & ucapan doa\n\nTerima kasih!`
  );

  const waUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`;

  return (
    <article className="rounded-2xl border border-[#EBE5DF] bg-linear-to-br from-white to-[#FAF8F5] p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EBE5DF] pb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#84633F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#84633F]">
            <span>🔑</span> Akses Mandiri Tanpa Login
          </span>
          <h3 className="mt-1 text-base font-bold text-stone-900">
            Link Portal Klien (Calon Pengantin)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded">
            {token.slice(0, 10)}...
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-600">
        Berikan link ini kepada calon pengantin. Klien <strong>tidak perlu login/membuat akun</strong>. Mereka dapat langsung me-review undangan, mengelola tamu undangan, dan memantau RSVP secara privat.
      </p>

      {/* URL Input Box */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2">
        <input
          type="text"
          readOnly
          value={fullPortalUrl}
          className="w-full bg-transparent font-mono text-xs text-stone-800 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg bg-[#84633F] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#6c5031]"
        >
          {copied ? "✓ Tersalin!" : "Salin Link"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={portalRelativeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2 text-xs font-semibold text-[#664624] shadow-2xs hover:bg-[#FAF8F5] hover:text-[#2C221E] transition"
        >
          <span>👁️</span> Buka Portal Klien ↗
        </a>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition"
        >
          <span>💬</span> Kirim Link ke WhatsApp
        </a>

        {canRegenerate && regenerateAction && (
          <div className="ml-auto">
            {!showConfirm ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="text-xs font-semibold text-stone-500 hover:text-rose-600 underline"
              >
                Regenerate Token
              </button>
            ) : (
              <form action={regenerateAction} className="inline-flex items-center gap-1.5">
                {orderId && <input type="hidden" name="orderId" value={orderId} />}
                {invitationId && <input type="hidden" name="invitationId" value={invitationId} />}
                <span className="text-xs text-rose-600 font-medium">Reset link lama?</span>
                <button
                  type="submit"
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600"
                >
                  Batal
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
