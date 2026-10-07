"use client";

import { useState } from "react";
import type { ActionState, AdminTopupFinancialRecap, AdminTopupRequestItem } from "../types";
import { ProofPreviewModal } from "./ProofPreviewModal";
import { RejectTopupModal } from "./RejectTopupModal";
import { TopupRequestsTable } from "./TopupRequestsTable";

interface TopupRequestsManagerProps {
  items: AdminTopupRequestItem[];
  recap?: AdminTopupFinancialRecap;
  approveAction: (requestId: string) => Promise<void>;
  rejectAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
}

export function TopupRequestsManager({
  items,
  recap,
  approveAction,
  rejectAction,
}: TopupRequestsManagerProps) {
  const [selectedProof, setSelectedProof] = useState<AdminTopupRequestItem | null>(null);
  const [selectedForReject, setSelectedForReject] = useState<AdminTopupRequestItem | null>(null);

  const handleApprove = async (item: AdminTopupRequestItem) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menyetujui transfer dari ${item.reseller.agencyName} sebesar Rp ${item.request.amountPaid.toLocaleString("id-ID")} dan menambahkan +${item.request.creditAmount} kredit?`,
    );
    if (!confirmed) return;

    try {
      await approveAction(item.request.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui permohonan");
    }
  };

  return (
    <>
      <TopupRequestsTable
        items={items}
        recap={recap}
        onViewProof={(item) => setSelectedProof(item)}
        onApprove={handleApprove}
        onReject={(item) => setSelectedForReject(item)}
      />

      <ProofPreviewModal item={selectedProof} onClose={() => setSelectedProof(null)} />

      <RejectTopupModal
        item={selectedForReject}
        onClose={() => setSelectedForReject(null)}
        action={rejectAction}
      />
    </>
  );
}
