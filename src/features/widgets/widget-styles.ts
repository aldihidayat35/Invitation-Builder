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

export type GalleryPresentation =
  | "collage"
  | "mosaic"
  | "filmstrip"
  | "slider"
  | "polaroid-stack"
  | "arch-window"
  | "masonry-cascade"
  | "heritage-frame"
  | "glass-carousel"
  | "circular-bubbles";

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
    {
      id: "arch-window",
      label: "Arch Window",
      description: "Koleksi foto berbingkai kubah lengkung (arch top) bernuansa anggun & artistik.",
      defaultRadius: 16,
    },
    {
      id: "masonry-cascade",
      label: "Masonry Cascade",
      description: "Susunan foto vertikal bertingkat yang mengalir dinamis dengan variasi tinggi.",
      defaultRadius: 8,
    },
    {
      id: "heritage-frame",
      label: "Heritage Frame",
      description: "Galeri foto berbingkai ganda klasik dengan aksen sudut dan ornamen formal.",
      defaultRadius: 6,
    },
    {
      id: "glass-carousel",
      label: "Glass Carousel",
      description: "Slider modern dengan panel kartu kaca frosted transparan dan kontrol mengambang.",
      defaultRadius: 16,
    },
    {
      id: "circular-bubbles",
      label: "Circular Lockets",
      description: "Kompilasi foto bentuk lingkaran dan oval locket dengan ring border yang artistik.",
      defaultRadius: 999,
    },
  ],
  photoFrame: [
    {
      id: "torn-rect",
      label: "Sobek Persegi",
      description: "Bingkai kertas sobek persegi dengan serat tepi alami ala kolase scrapbook.",
      defaultRadius: 0,
    },
    {
      id: "torn-oval",
      label: "Sobek Oval Koran",
      description: "Bingkai oval dengan tepian sobekan koran vintage editorial.",
      defaultRadius: 0,
    },
    {
      id: "torn-circle",
      label: "Sobek Lingkaran",
      description: "Bentuk lingkaran artistik dengan serat kertas sobek di sekelilingnya.",
      defaultRadius: 999,
    },
    {
      id: "torn-heart",
      label: "Sobek Hati",
      description: "Siluet hati romantis dengan tepian kertas sobek lembut.",
      defaultRadius: 0,
    },
    {
      id: "torn-arch",
      label: "Kubah Arch Koran",
      description: "Bentuk kubah lengkung (arch) elegan beraksen kertas koran vintage.",
      defaultRadius: 0,
    },
  ],
  timeline: [
    {
      id: "vertical-left",
      label: "Vertikal Kiri",
      description: "Garis alur di sebelah kiri dengan titik node lingkaran dan kartu agenda di sampingnya.",
      defaultRadius: 10,
    },
    {
      id: "vertical-centered",
      label: "Vertikal Zig-Zag",
      description: "Garis penunjuk di tengah dengan kartu agenda berselang-seling kiri dan kanan.",
      defaultRadius: 12,
    },
    {
      id: "minimal-cards",
      label: "Kartu Minimalis",
      description: "Kartu jadwal bersih mandiri dengan badge waktu tebal dan pemisah halus.",
      defaultRadius: 8,
    },
    {
      id: "horizontal-steps",
      label: "Alur Langkah",
      description: "Tahapan horizontal 01, 02, 03 dengan garis penghubung dan scroll responsif.",
      defaultRadius: 999,
    },
    {
      id: "luxury-gold",
      label: "Kemewahan Klasik",
      description: "Aksen emas berkelas dengan simpul belah ketupat, garis ganda, dan font serif.",
      defaultRadius: 4,
    },
  ],
  wishes: [
    {
      id: "chat-bubbles",
      label: "Gelembung Obrolan",
      description: "Tampilan balon pesan dinamis ala chat modern dengan avatar inisial berwarna.",
      defaultRadius: 14,
    },
    {
      id: "modern-cards",
      label: "Kartu Modern",
      description: "Kartu-kartu doa minimalis dengan bayangan lembut, badge kehadiran, dan tanggal.",
      defaultRadius: 10,
    },
    {
      id: "masonry-board",
      label: "Papan Tempel",
      description: "Gaya memo notes estetik dengan rotasi lembut dan aksen peniti atau stiker.",
      defaultRadius: 8,
    },
    {
      id: "editorial-ticker",
      label: "Feed Editorial",
      description: "Deretan pesan bergaris batas halus elegan dengan tipografi bersih minimalis.",
      defaultRadius: 0,
    },
    {
      id: "luxury-gold",
      label: "Kemewahan Klasik",
      description: "Nuansa emas mewah dengan bingkai ganda halus dan font serif berkelas.",
      defaultRadius: 6,
    },
  ],
  coupleProfile: [
    {
      id: "side-by-side",
      label: "Dua Kolom Simetris",
      description: "Foto berdampingan dengan bingkai rounded rapi, nama, dan tombol Instagram sejajar.",
      defaultRadius: 12,
    },
    {
      id: "stacked-cards",
      label: "Kartu Bertumpuk",
      description: "Kartu mempelai pria dan wanita tersusun vertikal dengan pemisah konektor elegan di tengah.",
      defaultRadius: 16,
    },
    {
      id: "circular-medallion",
      label: "Liontin Lingkaran",
      description: "Foto berbingkai lingkaran ganda ala medali dengan ornamen floral dan inisial monogram.",
      defaultRadius: 999,
    },
    {
      id: "arch-window",
      label: "Kubah Arch",
      description: "Bingkai foto melengkung kubah anggun bergaya arsitektur kubah katedral klasik.",
      defaultRadius: 20,
    },
    {
      id: "luxury-gold",
      label: "Kemewahan Klasik",
      description: "Sentuhan aksen emas mewah dengan border ganda halus, tipografi serif, dan ornamen mahkota.",
      defaultRadius: 6,
    },
    {
      id: "minimalist-editorial",
      label: "Editorial Modern",
      description: "Gaya majalah fesyren minimalis dengan garis tipis vertikal, tipografi bold, dan layout lapang.",
      defaultRadius: 0,
    },
    {
      id: "polaroid-duo",
      label: "Polaroid Nostalgia",
      description: "Dua frame foto polaroid bersudut kemiringan estetik dengan bayangan lembut dan aksen pin.",
      defaultRadius: 4,
    },
    {
      id: "glass-morphism",
      label: "Kaca Transparan",
      description: "Kartu kaca frosted transparan dengan efek blur modern, border berkilau, dan bayangan lembut.",
      defaultRadius: 16,
    },
    {
      id: "heritage-ornament",
      label: "Nuansa Adat Tradisional",
      description: "Sentuhan ornamen etnik nusantara sudut dengan kartu formal penghormatan keluarga besar.",
      defaultRadius: 8,
    },
    {
      id: "heart-romance",
      label: "Romansa Hati",
      description: "Nuansa lembut romantis dengan lencana konektor lambang hati bercahaya dan warna hangat.",
      defaultRadius: 14,
    },
  ],
  ornamentFrame: [
    {
      id: "arch-window",
      label: "Kubah Lengkung (Arch Window)",
      description: "Kubah lengkung elegan jendela katedral dengan garis alur mengalir mulus dari puncak atas ke bawah.",
      defaultRadius: 0,
    },
    {
      id: "notched-bracket",
      label: "Sudut Cekung (Vintage Plaque)",
      description: "Plakat klasik dengan sudut cekung ke dalam dan bingkai ganda elegan.",
      defaultRadius: 0,
    },
    {
      id: "baroque-crest",
      label: "Mahkota Barok (Royal Crest)",
      description: "Bentuk mahkota barok megah dengan puncak lancip dan lekukan anggun di setiap sisi.",
      defaultRadius: 0,
    },
    {
      id: "wavy-cartouche",
      label: "Pita Bergelombang (Rococo Waves)",
      description: "Pigura bergelombang ritmis ala Rococo dengan alur dinamis yang simetris dan artistik.",
      defaultRadius: 0,
    },
    {
      id: "royal-plaque",
      label: "Plakat Oval Kerajaan (Smooth Plaque)",
      description: "Plakat lengkung halus gaya kerajaan dengan kuping membulat dan pinggang berlekuk lembut.",
      defaultRadius: 0,
    },
    {
      id: "scalloped-stamp",
      label: "Prangko Gerigi Klasik (Scalloped Stamp)",
      description: "Bingkai tepi bergerigi halus seperti segel prangko pos vintage dengan outline ganda mewah.",
      defaultRadius: 0,
    },
    {
      id: "pointed-cartouche",
      label: "Bintang Lancip Barok (Pointed Plaque)",
      description: "Plakat ornamen dengan ujung sudut meruncing simetris dan puncak dekoratif di setiap sisi.",
      defaultRadius: 0,
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
  photoFrame: legacy(["torn-rect", "torn-oval", "torn-circle", "torn-heart", "torn-arch"]),
  timeline: legacy(["vertical-left", "vertical-centered", "minimal-cards", "horizontal-steps", "luxury-gold"]),
  wishes: legacy(["chat-bubbles", "modern-cards", "masonry-board", "editorial-ticker", "luxury-gold"]),
  coupleProfile: legacy(["side-by-side", "stacked-cards", "circular-medallion", "arch-window", "luxury-gold"]),
  ornamentFrame: legacy(["arch-window", "notched-bracket", "baroque-crest", "wavy-cartouche", "royal-plaque", "scalloped-stamp", "pointed-cartouche"]),
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
    case "arch-window":
    case "masonry-cascade":
    case "heritage-frame":
    case "glass-carousel":
    case "circular-bubbles":
      return resolution.variant.id;
    case "spotlight-slider":
      return "slider";
    default:
      return "collage";
  }
}
