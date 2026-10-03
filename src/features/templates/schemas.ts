import { z } from "zod";

/** Library-facing template name: trimmed, 1..120 chars, no control characters. */
export const templateNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Nama template wajib diisi.")
      .max(120, "Nama template maksimal 120 karakter.")

      .refine(
        (v) => !/[\u0000-\u001F\u007F]/.test(v),
        "Nama template mengandung karakter tidak valid.",
      ),
  );

export const uuidSchema = z.uuid();
