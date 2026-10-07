"use client";

import type { AdminResellerItem } from "../types";
import { ResellersTable } from "./ResellersTable";

interface ResellersManagerProps {
  resellers: AdminResellerItem[];
  toggleStatusAction: (profileId: string, nextStatus: boolean) => Promise<void>;
}

export function ResellersManager({
  resellers,
  toggleStatusAction,
}: ResellersManagerProps) {
  return (
    <ResellersTable
      resellers={resellers}
      onToggleStatus={toggleStatusAction}
    />
  );
}
