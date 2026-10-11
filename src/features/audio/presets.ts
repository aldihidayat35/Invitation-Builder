export interface BacksoundPreset {
  readonly id: string;
  readonly name: string;
  readonly category: "tradisional" | "romantis" | "klasik" | "akustik" | "alam";
  readonly src: string;
  readonly artist: string;
  readonly description?: string;
}

export const BACKSOUND_PRESETS: readonly BacksoundPreset[] = [
  {
    id: "canon-in-d",
    name: "Canon in D Major",
    category: "klasik",
    src: "/audio/canon-in-d.mp3",
    artist: "Classical Wedding Orchestra",
    description: "Alunan string & harmoni orkestra klasik abadi untuk momen sakral pernikahan.",
  },
  {
    id: "there-is-romance",
    name: "There is Romance",
    category: "romantis",
    src: "/audio/there-is-romance.mp3",
    artist: "Kevin MacLeod",
    description: "Melodi orkestra cinta yang hangat, agung, dan menyentuh hati para tamu.",
  },
  {
    id: "heartwarming",
    name: "Heartwarming Piano",
    category: "akustik",
    src: "/audio/heartwarming.mp3",
    artist: "Acoustic Piano & Strings",
    description: "Petikan piano solo syahdu yang mendalam untuk suasana haru dan romantis.",
  },
  {
    id: "almost-bliss",
    name: "Almost Bliss",
    category: "romantis",
    src: "/audio/almost-bliss.mp3",
    artist: "Cinematic Harmony",
    description: "Nuansa sinematik lembut penuh kedamaian yang mempercantik setiap section undangan.",
  },
  {
    id: "eastern-thought",
    name: "Eastern Harmony Tradisional",
    category: "tradisional",
    src: "/audio/eastern-thought.mp3",
    artist: "Gamelan & Laras Nusantara",
    description: "Sentuhan instrumen gamelan dan nuansa tradisional yang anggun dan berwibawa.",
  },
];
