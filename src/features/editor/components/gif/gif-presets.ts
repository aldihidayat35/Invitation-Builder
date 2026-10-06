/**
 * Curated wedding & celebration animated GIF stickers.
 * Categorized by theme: love/romantic, flowers, celebration/party, and ornaments.
 */

export type GifCategory = "all" | "saved" | "love" | "flowers" | "celebration" | "ornaments";

export interface GifPreset {
  readonly id: string;
  readonly title: string;
  readonly category: "love" | "flowers" | "celebration" | "ornaments";
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly tags: readonly string[];
}

export const GIF_CATEGORIES: ReadonlyArray<{ id: GifCategory; label: string; icon: string }> = [
  { id: "all", label: "Semua", icon: "✨" },
  { id: "saved", label: "Koleksi Tersimpan", icon: "⭐" },
  { id: "love", label: "Cinta & Romantis", icon: "❤️" },
  { id: "flowers", label: "Bunga & Daun", icon: "🌸" },
  { id: "celebration", label: "Pesta & Perayaan", icon: "🎉" },
  { id: "ornaments", label: "Ornamen & Pita", icon: "🎀" },
];

export const GIF_PRESETS: readonly GifPreset[] = [
  // --- Love & Romantic ---
  {
    id: "gif-love-heart-pulse",
    title: "Detak Jantung Cinta",
    category: "love",
    url: "https://media.giphy.com/media/26BRv0ThflsDTjDUs/giphy.gif",
    width: 200,
    height: 200,
    tags: ["love", "heart", "hati", "cinta", "romantis", "pulse"],
  },
  {
    id: "gif-love-rings-sparkle",
    title: "Sepasang Cincin Emas",
    category: "love",
    url: "https://media.giphy.com/media/l41lO3n0gIuY7vM0E/giphy.gif",
    width: 200,
    height: 200,
    tags: ["ring", "cincin", "emas", "wedding", "nikah", "sparkle"],
  },
  {
    id: "gif-love-floating-hearts",
    title: "Hati Cinta Melayang",
    category: "love",
    url: "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif",
    width: 220,
    height: 220,
    tags: ["floating", "hearts", "sayang", "romantis"],
  },
  {
    id: "gif-love-doves",
    title: "Sepasang Merpati Putih",
    category: "love",
    url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    width: 240,
    height: 200,
    tags: ["dove", "merpati", "burung", "kedamaian", "cinta"],
  },

  // --- Flowers & Botanicals ---
  {
    id: "gif-flower-rose-bloom",
    title: "Mawar Mekar Merah",
    category: "flowers",
    url: "https://media.giphy.com/media/3o7btQ8jDTPGDpg46I/giphy.gif",
    width: 200,
    height: 200,
    tags: ["rose", "mawar", "bunga", "bloom", "merah"],
  },
  {
    id: "gif-flower-white-floral",
    title: "Bunga Putih Elegan",
    category: "flowers",
    url: "https://media.giphy.com/media/l0HlQXkh1wx1Rjt4Y/giphy.gif",
    width: 200,
    height: 200,
    tags: ["floral", "flower", "putih", "elegan", "melati"],
  },
  {
    id: "gif-flower-golden-branch",
    title: "Ranting Daun Berkilau",
    category: "flowers",
    url: "https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif",
    width: 240,
    height: 180,
    tags: ["leaves", "daun", "ranting", "gold", "emas", "botanical"],
  },
  {
    id: "gif-flower-falling-petals",
    title: "Kelopak Bunga Gugur",
    category: "flowers",
    url: "https://media.giphy.com/media/26xBwdIuRJiAIqHwA/giphy.gif",
    width: 220,
    height: 260,
    tags: ["petals", "kelopak", "sakura", "gugur", "jatuh"],
  },

  // --- Celebration & Party ---
  {
    id: "gif-party-champagne-toast",
    title: "Denting Gelas Sampanye",
    category: "celebration",
    url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    width: 240,
    height: 240,
    tags: ["champagne", "toast", "gelas", "cheers", "pesta", "selamat"],
  },
  {
    id: "gif-party-confetti-shower",
    title: "Hujan Confetti Emas",
    category: "celebration",
    url: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif",
    width: 260,
    height: 220,
    tags: ["confetti", "party", "pesta", "emas", "meriah"],
  },
  {
    id: "gif-party-golden-sparkles",
    title: "Kilauan Bintang Emas",
    category: "celebration",
    url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
    width: 200,
    height: 200,
    tags: ["sparkles", "bintang", "kilau", "magic", "cahaya"],
  },
  {
    id: "gif-party-fireworks",
    title: "Kembang Api Romantis",
    category: "celebration",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    width: 250,
    height: 250,
    tags: ["fireworks", "kembang api", "malam", "perayaan"],
  },

  // --- Ornaments & Flourishes ---
  {
    id: "gif-ornament-golden-ribbon",
    title: "Pita Elegan Berkilau",
    category: "ornaments",
    url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif",
    width: 220,
    height: 180,
    tags: ["ribbon", "pita", "emas", "hadiah", "ikat"],
  },
  {
    id: "gif-ornament-corner-accent",
    title: "Sudut Bingkai Mewah",
    category: "ornaments",
    url: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    width: 200,
    height: 200,
    tags: ["corner", "bingkai", "ornamen", "sudut", "vintage"],
  },
  {
    id: "gif-ornament-divider",
    title: "Garis Pembatas Bersinar",
    category: "ornaments",
    url: "https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif",
    width: 300,
    height: 80,
    tags: ["divider", "pembatas", "garis", "pemisah", "elegan"],
  },
];
