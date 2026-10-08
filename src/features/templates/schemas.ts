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
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).",
  )
  .min(3, "Slug minimal 3 karakter.")
  .max(100, "Slug maksimal 100 karakter.");

export const templateCatalogMetadataSchema = z.object({
  slug: templateSlugSchema.nullable().optional(),
  description: z.string().trim().max(1000, "Deskripsi maksimal 1000 karakter.").nullable().optional(),
  category: z
    .enum([
      "wedding",
      "engagement",
      "birthday",
      "aqiqah",
      "graduation",
      "corporate",
      "other",
    ])
    .default("wedding"),
  style: z
    .enum([
      "modern_minimalist",
      "rustic_boho",
      "traditional_jawa",
      "traditional_sunda",
      "traditional_minang",
      "botanical_sage",
      "islamic_syari",
      "luxury_elegant",
      "clean_editorial",
    ])
    .default("modern_minimalist"),
  thumbnailUrl: z.string().trim().url("URL thumbnail tidak valid.").nullable().or(z.literal("")).optional(),
  previewMockupUrl: z.string().trim().url("URL mockup tidak valid.").nullable().or(z.literal("")).optional(),
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
  supportedFeatures: z
    .array(
      z.enum([
        "rsvp",
        "google_maps",
        "digital_gift",
        "audio_player",
        "countdown",
        "gallery_slider",
        "guest_book",
        "video_embed",
        "story_timeline",
        "envelope_cover",
      ]),
    )
    .default([]),
  galleryUrls: z.array(z.string().trim().url()).max(10).default([]),
  demoInvitationSlug: z.string().trim().nullable().optional(),
  layoutFormat: z
    .enum(["vertical_scroll", "story_slide", "interactive_envelope"])
    .default("vertical_scroll"),
});
