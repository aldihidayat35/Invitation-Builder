"use server";

import { revalidatePath } from "next/cache";
import { updateAdminOrderStatus } from "@/features/admin/api";
import type { CustomerOrderStatus } from "@/lib/schema/domain";

export async function updateOrderStatusAction(
  orderId: string,
  nextStatus: CustomerOrderStatus,
): Promise<void> {
  await updateAdminOrderStatus(orderId, { status: nextStatus });
  revalidatePath("/dashboard/admin/orders");
  revalidatePath("/dashboard/reseller/orders");
}

export async function linkOrderInvitationAction(
  orderId: string,
  invitationId: string,
): Promise<void> {
  await updateAdminOrderStatus(orderId, { invitationId, status: "completed" });
  revalidatePath("/dashboard/admin/orders");
  revalidatePath("/dashboard/reseller/orders");
}
