import type { CustomerOrderStatus, PaymentStatus, ProductionStatus } from "@/lib/schema/domain";
import type { ResellerProfile, User } from "@/lib/db/schema";

export interface AdminResellerItem {
  profile: ResellerProfile;
  user: User;
}

export interface AdminOrderItem {
  id: string;
  sellerId: string;
  sellerName: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  groomBrideNames?: string | null;
  templateId?: string | null;
  templateTitle?: string | null;
  invitationId?: string | null;
  invitationSlug?: string | null;
  eventDate?: Date | null;
  eventLocation?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  status: CustomerOrderStatus;
  productionStatus: ProductionStatus;
  paymentStatus: PaymentStatus;
  assignedTo?: string | null;
  dueAt?: Date | null;
  createdAt: Date;
}

export interface AdminStats {
  totalResellers: number;
  activeResellers: number;
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
}

export interface AdminOrderStats {
  totalOrders: number;
  newOrders: number;
  inProgressOrders: number;
  completedOrders: number;
}

export interface AdminResellerStats {
  totalResellers: number;
  activeResellers: number;
  inactiveResellers: number;
  totalOrders: number;
  resellersWithOrders: number;
  newOrders: number;
  completedOrders: number;
}

export interface TopResellerTrendItem {
  sellerId: string;
  agencyName: string;
  slug: string;
  logoUrl: string | null;
  whatsappContact: string;
  customDomain: string | null;
  isActive: boolean;
  ownerName: string;
  ownerEmail: string;
  totalOrders: number;
  completedOrders: number;
  newOrders: number;
  inProgressOrders: number;
  percentageOfTotal: number;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
