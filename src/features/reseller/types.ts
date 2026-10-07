export interface ResellerOverviewStats {
  creditQuota: number;
  totalClients: number;
  totalTransactions: number;
  pendingTopups: number;
  agencyName: string;
  slug: string;
}

export interface TopupPackage {
  id: string;
  creditAmount: number;
  price: number;
  title: string;
  badge?: string;
  description: string;
}

export const TOPUP_PACKAGES: TopupPackage[] = [
  {
    id: "starter",
    creditAmount: 10,
    price: 150000,
    title: "Paket Starter (10 Undangan)",
    description: "Cocok untuk agensi pemula atau mencoba platform.",
  },
  {
    id: "growth",
    creditAmount: 25,
    price: 325000,
    title: "Paket Agensi (25 Undangan)",
    badge: "Paling Populer",
    description: "Harga lebih hemat Rp 13.000 / undangan.",
  },
  {
    id: "pro",
    creditAmount: 50,
    price: 600000,
    title: "Paket Bisnis (50 Undangan)",
    badge: "Hemat 20%",
    description: "Tarif grosir Rp 12.000 / undangan.",
  },
  {
    id: "enterprise",
    creditAmount: 100,
    price: 1000000,
    title: "Paket Enterprise (100 Undangan)",
    badge: "Terbaik",
    description: "Tarif grosir maksimal Rp 10.000 / undangan.",
  },
];

export interface ResellerTopupRequestItem {
  id: string;
  creditAmount: number;
  amountPaid: number;
  senderBank: string;
  senderAccountName: string;
  proofFileUrl: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  rejectionReason: string | null;
  createdAt: Date;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
}

export interface ResellerClientItem {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}

export interface ResellerBankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrCodeUrl: string | null;
  instructions: string | null;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
