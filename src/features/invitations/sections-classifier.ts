import type { Section } from "@/lib/schema";

export interface ClassifiedSection {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  isOpening: boolean;
  isMandatory: boolean;
  enabled: boolean;
}

/**
 * Classifies a template section to determine its category, icon, user-friendly description,
 * and whether it is a mandatory core section (Cover, Mempelai, Acara) or an optional section
 * that can be toggled by the client or admin (Galeri, Love Story, RSVP, Wishes, Gifts, Quotes, etc.).
 */
export function classifySection(
  section: Section,
  disabledSectionIds: Set<string> | string[] = [],
): ClassifiedSection {
  const disabledSet = Array.isArray(disabledSectionIds)
    ? new Set(disabledSectionIds)
    : disabledSectionIds;

  const nameLower = (section.name || "").toLowerCase();
  const idLower = section.id.toLowerCase();
  const hasWidget = (type: string) =>
    section.elements.some((el) => el.type === "widget" && el.widgetType === type);

  // 1. Cover Pembuka (Opening Canvas) - Mandatory Core
  if (
    section.isOpening ||
    idLower.includes("cover") ||
    nameLower.includes("cover") ||
    nameLower.includes("pembuka")
  ) {
    return {
      id: section.id,
      name: section.name || "Cover Pembuka",
      category: "Cover",
      icon: "cover",
      description: "Halaman pembuka utama dengan nama pengantin dan tombol buka undangan.",
      isOpening: true,
      isMandatory: true,
      enabled: true,
    };
  }

  // 2. Profil Pasangan Mempelai - Mandatory Core
  if (
    hasWidget("coupleProfile") ||
    idLower.includes("couple") ||
    nameLower.includes("mempelai") ||
    nameLower.includes("pasangan")
  ) {
    return {
      id: section.id,
      name: section.name || "Profil Mempelai",
      category: "Mempelai",
      icon: "couple",
      description: "Informasi profil mempelai pria, wanita, dan kedua orang tua.",
      isOpening: false,
      isMandatory: true,
      enabled: true,
    };
  }

  // 3. Rangkaian Acara, Jadwal & Lokasi - Mandatory Core
  if (
    hasWidget("eventSchedule") ||
    hasWidget("countdown") ||
    idLower.includes("event") ||
    nameLower.includes("acara") ||
    nameLower.includes("jadwal") ||
    nameLower.includes("lokasi")
  ) {
    return {
      id: section.id,
      name: section.name || "Rangkaian Acara",
      category: "Acara",
      icon: "event",
      description: "Jadwal akad, resepsi, peta lokasi Google Maps, dan hitung mundur.",
      isOpening: false,
      isMandatory: true,
      enabled: true,
    };
  }

  // --- Optional Sections below (can be toggled by client or admin) ---
  const isCurrentlyDisabled = disabledSet.has(section.id);

  // 4. Galeri Foto & Video
  if (
    hasWidget("gallery") ||
    idLower.includes("gallery") ||
    nameLower.includes("galeri") ||
    nameLower.includes("foto")
  ) {
    return {
      id: section.id,
      name: section.name || "Galeri Foto",
      category: "Galeri Foto",
      icon: "gallery",
      description: "Galeri foto prewedding dan momen bahagia pengantin.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  // 5. Cerita Cinta (Love Story)
  if (
    hasWidget("loveStory") ||
    idLower.includes("story") ||
    nameLower.includes("cerita") ||
    nameLower.includes("love")
  ) {
    return {
      id: section.id,
      name: section.name || "Cerita Cinta (Love Story)",
      category: "Love Story",
      icon: "story",
      description: "Kisah perjalanan cinta dari awal bertemu hingga pelaminan.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  // 6. Konfirmasi Kehadiran (RSVP)
  if (
    hasWidget("rsvp") ||
    idLower.includes("rsvp") ||
    nameLower.includes("rsvp") ||
    nameLower.includes("kehadiran")
  ) {
    return {
      id: section.id,
      name: section.name || "Konfirmasi RSVP",
      category: "Konfirmasi RSVP",
      icon: "rsvp",
      description: "Formulir konfirmasi kehadiran langsung bagi para tamu undangan.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  // 7. Buku Tamu / Doa & Ucapan (Wishes)
  if (
    hasWidget("wishes") ||
    idLower.includes("wishes") ||
    nameLower.includes("ucapan") ||
    nameLower.includes("doa") ||
    nameLower.includes("buku tamu")
  ) {
    return {
      id: section.id,
      name: section.name || "Buku Doa & Ucapan",
      category: "Doa & Ucapan",
      icon: "wishes",
      description: "Kolom pesan doa restu dan ucapan selamat dari para tamu undangan.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  // 8. Tanda Kasih / Amplop & Kado Digital (Gift)
  if (
    hasWidget("gift") ||
    idLower.includes("gift") ||
    nameLower.includes("kado") ||
    nameLower.includes("amplop") ||
    nameLower.includes("tanda kasih") ||
    nameLower.includes("rekening")
  ) {
    return {
      id: section.id,
      name: section.name || "Kado & Hadiah Digital",
      category: "Kado Digital",
      icon: "gift",
      description: "Nomor rekening bank atau alamat pengiriman kado fisik.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  // 9. Kutipan Ayat Suci / Doa Pembuka
  if (
    nameLower.includes("ayat") ||
    nameLower.includes("quote") ||
    nameLower.includes("kutipan") ||
    nameLower.includes("bismillah")
  ) {
    return {
      id: section.id,
      name: section.name || "Kutipan Ayat Suci / Doa",
      category: "Kutipan & Doa",
      icon: "quote",
      description: "Kutipan ayat suci atau kata mutiara pembuka pernikahan.",
      isOpening: false,
      isMandatory: false,
      enabled: !isCurrentlyDisabled,
    };
  }

  return {
    id: section.id,
    name: section.name || `Section ${section.id}`,
    category: "Konten Tambahan",
    icon: "layers",
    description: "Section pelengkap pada tema undangan ini.",
    isOpening: false,
    isMandatory: false,
    enabled: !isCurrentlyDisabled,
  };
}

export function classifyAllSections(
  sections: readonly Section[],
  disabledSectionIds: Set<string> | string[] = [],
): ClassifiedSection[] {
  return sections.map((sec) => classifySection(sec, disabledSectionIds));
}
