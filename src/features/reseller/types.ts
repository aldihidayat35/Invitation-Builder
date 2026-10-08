import type { CustomerOrderStatus, PaymentStatus, ProductionStatus } from "@/lib/schema/domain";

export interface ResellerOverviewStats {
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalClients: number;
  agencyName: string;
  slug: string;
  customDomain?: string | null;
  domainStatus: string;
  domainVerificationToken?: string | null;
  domainVerifiedAt?: Date | null;
  domainLastCheckedAt?: Date | null;
  tlsStatus: string;
}

export interface ResellerOrderItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  groomBrideNames?: string | null;
  eventDate?: Date | null;
  eventLocation?: string | null;
  templateTitle?: string | null;
  invitationSlug?: string | null;
  status: CustomerOrderStatus;
  productionStatus: ProductionStatus;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  adminNotes?: string | null;
  createdAt: Date;
}

export interface ResellerClientItem {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
