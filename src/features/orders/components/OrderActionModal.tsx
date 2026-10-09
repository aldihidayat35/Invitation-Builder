"use client";

import React, { useState } from "react";
import { IconAlertTriangle, IconClipboard } from "./OrderIcons";

interface OrderActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  isDestructive?: boolean;
  requireNote?: boolean;
  notePlaceholder?: string;
  action: (formData: FormData) => Promise<void>;
  orderId: string;
  nextStatus: string;
}

export function OrderActionModal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  isDestructive = false,
  requireNote = false,
  notePlaceholder = "Tuliskan alasan atau catatan penjelasan...",
  action,
  orderId,
  nextStatus,
}: OrderActionModalProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (requireNote && !note.trim()) {
      setErrorMessage("Alasan atau catatan wajib diisi untuk tindakan ini.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.set("orderId", orderId);
      formData.set("nextStatus", nextStatus);
      if (note.trim()) {
        formData.set("note", note.trim());
      }
      await action(formData);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses tindakan.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#D9CFC4] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDestructive ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-[#8C5D2A]"
            }`}
          >
            {isDestructive ? <IconAlertTriangle size={20} /> : <IconClipboard size={20} />}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#2C221E]">{title}</h3>
            <p className="text-xs text-stone-500">Konfirmasi tindakan status order</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-stone-600 bg-[#FAF8F5] p-3 rounded-xl border border-[#EBDCCB]/60">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C221E]">
              Catatan Tindakan {requireNote ? <span className="text-rose-600">* (Wajib)</span> : <span className="text-stone-400 font-normal">(Opsional)</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              rows={3}
              placeholder={notePlaceholder}
              required={requireNote}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-[#2C221E] outline-none transition focus:border-[#84633F] focus:ring-2 focus:ring-[#D4AF37]/20"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2.5 text-xs font-semibold text-[#664624] hover:bg-[#FAF8F5] hover:text-[#2C221E] transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 ${
                isDestructive
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-[#84633F] hover:bg-[#664624]"
              }`}
            >
              {submitting ? "Memproses…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
