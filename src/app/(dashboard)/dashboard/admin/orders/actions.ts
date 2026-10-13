"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  changeOrderStatus,
  changeOrderTemplate,
  changePaymentStatus,
  changeProductionStatus,
  configureProduction,
  createOrderProject,
  regenerateOrderClientToken,
  adminVerifyOrderBank,
} from "@/features/orders/api";
import { ORDER_STATUSES, PAYMENT_STATUSES, PRODUCTION_STATUSES } from "@/lib/schema/domain";

const idSchema = z.uuid();

function textField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refreshOrder(orderId: string): void {
  revalidatePath("/dashboard/admin/orders");
  revalidatePath(`/dashboard/admin/orders/${orderId}`);
  revalidatePath("/dashboard/reseller/orders");
  revalidatePath(`/dashboard/reseller/orders/${orderId}`);
}

export async function transitionOrderAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const nextStatus = z.enum(ORDER_STATUSES).parse(textField(formData, "nextStatus"));
  await changeOrderStatus(orderId, nextStatus, textField(formData, "note") || undefined);
  refreshOrder(orderId);
}

export async function configureProductionAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const rawClientId = textField(formData, "clientUserId");
  await configureProduction({
    orderId,
    clientUserId: rawClientId ? idSchema.parse(rawClientId) : undefined,
    workspaceId: idSchema.parse(textField(formData, "workspaceId")),
    assigneeId: idSchema.parse(textField(formData, "assigneeId")),
    templateId: idSchema.parse(textField(formData, "templateId")),
    dueAt: z.coerce.date().parse(textField(formData, "dueAt")),
    adminNotes: textField(formData, "adminNotes") || undefined,
  });
  refreshOrder(orderId);
}

export async function regenerateOrderClientTokenAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  await regenerateOrderClientToken(orderId);
  refreshOrder(orderId);
}

export async function createOrderProjectAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const result = await createOrderProject(orderId);
  refreshOrder(orderId);
  redirect(`/dashboard/invitations/${result.invitationId}`);
}

export async function transitionProductionAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const nextStatus = z.enum(PRODUCTION_STATUSES).parse(textField(formData, "nextStatus"));
  await changeProductionStatus(orderId, nextStatus, textField(formData, "note") || undefined);
  refreshOrder(orderId);
}

export async function updatePaymentAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const status = z.enum(PAYMENT_STATUSES).parse(textField(formData, "paymentStatus"));
  await changePaymentStatus(orderId, status, textField(formData, "note") || undefined);
  refreshOrder(orderId);
}

export async function changeOrderTemplateAction(formData: FormData): Promise<void> {
  const orderId = idSchema.parse(textField(formData, "orderId"));
  const templateId = idSchema.parse(textField(formData, "templateId"));
  await changeOrderTemplate(orderId, templateId);
  refreshOrder(orderId);
}

export async function adminVerifyOrderBankAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const orderId = idSchema.parse(textField(formData, "orderId"));
    const bank = textField(formData, "bank");
    const accountNumber = textField(formData, "accountNumber");
    const accountName = textField(formData, "accountName");
    const bank2 = textField(formData, "bank2");
    const accountNumber2 = textField(formData, "accountNumber2");
    const accountName2 = textField(formData, "accountName2");
    const adminNote = textField(formData, "adminNote");
    const confirmOrderAccepted = formData.get("confirmOrderAccepted") === "true";

    if (!bank || !accountNumber || !accountName) {
      return {
        ok: false,
        error: "Nama bank, nomor rekening, dan atas nama rekening utama wajib diisi.",
      };
    }

    await adminVerifyOrderBank({
      orderId,
      primary: { bank, accountNumber, accountName },
      secondary:
        bank2 && accountNumber2
          ? { bank: bank2, accountNumber: accountNumber2, accountName: accountName2 }
          : null,
      adminNote: adminNote || undefined,
      confirmOrderAccepted,
    });

    refreshOrder(orderId);
    return { ok: true, message: "Rekening resmi berhasil diverifikasi dan disinkronkan ke undangan." };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal memverifikasi rekening." };
  }
}

