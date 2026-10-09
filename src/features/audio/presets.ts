export interface BacksoundPreset {
  readonly id: string;
  readonly name: string;
  readonly category: "tradisional" | "romantis" | "klasik" | "akustik" | "alam";
  readonly src: string;
  readonly artist: string;
}

export const BACKSOUND_PRESETS: readonly BacksoundPreset[] = [
  {
    id: "gending-pengantin",
    name: "Gending Pengantin - Tradisional Anggun",
    category: "tradisional",
    src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    artist: "Gamelan & Laras Pelog",
  },
  {
    id: "romantic-piano",
    name: "A Thousand Years - Romantic Piano Romance",
    category: "romantis",
    src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    artist: "Acoustic Piano & Cello",
  },
  {
    id: "canon-in-d",
    name: "Canon in D - Romantic Strings & Harmony",
    category: "klasik",
    src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    artist: "Classical Wedding Orchestra",
  },
  {
    id: "akad-doa-restu",
    name: "Akad & Doa Restu - Akustik Hangat",
    category: "akustik",
    src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    artist: "Warm Acoustic Guitar",
  },
  {
    id: "gentle-stream-nature",
    name: "Alunan Alam & Gemericik Air Romantis",
    category: "alam",
    src: "https://actions.google.com/sounds/v1/water/gentle_stream_flowing.ogg",
    artist: "Nature Ambience",
  },
  {
    id: "windchimes-peaceful",
    name: "Lonceng Angin & Suasana Damai",
    category: "alam",
    src: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    artist: "Gentle Windchimes",
  },
];
