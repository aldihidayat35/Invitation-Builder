import { z } from "zod";

export const uuidSchema = z.uuid();

/** Invitation title: trimmed, 1..120 chars, no control characters. */
export const invitationTitleSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Judul undangan wajib diisi.")
      .max(120, "Judul undangan maksimal 120 karakter.")
      .refine(
        (v) => !/[\u0000-\u001F\u007F]/.test(v),
        "Judul undangan mengandung karakter tidak valid.",
      ),
  );

export const guestNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Nama tamu wajib diisi.")
      .max(120, "Nama tamu maksimal 120 karakter.")
      .refine(
        (v) => !/[\u0000-\u001F\u007F]/.test(v),
        "Nama tamu mengandung karakter tidak valid.",
      ),
  );

export const maxPartySchema = z.coerce
  .number()
  .int("Jumlah tamu harus bilangan bulat.")
  .min(1, "Minimal 1 orang.")
  .max(20, "Maksimal 20 orang.");

/** Lowercase url slug derived from a title: ASCII a-z0-9 words joined by `-`. */
export function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || "undangan";
}
