"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changeOrderStatus } from "@/features/orders/api";

export async function qualifyOrderAction(formData: FormData): Promise<void> {
  const orderId = z.uuid().parse(formData.get("orderId"));
  await changeOrderStatus(orderId, "qualified");
  revalidatePath("/dashboard/reseller/orders");
  revalidatePath(`/dashboard/reseller/orders/${orderId}`);
  revalidatePath("/dashboard/admin/orders");
}
