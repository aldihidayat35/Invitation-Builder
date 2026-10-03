/**
 * Curated catalog of high-quality fonts for wedding and event digital invitations.
 * Categorized into Latin/Cursive (Tegak Bersambung), Handwriting, Elegant Serif, Modern Sans, Decorative, and System fonts.
 * All font family names conform to `fontNameSchema` (/^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$/).
 */

export type FontCategory = "latin" | "handwriting" | "serif" | "sans" | "display" | "system";

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
  { id: "latin", label: "Latin & Tegak Bersambung (Kaligrafi Undangan)" },
  { id: "handwriting", label: "Tulisan Tangan & Casual (Santai)" },
  { id: "serif", label: "Serif Elegan (Formal & Mewah)" },
  { id: "sans", label: "Modern Sans (Bersih & Rapi)" },
  { id: "display", label: "Display & Dekoratif" },
  { id: "system", label: "Bawaan Sistem" },
] as const;

export const INVITATION_FONTS: readonly FontDefinition[] = [
  // --- Latin & Tegak Bersambung (Kaligrafi Undangan Romantis & Elegan)
  {
    family: "Great Vibes",
    name: "Great Vibes",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Dancing Script",
    name: "Dancing Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Alex Brush",
    name: "Alex Brush",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Parisienne",
    name: "Parisienne",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Pinyon Script",
    name: "Pinyon Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  { family: "Allura", name: "Allura", category: "latin", fallback: "cursive", isGoogleFont: true },
  {
    family: "Sacramento",
    name: "Sacramento",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Tangerine",
    name: "Tangerine",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Satisfy",
    name: "Satisfy",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Marck Script",
    name: "Marck Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Rochester",
    name: "Rochester",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Yellowtail",
    name: "Yellowtail",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "MonteCarlo",
    name: "MonteCarlo",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Herr Von Muellerhoff",
    name: "Herr Von Muellerhoff",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Monsieur La Doulaise",
    name: "Monsieur La Doulaise",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Mrs Saint Delafield",
    name: "Mrs Saint Delafield",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Rouge Script",
    name: "Rouge Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Meow Script",
    name: "Meow Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Qwigley",
    name: "Qwigley",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Italianno",
    name: "Italianno",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Ephesis",
    name: "Ephesis",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Whisper",
    name: "Whisper",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Waterfall",
    name: "Waterfall",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Birthstone",
    name: "Birthstone",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Birthstone Bounce",
    name: "Birthstone Bounce",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "WindSong",
    name: "WindSong",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Corinthia",
    name: "Corinthia",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Cherish",
    name: "Cherish",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Petemoss",
    name: "Petemoss",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Beau Rivage",
    name: "Beau Rivage",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Lavishly Yours",
    name: "Lavishly Yours",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "The Nautigal",
    name: "The Nautigal",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Lovers Quarrel",
    name: "Lovers Quarrel",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Aguafina Script",
    name: "Aguafina Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Arizonia",
    name: "Arizonia",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Bilbo Swash Caps",
    name: "Bilbo Swash Caps",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Clicker Script",
    name: "Clicker Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Euphoria Script",
    name: "Euphoria Script",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  { family: "Felipa", name: "Felipa", category: "latin", fallback: "cursive", isGoogleFont: true },
  {
    family: "Fondamento",
    name: "Fondamento",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  { family: "Ruthie", name: "Ruthie", category: "latin", fallback: "cursive", isGoogleFont: true },
  {
    family: "Niconne",
    name: "Niconne",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Norican",
    name: "Norican",
    category: "latin",
    fallback: "cursive",
    isGoogleFont: true,
  },

  // --- Tulisan Tangan & Casual (Santai, Hangat & Alami)
  {
    family: "Caramel",
    name: "Caramel",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Comforter",
    name: "Comforter",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Dawning of a New Day",
    name: "Dawning of a New Day",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Grand Hotel",
    name: "Grand Hotel",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Kalam",
    name: "Kalam",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Kaushan Script",
    name: "Kaushan Script",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Kristi",
    name: "Kristi",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "La Belle Aurore",
    name: "La Belle Aurore",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "League Script",
    name: "League Script",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Meddon",
    name: "Meddon",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Pacifico",
    name: "Pacifico",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Reenie Beanie",
    name: "Reenie Beanie",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Vibur",
    name: "Vibur",
    category: "handwriting",
    fallback: "cursive",
    isGoogleFont: true,
  },
  {
    family: "Zeyada",
    name: "Zeyada",
    category: "handwriting",
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
  {
    family: "Abril Fatface",
    name: "Abril Fatface",
    category: "serif",
    fallback: "serif",
    isGoogleFont: true,
  },
  {
    family: "Playfair Display SC",
    name: "Playfair Display SC",
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
  { family: "Lato", name: "Lato", category: "sans", fallback: "sans-serif", isGoogleFont: true },
  {
    family: "Poppins",
    name: "Poppins",
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
  { family: "Inter", name: "Inter", category: "sans", fallback: "sans-serif", isGoogleFont: true },
  {
    family: "Open Sans",
    name: "Open Sans",
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
    family: "Nunito",
    name: "Nunito",
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
  { family: "Cabin", name: "Cabin", category: "sans", fallback: "sans-serif", isGoogleFont: true },

  // --- Display & Dekoratif
  {
    family: "Cinzel Decorative",
    name: "Cinzel Decorative",
    category: "display",
    fallback: "serif",
    isGoogleFont: true,
  },
  { family: "Elsie", name: "Elsie", category: "display", fallback: "serif", isGoogleFont: true },
  {
    family: "Miss Fajardose",
    name: "Miss Fajardose",
    category: "display",
    fallback: "cursive",
    isGoogleFont: true,
  },

  // --- Bawaan Sistem (Standar)
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
