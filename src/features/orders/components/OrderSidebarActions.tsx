"use client";

import React, { useState } from "react";
import type { CustomerOrderStatus } from "@/lib/schema/domain";
import { OrderActionModal } from "./OrderActionModal";

interface OrderSidebarActionsProps {
  orderId: string;
  orderStatus: CustomerOrderStatus;
  transitionOrderAction: (formData: FormData) => Promise<void>;
}

export function OrderSidebarActions({
  orderId,
  orderStatus,
  transitionOrderAction,
}: OrderSidebarActionsProps) {
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    nextStatus: string;
    isDestructive: boolean;
    requireNote: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "",
    nextStatus: "",
    isDestructive: true,
    requireNote: true,
  });

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const isTerminal = ["rejected", "cancelled", "completed"].includes(orderStatus);
  if (isTerminal) return null;

  return (
    <>
      <div className="rounded-2xl border border-rose-200/80 bg-[#FFFBFB] p-4 text-xs">
        <h4 className="font-bold text-rose-900 flex items-center gap-1.5 text-xs">
          <span>⚠️</span> Zona Tindakan Khusus
        </h4>
        <p className="mt-1 text-[11px] text-stone-500">
          Tindakan di bawah ini akan menghentikan proses pengerjaan pesanan dan membutuhkan konfirmasi.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {orderStatus === "qualified" && (
            <button
              type="button"
              onClick={() =>
                setModalConfig({
                  isOpen: true,
                  title: "Tolak Pesanan Ini?",
                  description:
                    "Pesanan akan ditolak dan tidak dapat diproses lebih lanjut. Wajib sertakan alasan penolakan untuk arsip.",
                  confirmLabel: "Tolak Pesanan",
                  nextStatus: "rejected",
                  isDestructive: true,
                  requireNote: true,
                })
              }
              className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
            >
              Tolak Pesanan…
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setModalConfig({
                isOpen: true,
                title: "Batalkan Pesanan Ini?",
                description:
                  "Pesanan akan dibatalkan permanen. Seluruh proses produksi akan dihentikan. Wajib sertakan alasan pembatalan.",
                confirmLabel: "Batalkan Pesanan",
                nextStatus: "cancelled",
                isDestructive: true,
                requireNote: true,
              })
            }
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-rose-600 transition"
          >
            Batalkan Pesanan…
          </button>
        </div>
      </div>

      <OrderActionModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmLabel={modalConfig.confirmLabel}
        isDestructive={modalConfig.isDestructive}
        requireNote={modalConfig.requireNote}
        orderId={orderId}
        nextStatus={modalConfig.nextStatus}
        action={transitionOrderAction}
      />
    </>
  );
}
