"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  activateAdminDomainTls,
  recordAdminRecoveryDrill,
  resolveAdminPrivacyRequest,
} from "@/features/operations/api";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function resolvePrivacyRequestAction(formData: FormData): Promise<void> {
  await resolveAdminPrivacyRequest({
    id: z.uuid().parse(field(formData, "id")),
    status: z.enum(["in_progress", "completed", "rejected"]).parse(field(formData, "status")),
    resolutionNote: z.string().min(3).max(1000).parse(field(formData, "resolutionNote")),
  });
  revalidatePath("/dashboard/admin/operations");
  revalidatePath("/dashboard/privacy");
}

export async function recordRecoveryDrillAction(formData: FormData): Promise<void> {
  const optionalNumber = (key: string) => {
    const value = field(formData, key);
    return value ? z.coerce.number().int().nonnegative().parse(value) : undefined;
  };
  await recordAdminRecoveryDrill({
    drillType: z.enum(["backup", "restore", "failover"]).parse(field(formData, "drillType")),
    status: z.enum(["planned", "running", "passed", "failed"]).parse(field(formData, "status")),
    environment: z.string().min(2).max(100).parse(field(formData, "environment")),
    backupReference: field(formData, "backupReference") || undefined,
    measuredRpoMinutes: optionalNumber("measuredRpoMinutes"),
    measuredRtoMinutes: optionalNumber("measuredRtoMinutes"),
    notes: field(formData, "notes") || undefined,
  });
  revalidatePath("/dashboard/admin/operations");
}

export async function activateDomainTlsAction(formData: FormData): Promise<void> {
  await activateAdminDomainTls(z.uuid().parse(field(formData, "profileId")));
  revalidatePath("/dashboard/admin/operations");
  revalidatePath("/dashboard/reseller/branding");
}
