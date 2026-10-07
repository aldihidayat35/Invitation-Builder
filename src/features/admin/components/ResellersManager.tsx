"use client";

import { useState } from "react";
import type { ActionState, AdminResellerItem } from "../types";
import { ResellersTable } from "./ResellersTable";
import { TopupCreditModal } from "./TopupCreditModal";

interface ResellersManagerProps {
  resellers: AdminResellerItem[];
  topupAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  toggleStatusAction: (profileId: string, nextStatus: boolean) => Promise<void>;
}

export function ResellersManager({
  resellers,
  topupAction,
  toggleStatusAction,
}: ResellersManagerProps) {
  const [selectedForTopup, setSelectedForTopup] = useState<AdminResellerItem | null>(null);

  return (
    <>
      <ResellersTable
        resellers={resellers}
        onSelectForTopup={(item) => setSelectedForTopup(item)}
        onToggleStatus={toggleStatusAction}
      />

      <TopupCreditModal
        reseller={selectedForTopup}
        onClose={() => setSelectedForTopup(null)}
        action={topupAction}
      />
    </>
  );
}
