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

export const templateSlugSchema = z
  .string()
  .trim()
  .transform((val) => val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""))
  .pipe(
    z
      .string()
      .min(3, "Slug minimal 3 karakter.")
      .max(100, "Slug maksimal 100 karakter.")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).",
      ),
  );

export const mediaUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      if (val.startsWith("/") || val.startsWith("./")) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Format URL atau path media tidak valid." },
  )
  .nullable()
  .or(z.literal(""))
  .optional();

export const templateCatalogMetadataSchema = z.object({
  slug: z
    .preprocess(
      (v) => (typeof v === "string" && !v.trim() ? null : v),
      templateSlugSchema.nullable().optional(),
    ),
  description: z.string().trim().max(1000, "Deskripsi maksimal 1000 karakter.").nullable().optional(),
  category: z.string().trim().min(1, "Kategori wajib diisi.").max(50).default("wedding"),
  style: z.string().trim().min(1, "Gaya desain wajib diisi.").max(50).default("modern_minimalist"),
  thumbnailUrl: mediaUrlSchema,
  previewMockupUrl: mediaUrlSchema,
  tier: z.enum(["free", "standard", "premium", "exclusive"]).default("standard"),
  price: z.number().int().min(0, "Harga tidak boleh negatif.").default(0),
  isPublic: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  colorPalette: z
    .array(
      z.object({
        hex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Format warna HEX tidak valid."),
        name: z.string().min(1).max(40),
        isPrimary: z.boolean().optional(),
      }),
    )
    .max(10)
    .default([]),
  supportedFeatures: z.array(z.string().trim().min(1)).default([]),
  galleryUrls: z
    .array(
      z.string().trim().refine(
        (val) => {
          if (!val) return true;
          if (val.startsWith("/") || val.startsWith("./")) return true;
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        },
        { message: "URL galeri tidak valid." },
      ),
    )
    .max(20)
    .default([]),
  demoInvitationSlug: z.string().trim().nullable().optional(),
  previewVideoUrl: mediaUrlSchema,
  layoutFormat: z
    .enum(["vertical_scroll", "story_slide", "interactive_envelope"])
    .default("vertical_scroll"),
});

