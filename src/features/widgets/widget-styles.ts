/**
 * Selectable widget styles and backwards-compatible legacy style resolution.
 *
 * Current variants deliberately use new ids. Existing ids remain supported so
 * immutable published documents keep their established appearance.
 */

export interface WidgetStyleVariant {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly defaultRadius?: number;
}

export interface QuickColorPalette {
  readonly name: string;
  readonly color: string;
  readonly background: string;
  readonly border?: string;
}

export type WidgetVariantResolution =
  | { readonly kind: "current"; readonly variant: WidgetStyleVariant }
  | { readonly kind: "legacy"; readonly variant: WidgetStyleVariant }
  | {
      readonly kind: "fallback";
      readonly requestedVariant: string;
      readonly variant: WidgetStyleVariant;
    };

export type GalleryPresentation = "collage" | "mosaic" | "filmstrip" | "slider" | "polaroid-stack";

export const QUICK_COLOR_PALETTES: readonly QuickColorPalette[] = [
  { name: "Gold Mewah", color: "#9a6b16", background: "#fffaf0" },
  { name: "Mawar Romantis", color: "#ad2458", background: "#fff3f7" },
  { name: "Sage Natural", color: "#35705a", background: "#f3f8f3" },
  { name: "Deep Navy", color: "#243d73", background: "#f2f5fb" },
  { name: "Charcoal Modern", color: "#273244", background: "#f7f8fa" },
  { name: "Transparan Bersih", color: "#2b2118", background: "transparent" },
];

export const WIDGET_STYLE_VARIANTS: Readonly<Record<string, readonly WidgetStyleVariant[]>> = {
  countdown: [
    {
      id: "editorial-split",
      label: "Editorial Split",
      description: "Hari dibuat dominan, tiga satuan lain tersusun sebagai panel editorial.",
      defaultRadius: 4,
    },
    {
      id: "flip-cards",
      label: "Flip Cards",
      description: "Empat angka tampil sebagai kartu jam mekanis dengan garis lipatan.",
      defaultRadius: 10,
    },
    {
      id: "ribbon",
      label: "Ribbon",
      description: "Hitung mundur berada dalam pita horizontal dengan ujung dekoratif.",
      defaultRadius: 6,
    },
    {
      id: "orbit",
      label: "Orbit",
      description: "Setiap satuan berada dalam cincin terpisah dengan ritme yang ringan.",
      defaultRadius: 999,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Komposisi klasik simetris dengan bingkai ganda dan ornamen tengah.",
      defaultRadius: 8,
    },
  ],
  map: [
    {
      id: "full-bleed",
      label: "Full Bleed",
      description: "Peta memenuhi bidang dengan informasi dan tombol mengambang di atasnya.",
      defaultRadius: 14,
    },
    {
      id: "split-card",
      label: "Split Card",
      description: "Peta dan detail lokasi dibagi menjadi dua panel yang jelas.",
      defaultRadius: 12,
    },
    {
      id: "location-ticket",
      label: "Location Ticket",
      description: "Tampilan seperti tiket lokasi dengan jalur putus-putus dan CTA samping.",
      defaultRadius: 8,
    },
    {
      id: "soft-panel",
      label: "Soft Panel",
      description: "Panel lembut berlapis dengan pin besar dan tombol berkontras halus.",
      defaultRadius: 18,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Peta berbingkai klasik dengan detail lokasi bergaya undangan formal.",
      defaultRadius: 10,
    },
  ],
  guestGreeting: [
    {
      id: "editorial-left",
      label: "Editorial Left",
      description: "Sapaan rata kiri dengan nama besar dan garis editorial vertikal.",
      defaultRadius: 0,
    },
    {
      id: "envelope-card",
      label: "Envelope Card",
      description: "Nama tamu berada di kartu amplop dengan detail lipatan lembut.",
      defaultRadius: 12,
    },
    {
      id: "monogram",
      label: "Monogram",
      description: "Inisial tamu menjadi fokus di samping susunan sapaan ringkas.",
      defaultRadius: 999,
    },
    {
      id: "ribbon",
      label: "Ribbon",
      description: "Nama ditempatkan pada pita simetris yang menonjol di atas latar.",
      defaultRadius: 5,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Bingkai klasik dan ornamen sudut mengapit nama penerima.",
      defaultRadius: 8,
    },
  ],
  rsvp: [
    {
      id: "editorial-form",
      label: "Editorial Form",
      description: "Form rata kiri dengan judul besar dan field bergaris editorial.",
      defaultRadius: 0,
    },
    {
      id: "soft-card",
      label: "Soft Card",
      description: "Form bertingkat dalam kartu lembut dengan kontrol yang lapang.",
      defaultRadius: 16,
    },
    {
      id: "split-panel",
      label: "Split Panel",
      description: "Judul dan pilihan hadir dipisahkan dari detail tamu secara visual.",
      defaultRadius: 12,
    },
    {
      id: "ticket-form",
      label: "Ticket Form",
      description: "Form seperti tiket acara dengan perforasi dan CTA penuh.",
      defaultRadius: 8,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Form formal dengan bingkai ganda dan detail ornamental.",
      defaultRadius: 10,
    },
  ],
  gift: [
    {
      id: "bank-card",
      label: "Bank Card",
      description: "Rekening tampil seperti kartu pembayaran modern dengan nomor dominan.",
      defaultRadius: 16,
    },
    {
      id: "stacked-slips",
      label: "Stacked Slips",
      description: "Setiap rekening menjadi slip bertumpuk dengan susunan dinamis dan bayangan.",
      defaultRadius: 8,
    },
    {
      id: "wallet-panel",
      label: "Wallet Panel",
      description: "Daftar rekening berada dalam panel dompet dengan tab bank terstruktur.",
      defaultRadius: 14,
    },
    {
      id: "compact-list",
      label: "Compact List",
      description: "Daftar hemat ruang dengan nomor dan aksi salin cepat sejajar.",
      defaultRadius: 4,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Kartu hadiah klasik dengan bingkai ganda dan aksen ornamen formal.",
      defaultRadius: 10,
    },
    {
      id: "minimalist-clean",
      label: "Minimalist Clean",
      description: "Gaya minimalis modern dengan garis halus, tipografi elegan, dan tata letak lapang.",
      defaultRadius: 6,
    },
    {
      id: "envelope-tuck",
      label: "Envelope Card",
      description: "Desain amplop angpao eksklusif dengan aksen flap dan kartu rekening elegan.",
      defaultRadius: 12,
    },
    {
      id: "glass-card",
      label: "Glassmorphism",
      description: "Kartu kaca frosted transparan dengan border kilau dan bayangan lembut berkelas.",
      defaultRadius: 16,
    },
    {
      id: "gold-ornament",
      label: "Royal Ornament",
      description: "Gaya royal wedding dengan ornamen ukir sudut dan bingkai bernuansa mewah.",
      defaultRadius: 8,
    },
    {
      id: "qr-showcase",
      label: "QR & E-Wallet Hub",
      description: "Fokus visual e-wallet dan QRIS dengan kartu rekening terstruktur rapi.",
      defaultRadius: 14,
    },
  ],
  music: [
    {
      id: "vinyl",
      label: "Vinyl",
      description: "Kontrol bundar menyerupai piringan dengan label lagu di samping.",
      defaultRadius: 999,
    },
    {
      id: "mini-player",
      label: "Mini Player",
      description: "Pemutar lengkap dengan tombol, judul, dan garis progres dekoratif.",
      defaultRadius: 12,
    },
    {
      id: "equalizer",
      label: "Equalizer",
      description: "Tombol putar dipadukan dengan batang equalizer sebagai fokus.",
      defaultRadius: 10,
    },
    {
      id: "floating-pill",
      label: "Floating Pill",
      description: "Kontrol kapsul ringan dengan ikon terpisah dan bayangan mengambang.",
      defaultRadius: 999,
    },
    {
      id: "minimal-control",
      label: "Minimal Control",
      description: "Kontrol tipografi sederhana dengan garis aksen tanpa kartu penuh.",
      defaultRadius: 0,
    },
  ],
  gallery: [
    {
      id: "editorial-collage",
      label: "Editorial Collage",
      description: "Satu foto utama dipadukan dengan foto pendamping seperti majalah.",
      defaultRadius: 8,
    },
    {
      id: "mosaic",
      label: "Mosaic",
      description: "Grid tidak seragam dengan ritme ukuran foto yang lebih ekspresif.",
      defaultRadius: 6,
    },
    {
      id: "filmstrip",
      label: "Filmstrip",
      description: "Deretan foto horizontal dengan bingkai perforasi ala film.",
      defaultRadius: 2,
    },
    {
      id: "spotlight-slider",
      label: "Spotlight Slider",
      description: "Satu foto besar dengan navigasi dan indikator yang menyatu.",
      defaultRadius: 14,
    },
    {
      id: "polaroid-stack",
      label: "Polaroid Stack",
      description: "Foto tersusun seperti cetakan polaroid dengan rotasi bergantian.",
      defaultRadius: 3,
    },
  ],
};

const LEGACY_WIDGET_STYLE_VARIANTS: Readonly<Record<string, readonly WidgetStyleVariant[]>> = {
  countdown: legacy(["minimal", "cards", "pill", "circle", "luxury"]),
  map: legacy(["card", "outlined", "solid", "minimal", "luxury"]),
  guestGreeting: legacy(["elegant", "ornament", "card", "pill", "frame"]),
  rsvp: legacy(["standard", "card", "pills", "minimal", "luxury"]),
  gift: legacy(["cards", "minimal", "pill", "luxury", "compact"]),
  music: legacy(["pill", "solid", "disc", "minimal", "bar"]),
  gallery: legacy(["grid-rounded", "grid-border", "slider-classic", "slider-pill", "circle"]),
};

const LEGACY_DEFAULTS: Readonly<Record<string, WidgetStyleVariant>> = Object.fromEntries(
  Object.keys(WIDGET_STYLE_VARIANTS).map((type) => [
    type,
    {
      id: "default",
      label: "Gaya lama standar",
      description: "Tampilan standar dari dokumen sebelum sistem variasi baru.",
    },
  ]),
);

function legacy(ids: readonly string[]): readonly WidgetStyleVariant[] {
  return ids.map((id) => ({
    id,
    label: `Gaya lama · ${id}`,
    description: "Variasi lama dipertahankan agar desain yang sudah ada tidak berubah.",
  }));
}

export function getWidgetStyleVariants(widgetType: string): readonly WidgetStyleVariant[] {
  return WIDGET_STYLE_VARIANTS[widgetType] ?? [];
}

export function getDefaultWidgetStyle(
  widgetType: string,
): Readonly<{ variant: string; radius?: number }> {
  const first = getWidgetStyleVariants(widgetType)[0];
  return first
    ? {
        variant: first.id,
        ...(first.defaultRadius !== undefined && { radius: first.defaultRadius }),
      }
    : { variant: "default" };
}

export function resolveWidgetStyleVariant(
  widgetType: string,
  requestedVariant: string | undefined,
): WidgetVariantResolution {
  const current = getWidgetStyleVariants(widgetType);
  const requested = requestedVariant ?? "default";
  const currentMatch = current.find((variant) => variant.id === requested);
  if (currentMatch) return { kind: "current", variant: currentMatch };

  const legacyDefault = LEGACY_DEFAULTS[widgetType] ?? {
    id: "default",
    label: "Gaya lama standar",
    description: "Tampilan standar yang kompatibel dengan dokumen lama.",
  };
  if (requested === "default") return { kind: "legacy", variant: legacyDefault };

  const legacyMatch = LEGACY_WIDGET_STYLE_VARIANTS[widgetType]?.find(
    (variant) => variant.id === requested,
  );
  if (legacyMatch) return { kind: "legacy", variant: legacyMatch };

  return { kind: "fallback", requestedVariant: requested, variant: legacyDefault };
}

export function getGalleryPresentation(
  variant: string | undefined,
  legacyLayout: unknown,
): GalleryPresentation | "legacy-grid" | "legacy-slider" {
  const resolution = resolveWidgetStyleVariant("gallery", variant);
  if (resolution.kind !== "current") {
    return legacyLayout === "slider" ? "legacy-slider" : "legacy-grid";
  }
  switch (resolution.variant.id) {
    case "mosaic":
    case "filmstrip":
    case "polaroid-stack":
      return resolution.variant.id;
    case "spotlight-slider":
      return "slider";
    default:
      return "collage";
  }
}
