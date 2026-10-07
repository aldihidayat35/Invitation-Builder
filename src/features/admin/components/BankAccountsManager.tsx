"use client";

import { useState } from "react";
import type { ActionState, AdminBankAccountItem } from "../types";
import { BankAccountsTable } from "./BankAccountsTable";
import { CreateBankAccountModal } from "./CreateBankAccountModal";

interface BankAccountsManagerProps {
  accounts: AdminBankAccountItem[];
  createAction: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  toggleStatusAction: (id: string, nextStatus: boolean) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}

export function BankAccountsManager({
  accounts,
  createAction,
  toggleStatusAction,
  deleteAction,
}: BankAccountsManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "var(--dash-accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--dash-radius-sm)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Tambah Rekening Baru
        </button>
      </div>

      <BankAccountsTable
        accounts={accounts}
        onToggleStatus={toggleStatusAction}
        onDelete={deleteAction}
      />

      <CreateBankAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        action={async (prev, fd) => {
          const res = await createAction(prev, fd);
          if (res.ok) setIsModalOpen(false);
          return res;
        }}
      />
    </>
  );
}
