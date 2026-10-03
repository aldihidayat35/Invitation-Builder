/**
 * Curated catalog of high-quality fonts for wedding and event digital invitations.
 * Categorized into Script/Calligraphy, Elegant Serif, Modern Sans, Decorative, and System fonts.
 * All font family names conform to `fontNameSchema` (/^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/).
 */

export type FontCategory = "script" | "serif" | "sans" | "display" | "system";

export interface FontDefinition {
  readonly family: string;
  readonly name: string;
  readonly category: FontCategory;
  readonly fallback: "cursive" | "serif" | "sans-serif" | "monospace";
  readonly isGoogleFont: boolean;
}

export interface FontCategoryInfo {
  readonly id: FontCategory;
  readonly label: string;
}

export const FONT_CATEGORIES: readonly FontCategoryInfo[] = [
  { id: "script", label: "Kaligrafi & Script (Romantis)" },
  { id: "serif", label: "Serif Elegan (Formal & Mewah)" },
  { id: "sans", label: "Modern Sans (Bersih & Rapi)" },
  { id: "display", label: "Display & Dekoratif" },
  { id: "system", label: "Bawaan Sistem" },
] as const;

export const INVITATION_FONTS: readonly FontDefinition[] = [
  // --- Script & Kaligrafi (Sangat populer untuk nama mempelai & judul romantis)
  {
    family: "Great Vibes",
    name: "Great Vibes",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Dancing Script",
    name: "Dancing Script",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Alex Brush",
    name: "Alex Brush",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Parisienne",
    name: "Parisienne",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Pinyon Script",
    name: "Pinyon Script",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  { family: "Allura", name: "Allura", category: "script", fallback: "cursive", isGoogleFont: true },
  {
    family: "Sacramento",
    name: "Sacramento",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Tangerine",
    name: "Tangerine",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Satisfy",
    name: "Satisfy",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Marck Script",
    name: "Marck Script",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Rochester",
    name: "Rochester",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Yellowtail",
    name: "Yellowtail",
    category: "script",
    fallback: "cursive",
    isGoogleFont: true,
  },

  // --- Serif Elegan & Formal (Mewah, klasik untuk tajuk & nama resmi)
  {
    family: "Playfair Display",
    name: "Playfair Display",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Cormorant Garamond",
    name: "Cormorant Garamond",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  { family: "Cinzel", name: "Cinzel", category: "serif", fallback: "serif", isGoogleFont: true },
  { family: "Lora", name: "Lora", category: "serif", fallback: "serif", isGoogleFont: true },
  { family: "Prata", name: "Prata", category: "serif", fallback: "serif", isGoogleFont: true },
  {
    family: "Bodoni Moda",
    name: "Bodoni Moda",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Marcellus",
    name: "Marcellus",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Merriweather",
    name: "Merriweather",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "EB Garamond",
    name: "EB Garamond",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Castoro Titling",
    name: "Castoro Titling",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Spectral",
    name: "Spectral",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "DM Serif Display",
    name: "DM Serif Display",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },

  // --- Modern Sans-Serif (Bersih, mudah dibaca untuk tanggal, jam, alamat & teks isi)
  {
    family: "Plus Jakarta Sans",
    name: "Plus Jakarta Sans",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Montserrat",
    name: "Montserrat",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Poppins",
    name: "Poppins",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  { family: "Inter", name: "Inter", category: "sans", fallback: "sans-serif", isGoogleFont: true },
  {
    family: "Outfit",
    name: "Outfit",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Raleway",
    name: "Raleway",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  { family: "Lato", name: "Lato", category: "sans", fallback: "sans-serif", isGoogleFont: true },
  {
    family: "Open Sans",
    name: "Open Sans",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Nunito",
    name: "Nunito",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Quicksand",
    name: "Quicksand",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Work Sans",
    name: "Work Sans",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },
  {
    family: "Josefin Sans",
    name: "Josefin Sans",
    category: "sans",
    fallback: "sans-serif",
    isGoogleFont: true,
  },

  // --- Display & Dekoratif (Monogram, tanggal besar, aksen artistik)
  {
    family: "Cinzel Decorative",
    name: "Cinzel Decorative",
    category: "display",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Abril Fatface",
    name: "Abril Fatface",
    category: "display",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Italiana",
    name: "Italiana",
    category: "display",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Rozha One",
    name: "Rozha One",
    category: "display",
    fallback: "serif",
    isGoogleFont: true,
  },

  // --- Bawaan Sistem (Tidak butuh koneksi internet)
  {
    family: "Georgia",
    name: "Georgia",
    category: "system",
    fallback: "serif",
    isGoogleFont: false,
  },
  {
    family: "Times New Roman",
    name: "Times New Roman",
    category: "system",
    fallback: "serif",
    isGoogleFont: false,
  },
  {
    family: "Garamond",
    name: "Garamond",
    category: "system",
    fallback: "serif",
    isGoogleFont: false,
  },
  {
    family: "Arial",
    name: "Arial",
    category: "system",
    fallback: "sans-serif",
    isGoogleFont: false,
  },
  {
    family: "Trebuchet MS",
    name: "Trebuchet MS",
    category: "system",
    fallback: "sans-serif",
    isGoogleFont: false,
  },
  {
    family: "Verdana",
    name: "Verdana",
    category: "system",
    fallback: "sans-serif",
    isGoogleFont: false,
  },
] as const;

export const FONT_MAP: ReadonlyMap<string, FontDefinition> = new Map(
  INVITATION_FONTS.map((font) => [font.family.toLowerCase(), font]),
);

export function getFontDefinition(family: string | undefined): FontDefinition | undefined {
  if (!family) return undefined;
  return FONT_MAP.get(family.toLowerCase().trim());
}

export function getFontFallback(family: string | undefined): string {
  const def = getFontDefinition(family);
  if (!def) return "sans-serif";
  switch (def.fallback) {
    case "cursive":
      return "cursive, sans-serif";
    case "serif":
      return "serif";
    case "sans-serif":
      return "sans-serif";
    case "monospace":
      return "monospace";
  }
}

export function isGoogleFont(family: string | undefined): boolean {
  if (!family) return false;
  const def = getFontDefinition(family);
  return def ? def.isGoogleFont : false;
}
