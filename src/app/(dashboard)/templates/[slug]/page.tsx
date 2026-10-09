import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogDetail } from "@/features/templates/api";
import { getPublicSiteSettings } from "@/features/site/api";
import { TemplateDetailView, type PublicTemplateDetail } from "./TemplateDetailView";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

const PRESET_FALLBACK_TEMPLATES: Record<string, PublicTemplateDetail> = {
  "classic-floral-botanical": {
    id: "preset-classic-floral",
    name: "Classic Floral",
    slug: "classic-floral-botanical",
    category: "Pernikahan",
    description: "Desain undangan botanical dengan sentuhan floral lembut dan aksen sage green yang menenangkan. Sangat cocok untuk pesta pernikahan tema rustic, garden, atau natural aesthetic.",
    price: 89000,
    thumbnailUrl: "/images/template-botanical.jpg",
    previewUrl: "/i/demo-classic-floral",
    features: [
      "Musik Latar Romantis Autoplay & Kontrol Audio",
      "Buku Tamu & Konfirmasi Kehadiran (RSVP) Real-time",
      "Amplop Digital & Integrasi Transfer Bank / QRIS",
      "Peta Lokasi Google Maps Interaktif & Navigasi",
      "Hitung Mundur Waktu Acara (Countdown Timer)",
      "Galeri Foto Mempelai & Love Story Timeline",
    ],
    palette: [
      { name: "Sage Green", hex: "#8A9A86" },
      { name: "Warm Ivory", hex: "#F4F1EA" },
      { name: "Forest Tint", hex: "#4A5847" },
    ],
  },
  "classic-floral": {
    id: "preset-classic-floral",
    name: "Classic Floral",
    slug: "classic-floral",
    category: "Pernikahan",
    description: "Desain undangan botanical dengan sentuhan floral lembut dan aksen sage green yang menenangkan. Sangat cocok untuk pesta pernikahan tema rustic, garden, atau natural aesthetic.",
    price: 89000,
    thumbnailUrl: "/images/template-botanical.jpg",
    previewUrl: "/i/demo-classic-floral",
    features: [
      "Musik Latar Romantis Autoplay & Kontrol Audio",
      "Buku Tamu & Konfirmasi Kehadiran (RSVP) Real-time",
      "Amplop Digital & Integrasi Transfer Bank / QRIS",
      "Peta Lokasi Google Maps Interaktif & Navigasi",
      "Hitung Mundur Waktu Acara (Countdown Timer)",
      "Galeri Foto Mempelai & Love Story Timeline",
    ],
    palette: [
      { name: "Sage Green", hex: "#8A9A86" },
      { name: "Warm Ivory", hex: "#F4F1EA" },
      { name: "Forest Tint", hex: "#4A5847" },
    ],
  },
  "royal-elegant-jawa": {
    id: "preset-royal-elegant",
    name: "Royal Elegant",
    slug: "royal-elegant-jawa",
    category: "Pernikahan",
    description: "Kemewahan motif batik Kencana dan aksen emas megah untuk perayaan agung adat Nusantara dengan perpaduan modernitas yang berwibawa.",
    price: 119000,
    thumbnailUrl: "/images/template-jawa.jpg",
    previewUrl: "/i/demo-royal-elegant",
    features: [
      "Cover Amplop Pembuka Tradisional Interaktif",
      "Musik Gending / Instrumen Pengantin Elegan",
      "Buku Tamu & RSVP Digital Otomatis",
      "Amplop Digital & Transfer Bank Tanpa Potongan",
      "Peta Lokasi & Panduan Rute Google Maps",
      "Galeri Foto Adat & Kisah Kasih Mempelai",
    ],
    palette: [
      { name: "Gold Kencana", hex: "#D4AF37" },
      { name: "Dark Walnut", hex: "#2C221E" },
      { name: "Ivory Silk", hex: "#FFFDF9" },
    ],
  },
  "royal-elegant": {
    id: "preset-royal-elegant",
    name: "Royal Elegant",
    slug: "royal-elegant",
    category: "Pernikahan",
    description: "Kemewahan motif batik Kencana dan aksen emas megah untuk perayaan agung adat Nusantara dengan perpaduan modernitas yang berwibawa.",
    price: 119000,
    thumbnailUrl: "/images/template-jawa.jpg",
    previewUrl: "/i/demo-royal-elegant",
    features: [
      "Cover Amplop Pembuka Tradisional Interaktif",
      "Musik Gending / Instrumen Pengantin Elegan",
      "Buku Tamu & RSVP Digital Otomatis",
      "Amplop Digital & Transfer Bank Tanpa Potongan",
      "Peta Lokasi & Panduan Rute Google Maps",
      "Galeri Foto Adat & Kisah Kasih Mempelai",
    ],
    palette: [
      { name: "Gold Kencana", hex: "#D4AF37" },
      { name: "Dark Walnut", hex: "#2C221E" },
      { name: "Ivory Silk", hex: "#FFFDF9" },
    ],
  },
  "modern-minimal": {
    id: "preset-modern-minimal",
    name: "Modern Minimal",
    slug: "modern-minimal",
    category: "Pernikahan",
    description: "Gaya tipografi editorial kontemporer dengan palet terakota hangat dan komposisi layout bersih yang memikat mata.",
    price: 99000,
    thumbnailUrl: "/images/template-boho.jpg",
    previewUrl: "/i/demo-modern-minimal",
    features: [
      "Tipografi Editorial Eksklusif & Elegan",
      "Musik Akustik Santai & Romantis",
      "RSVP Interaktif & Ucapan Doa Tamu",
      "Peta Google Maps & Integrasi Kalender Acara",
      "Amplop Digital Praktis & QRIS",
      "Countdown Waktu Pernikahan",
    ],
    palette: [
      { name: "Terracotta Warm", hex: "#C7A080" },
      { name: "Mocha Ink", hex: "#583B2B" },
      { name: "Soft Sand", hex: "#F4DED0" },
    ],
  },
  "garden-beauty": {
    id: "preset-garden-beauty",
    name: "Garden Beauty",
    slug: "garden-beauty",
    category: "Pernikahan",
    description: "Nuansa kebun asri dengan ilustrasi dedaunan estetik dan palet sage lembut yang memberikan kesan teduh dan sakral.",
    price: 99000,
    thumbnailUrl: "/images/template-botanical.jpg",
    previewUrl: "/i/demo-garden-beauty",
    features: [
      "Ornamen Dedaunan & Bunga Pastel",
      "Musik Latar Autoplay",
      "Fitur RSVP & Buku Tamu Digital",
      "Navigasi Peta Google Maps",
      "Amplop Digital & Hadiah Online",
    ],
    palette: [
      { name: "Sage Pastel", hex: "#80927A" },
      { name: "Olive Tint", hex: "#685B42" },
      { name: "Cream Soft", hex: "#FFF9EB" },
    ],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [template, settings] = await Promise.all([
    getCatalogDetail(slug).catch(() => null),
    getPublicSiteSettings().catch(() => null),
  ]);

  const fallback = PRESET_FALLBACK_TEMPLATES[slug.toLowerCase()] || PRESET_FALLBACK_TEMPLATES["classic-floral-botanical"];
  const name = template?.name || fallback?.name || "Template Undangan";
  const appName = settings?.appName || "Undangan.id";
  const desc = template?.description || fallback?.description || "Template undangan digital eksklusif siap pakai.";

  return {
    title: `${name} — Template Undangan Digital Elegan | ${appName}`,
    description: desc,
    openGraph: {
      title: `${name} — Template Undangan Digital | ${appName}`,
      description: desc,
      images: template?.thumbnailUrl || fallback?.thumbnailUrl ? [{ url: template?.thumbnailUrl || fallback?.thumbnailUrl || "" }] : [],
    },
  };
}

export default async function TemplateDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const autoOpenOrder = sParams.order === "1" || sParams.order === "true";

  const [dbTemplate, settings] = await Promise.all([
    getCatalogDetail(slug).catch((err) => {
      console.error("[catalog-slug] Failed to load template for slug:", slug, err);
      return null;
    }),
    getPublicSiteSettings().catch(() => null),
  ]);

  const cleanSlug = slug.toLowerCase();
  const fallback = PRESET_FALLBACK_TEMPLATES[cleanSlug] || Object.values(PRESET_FALLBACK_TEMPLATES).find((t) => t.slug.toLowerCase().includes(cleanSlug) || cleanSlug.includes(t.slug.toLowerCase()));

  if (!dbTemplate && !fallback) {
    notFound();
  }

  const rawCategory = dbTemplate?.category || fallback?.category || "Pernikahan";
  const displayCategory =
    rawCategory === "wedding"
      ? "Pernikahan"
      : rawCategory === "engagement"
        ? "Tunangan"
        : rawCategory === "birthday"
          ? "Ulang Tahun"
          : rawCategory === "aqiqah"
            ? "Aqiqah"
            : rawCategory === "graduation"
              ? "Wisuda"
              : rawCategory === "corporate"
                ? "Corporate"
                : rawCategory;

  const resolvedPreviewUrl = dbTemplate?.demoInvitationSlug
    ? `/i/${dbTemplate.demoInvitationSlug}`
    : dbTemplate?.slug
      ? `/i/${dbTemplate.slug}`
      : fallback?.previewUrl;

  const templateDetail: PublicTemplateDetail = {
    id: dbTemplate?.id || fallback?.id || "template-custom",
    name: dbTemplate?.name || fallback?.name || "Template Undangan",
    slug: dbTemplate?.slug || fallback?.slug || cleanSlug,
    category: displayCategory,
    description:
      dbTemplate?.description ||
      fallback?.description ||
      "Template undangan digital elegan siap pakai dengan desain responsif dan fitur interaktif.",
    price: dbTemplate?.price ?? fallback?.price ?? 89000,
    thumbnailUrl:
      dbTemplate?.thumbnailUrl ||
      dbTemplate?.previewMockupUrl ||
      fallback?.thumbnailUrl ||
      "/images/template-botanical.jpg",
    previewUrl: resolvedPreviewUrl,
    features: (dbTemplate?.supportedFeatures?.length
      ? dbTemplate.supportedFeatures.map((f) => {
          switch (f) {
            case "rsvp":
              return "Buku Tamu & RSVP Digital Real-time";
            case "google_maps":
              return "Peta Lokasi Google Maps & Rute Navigasi";
            case "digital_gift":
              return "Amplop Digital & Rekening Transfer / QRIS";
            case "audio_player":
              return "Musik Latar Romantis Autoplay & Pengatur Volume";
            case "countdown":
              return "Hitung Mundur Waktu Acara (Countdown)";
            case "gallery_slider":
              return "Galeri Foto Mempelai & Love Story Timeline";
            case "guest_book":
              return "Buku Tamu Digital & Ucapan Doa";
            case "envelope_cover":
              return "Animasi Sampul Amplop Pembuka Interaktif";
            default:
              return `Fitur ${f.replace(/_/g, " ")}`;
          }
        })
      : fallback?.features) || [
      "Musik Latar Romantis Autoplay & Kontrol Audio",
      "Buku Tamu & Konfirmasi Kehadiran (RSVP) Real-time",
      "Amplop Digital & Integrasi Transfer Bank / QRIS",
      "Peta Lokasi Google Maps Interaktif & Navigasi",
      "Hitung Mundur Waktu Acara (Countdown Timer)",
      "Galeri Foto Mempelai & Love Story Timeline",
    ],
    palette:
      dbTemplate?.colorPalette?.length
        ? dbTemplate.colorPalette.map((c) => ({ name: c.name, hex: c.hex }))
        : fallback?.palette || [
            { name: "Gold Aksen", hex: "#D4AF37" },
            { name: "Warm Walnut", hex: "#2C221E" },
            { name: "Ivory", hex: "#FDFBF7" },
          ],
  };

  return (
    <TemplateDetailView
      template={templateDetail}
      appSettings={settings}
      autoOpenOrder={autoOpenOrder}
    />
  );
}
