import type { CustomerOrderStatus } from "@/lib/schema/domain";
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
  createdAt: Date;
}

export interface AdminStats {
  totalResellers: number;
  activeResellers: number;
  totalOrders: number;
  newOrders: number;
  completedOrders: number;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
