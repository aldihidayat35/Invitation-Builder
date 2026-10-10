/**
 * Expiry & Lifetime Duration Helpers for Invitations.
 * Supports presets: 3 months, 6 months, 1 year, and lifetime/unlimited.
 */

export type ExpiryDuration = "3_months" | "6_months" | "1_year" | "unlimited";

export const EXPIRY_PRESETS: Array<{
  value: ExpiryDuration;
  label: string;
  description: string;
}> = [
  {
    value: "3_months",
    label: "3 Bulan",
    description: "Aktif selama 3 bulan sejak tanggal publikasi.",
  },
  {
    value: "6_months",
    label: "6 Bulan (Standar)",
    description: "Aktif selama 6 bulan sejak tanggal publikasi.",
  },
  {
    value: "1_year",
    label: "1 Tahun",
    description: "Aktif selama 1 tahun (12 bulan) sejak tanggal publikasi.",
  },
  {
    value: "unlimited",
    label: "Selamanya (Tanpa Batas)",
    description: "Undangan tetap aktif selamanya tanpa batas waktu kedaluwarsa.",
  },
];

export function calculateExpiryDate(
  fromDate: Date,
  duration: ExpiryDuration | string,
): Date | null {
  if (duration === "unlimited" || duration === "lifetime" || !duration) {
    return null;
  }
  const result = new Date(fromDate);
  if (duration === "3_months") {
    result.setMonth(result.getMonth() + 3);
  } else if (duration === "6_months") {
    result.setMonth(result.getMonth() + 6);
  } else if (duration === "1_year") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    return null;
  }
  return result;
}

export function isInvitationExpiredOrClosed(invitation: {
  isManuallyClosed?: boolean | null;
  expiresAt?: Date | string | null;
}): boolean {
  if (invitation.isManuallyClosed) return true;
  if (!invitation.expiresAt) return false;
  return new Date(invitation.expiresAt).getTime() <= Date.now();
}

export function getRemainingDays(expiresAt?: Date | string | null): number | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatIndonesianDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
