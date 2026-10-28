export type MasterBankCategory = "bank" | "ewallet" | "qris";

export interface MasterBankItem {
  id: string;
  code: string;
  name: string;
  category: string;
  logoUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMasterBankInput {
  code: string;
  name: string;
  category?: string;
  logoUrl: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateMasterBankInput {
  code?: string;
  name?: string;
  category?: string;
  logoUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}
