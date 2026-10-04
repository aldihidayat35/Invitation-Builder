/**
 * 5 Style Variations and Color Presets for each Widget type.
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

export const QUICK_COLOR_PALETTES: readonly QuickColorPalette[] = [
  { name: "Gold Mewah", color: "#b48318", background: "#fffbf0" },
  { name: "Mawar Romantis", color: "#be185d", background: "#fdf2f8" },
  { name: "Sage Natural", color: "#047857", background: "#f0fdf4" },
  { name: "Deep Navy", color: "#1e3a8a", background: "#eff6ff" },
  { name: "Charcoal Modern", color: "#1e293b", background: "#f8fafc" },
  { name: "Transparan Bersih", color: "#2b2118", background: "transparent" },
];

const COUNTDOWN_VARIANTS: readonly WidgetStyleVariant[] = [
  {
    id: "minimal",
    label: "Minimalis",
    description: "Angka bersih berjarak tanpa bingkai luar",
    defaultRadius: 0,
  },
  {
    id: "cards",
    label: "Kotak Kartu",
    description: "Tiap unit waktu berada dalam kotak kartu bersudut membulat",
    defaultRadius: 10,
  },
  {
    id: "pill",
    label: "Kapsul",
    description: "Seluruh countdown berada di dalam wadah kapsul lonjong",
    defaultRadius: 999,
  },
  {
    id: "circle",
    label: "Lingkaran",
    description: "Setiap digit waktu berada dalam lingkaran simetris",
    defaultRadius: 50,
  },
  {
    id: "luxury",
    label: "Mewah Border",
    description: "Bingkai bergaris ganda klasik dengan aksen mewah",
    defaultRadius: 8,
  },
];

export const WIDGET_STYLE_VARIANTS: Readonly<Record<string, readonly WidgetStyleVariant[]>> = {
  countdown: COUNTDOWN_VARIANTS,
  map: [
    {
      id: "outlined",
      label: "Pill Outlined",
      description: "Tombol kapsul bergaris tepi tipis elegan",
      defaultRadius: 999,
    },
    {
      id: "solid",
      label: "Pill Solid",
      description: "Tombol kapsul dengan warna aksen penuh kontras",
      defaultRadius: 999,
    },
    {
      id: "card",
      label: "Kartu Lokasi",
      description: "Wadah kartu latar lembut dengan tombol navigasi rute",
      defaultRadius: 12,
    },
    {
      id: "minimal",
      label: "Teks Minimal",
      description: "Tombol ringkas bergaris bawah tanpa bingkai tebal",
      defaultRadius: 0,
    },
    {
      id: "luxury",
      label: "Border Mewah",
      description: "Kartu berbingkai ganda dengan gaya undangan kerajaan",
      defaultRadius: 10,
    },
  ],
  guestGreeting: [
    {
      id: "elegant",
      label: "Elegan Bersih",
      description: "Tipografi minimalis berjarak dengan nama tamu dominan",
      defaultRadius: 0,
    },
    {
      id: "ornament",
      label: "Ornamen Garis",
      description: "Garis ornamen aksen tipis mengapit nama penerima",
      defaultRadius: 0,
    },
    {
      id: "card",
      label: "Kartu Amplop",
      description: "Wadah kartu berlatar lembut dengan bayangan halus",
      defaultRadius: 12,
    },
    {
      id: "pill",
      label: "Lencana Kapsul",
      description: "Lencana kapsul modern dengan latar aksen lembut",
      defaultRadius: 999,
    },
    {
      id: "frame",
      label: "Bingkai Klasik",
      description: "Bingkai garis tepi tipis mengelilingi kartu ucapan",
      defaultRadius: 8,
    },
  ],
  rsvp: [
    {
      id: "standard",
      label: "Standar Outlined",
      description: "Form bersih dengan input berbingkai tipis dan tombol pill",
      defaultRadius: 8,
    },
    {
      id: "card",
      label: "Kartu Terpadu",
      description: "Seluruh form berada di dalam kartu latar mandiri",
      defaultRadius: 14,
    },
    {
      id: "pills",
      label: "Opsi Kapsul",
      description: "Pilihan hadir/tidak hadir berupa tombol toggle kapsul",
      defaultRadius: 10,
    },
    {
      id: "minimal",
      label: "Garis Minimal",
      description: "Input bergaris bawah bersih tanpa kotak tertutup",
      defaultRadius: 0,
    },
    {
      id: "luxury",
      label: "Mewah Beraksen",
      description: "Form berbingkai ganda klasik dengan tombol aksen solid",
      defaultRadius: 12,
    },
  ],
  gift: [
    {
      id: "cards",
      label: "Kartu Rekening",
      description: "Tiap rekening di dalam kartu kotak terpisah dengan tombol salin",
      defaultRadius: 10,
    },
    {
      id: "minimal",
      label: "Minimalis Garis",
      description: "Daftar rekening tipis bergaris pemisah tanpa background tebal",
      defaultRadius: 0,
    },
    {
      id: "pill",
      label: "Kapsul Modern",
      description: "Tiap rekening dalam wadah kapsul bulat yang nyaman disentuh",
      defaultRadius: 999,
    },
    {
      id: "luxury",
      label: "Mewah Berbingkai",
      description: "Bingkai kartu ganda elegan dengan badge bank menonjol",
      defaultRadius: 14,
    },
    {
      id: "compact",
      label: "Kompak Ringkas",
      description: "Layout rekening ringkas hemat tempat vertikal",
      defaultRadius: 6,
    },
  ],
  music: [
    {
      id: "pill",
      label: "Kapsul Outlined",
      description: "Tombol kapsul dengan garis tepi tipis dan nada musik",
      defaultRadius: 999,
    },
    {
      id: "solid",
      label: "Kapsul Solid",
      description: "Tombol kapsul berwarna penuh dengan teks kontras",
      defaultRadius: 999,
    },
    {
      id: "disc",
      label: "Piringan Putar",
      description: "Tombol bulat piringan musik vinyl",
      defaultRadius: 999,
    },
    {
      id: "minimal",
      label: "Minimalis Teks",
      description: "Teks judul dan ikon play tanpa border tombol tebal",
      defaultRadius: 0,
    },
    {
      id: "bar",
      label: "Mini Player Bar",
      description: "Bar pemutar musik horizontal dengan status audio",
      defaultRadius: 12,
    },
  ],
  gallery: [
    {
      id: "grid-rounded",
      label: "Grid Sudut Bulat",
      description: "Galeri grid 3-kolom persegi dengan sudut membulat",
      defaultRadius: 8,
    },
    {
      id: "grid-border",
      label: "Grid Berbingkai",
      description: "Foto berbingkai tipis elegan bergaya pameran galeri",
      defaultRadius: 4,
    },
    {
      id: "slider-classic",
      label: "Slider Klasik",
      description: "Carousel foto tunggal dengan panah navigasi kiri-kanan",
      defaultRadius: 8,
    },
    {
      id: "slider-pill",
      label: "Slider Kapsul",
      description: "Carousel dengan kontrol navigasi kapsul melayang",
      defaultRadius: 12,
    },
    {
      id: "circle",
      label: "Foto Lingkaran",
      description: "Foto dipotong melingkar simetris bergaya artistik",
      defaultRadius: 999,
    },
  ],
};

export function getWidgetStyleVariants(widgetType: string): readonly WidgetStyleVariant[] {
  const list = WIDGET_STYLE_VARIANTS[widgetType];
  return list ?? COUNTDOWN_VARIANTS;
}
