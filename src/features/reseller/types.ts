import type { CustomerOrderStatus } from "@/lib/schema/domain";

export interface ResellerOverviewStats {
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalClients: number;
  agencyName: string;
  slug: string;
  customDomain?: string | null;
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
