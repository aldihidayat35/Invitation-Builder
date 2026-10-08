"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { submitMyPrivacyRequest } from "@/features/operations/api";

export async function submitPrivacyRequestAction(formData: FormData): Promise<void> {
  const requestType = z.enum(["export", "delete"]).parse(formData.get("requestType"));
  const reasonRaw = formData.get("reason");
  const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
  await submitMyPrivacyRequest({ requestType, reason: reason || undefined });
  revalidatePath("/dashboard/privacy");
  revalidatePath("/dashboard/admin/operations");
}
