"use client";

import { useActionState, useRef, useState } from "react";
import type {
  TemplateColorSwatch,
  TemplateDetail,
  TemplateExtendedMetadata,
  TemplateSupportedFeature,
} from "../types";
import type { ActionState } from "./action-state";
import { uploadAssetFile } from "@/features/assets/upload";
import { assetUrl } from "@/features/assets/urls";

export interface PalettePreset {
  name: string;
  swatches: Array<{ hex: string; name: string; isPrimary?: boolean }>;
}

export const PRESET_PALETTES: PalettePreset[] = [
  {
    name: "Sage Natural",
    swatches: [
      { hex: "#8A9A86", name: "Sage Green", isPrimary: true },
      { hex: "#F4F1EA", name: "Ivory Warm" },
      { hex: "#4A5847", name: "Forest Green" },
    ],
  },
  {
    name: "Gold Mewah",
    swatches: [
      { hex: "#D4AF37", name: "Gold Kencana", isPrimary: true },
      { hex: "#2C221E", name: "Dark Walnut" },
      { hex: "#FFFDF9", name: "Ivory Silk" },
    ],
  },
  {
    name: "Terracotta Boho",
    swatches: [
      { hex: "#C86D51", name: "Terracotta", isPrimary: true },
      { hex: "#F7F2EE", name: "Sand Cream" },
      { hex: "#583B2B", name: "Mocha Ink" },
    ],
  },
  {
    name: "Mawar Romantis",
    swatches: [
      { hex: "#AD2458", name: "Rose Pink", isPrimary: true },
      { hex: "#FFF3F7", name: "Soft Blush" },
      { hex: "#664624", name: "Warm Bronze" },
    ],
  },
  {
    name: "Deep Navy",
    swatches: [
      { hex: "#243D73", name: "Royal Navy", isPrimary: true },
      { hex: "#F2F5FB", name: "Soft Blue" },
      { hex: "#D4AF37", name: "Gold Accent" },
    ],
  },
  {
    name: "Charcoal Modern",
    swatches: [
      { hex: "#273244", name: "Charcoal", isPrimary: true },
      { hex: "#F7F8FA", name: "Cool White" },
      { hex: "#C7A080", name: "Warm Muted" },
    ],
  },
  {
    name: "Lilac Lavender",
    swatches: [
      { hex: "#8E7DBE", name: "Soft Lilac", isPrimary: true },
      { hex: "#FAF8FD", name: "Lavender Tint" },
      { hex: "#4A3E6B", name: "Deep Plum" },
    ],
  },
  {
    name: "Emerald Royal",
    swatches: [
      { hex: "#2D5A46", name: "Emerald Green", isPrimary: true },
      { hex: "#F5F8F6", name: "Pale Mint" },
      { hex: "#D4AF37", name: "Gold Foil" },
    ],
  },
];

interface TemplateMetadataFormProps {
  template: TemplateDetail;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories?: { slug: string; name: string }[];
}

const DEFAULT_CATEGORIES = [
  { slug: "wedding", name: "Pernikahan (Wedding)" },
  { slug: "engagement", name: "Tunangan (Engagement)" },
  { slug: "birthday", name: "Ulang Tahun (Birthday)" },
  { slug: "aqiqah", name: "Tasyakuran & Aqiqah" },
  { slug: "graduation", name: "Wisuda (Graduation)" },
  { slug: "corporate", name: "Formal / Corporate Event" },
  { slug: "other", name: "Lainnya" },
];

const FEATURES: ReadonlyArray<{ id: TemplateSupportedFeature; label: string }> = [
  { id: "rsvp", label: "RSVP Konfirmasi Kehadiran" },
  { id: "google_maps", label: "Navigasi Google Maps Lokasi" },
  { id: "digital_gift", label: "Amplop / Kado Digital" },
  { id: "audio_player", label: "Pemutar Musik Latar" },
  { id: "countdown", label: "Hitung Mundur Waktu Acara" },
  { id: "gallery_slider", label: "Galeri Foto & Carousel" },
  { id: "guest_book", label: "Buku Tamu & Ucapan Doa" },
  { id: "story_timeline", label: "Kisah Cinta / Love Story" },
  { id: "envelope_cover", label: "Animasi Sampul Amplop Interaktif" },
];

export function TemplateMetadataForm({ template, action, categories = [] }: TemplateMetadataFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const meta = (template.metadata || {}) as TemplateExtendedMetadata;
  const activeFeatures = new Set(meta.supportedFeatures || []);

  const activeCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Media states
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(template.thumbnailUrl || "");
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string>(
    meta.previewVideoUrl || template.previewMockupUrl || "",
  );

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showManualPhotoUrl, setShowManualPhotoUrl] = useState(false);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showManualVideoUrl, setShowManualVideoUrl] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Upload handlers
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setUploadingPhoto(true);

    try {
      const res = await uploadAssetFile(template.workspaceId, file);
      if (res.ok) {
        const url = assetUrl(res.asset.id);
        setThumbnailUrl(url);
      } else {
        setPhotoError(res.error);
      }
    } catch {
      setPhotoError("Gagal mengunggah foto. Silakan coba lagi.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoError(null);
    setUploadingVideo(true);

    try {
      const res = await uploadAssetFile(template.workspaceId, file);
      if (res.ok) {
        const url = assetUrl(res.asset.id);
        setPreviewVideoUrl(url);
      } else {
        setVideoError(res.error);
      }
    } catch {
      setVideoError("Gagal mengunggah video. Silakan coba lagi.");
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  // Color palette state & handlers
  const initialPalette: TemplateColorSwatch[] =
    meta.colorPalette && meta.colorPalette.length > 0
      ? meta.colorPalette
      : (PRESET_PALETTES[0]?.swatches || []);

  const [colorPalette, setColorPalette] = useState<TemplateColorSwatch[]>(initialPalette);

  const updateSwatch = (index: number, partial: Partial<TemplateColorSwatch>) => {
    setColorPalette((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, ...partial } : s)),
    );
  };

  const removeSwatch = (index: number) => {
    setColorPalette((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (filtered.length > 0 && !filtered.some((s) => s.isPrimary)) {
        const first = filtered[0];
        if (first) {
          filtered[0] = { hex: first.hex, name: first.name, isPrimary: true };
        }
      }
      return filtered;
    });
  };

  const setPrimarySwatch = (index: number) => {
    setColorPalette((prev) =>
      prev.map((s, idx) => ({ ...s, isPrimary: idx === index })),
    );
  };

  const addCustomSwatch = () => {
    if (colorPalette.length >= 10) return;
    setColorPalette((prev) => [
      ...prev,
      { hex: "#D4AF37", name: "Warna Aksen", isPrimary: prev.length === 0 },
    ]);
  };

  return (
    <div className="rounded-2xl border border-[#EBE3D5] bg-[#FDFBF7] p-6 md:p-8 shadow-sm">
      <div className="mb-6 border-b border-[#EBE3D5] pb-4">
        <h3 className="text-base font-bold text-[#2C221E]">Metadata & Pengaturan Katalog</h3>
        <p className="mt-1 text-xs text-[#8A7A70]">
          Konfigurasikan informasi katalog agar template ini dapat ditemukan dengan mudah di katalog publik dan landing page.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="templateId" value={template.id} />
        <input type="hidden" name="thumbnailUrl" value={thumbnailUrl} />
        <input type="hidden" name="previewVideoUrl" value={previewVideoUrl} />

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium" role="alert">
            {state.error}
          </div>
        ) : null}

        {state.ok && state.message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-medium" role="status">
            {state.message}
          </div>
        ) : null}

        {/* Basic Info: Slug & Dynamic Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Custom Slug URL
            </label>
            <input
              type="text"
              name="slug"
              defaultValue={template.slug || ""}
              placeholder="misal: classic-floral-botanical (otomatis diisi jika kosong)"
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            />
            <p className="mt-1 text-[11px] text-[#A39284]">
              Hanya huruf kecil, angka, dan tanda hubung (-). Jika dikosongkan, slug dibuat otomatis dari nama template.
            </p>
            {template.slug ? (
              <p className="mt-1 text-[11px] font-medium text-[#7D6B5D]">
                URL Publik Aktif:{" "}
                <a
                  href={`/templates/${template.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#A87B24] hover:underline inline-flex items-center gap-1"
                >
                  <span>/templates/{template.slug}</span>
                  <span>↗</span>
                </a>
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Kategori Acara
            </label>
            <select
              name="category"
              defaultValue={template.category || "wedding"}
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            >
              {activeCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
              {template.category && !activeCategories.some((c) => c.slug === template.category) ? (
                <option value={template.category}>{template.category}</option>
              ) : null}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
            Deskripsi Singkat Template
          </label>
          <textarea
            name="description"
            defaultValue={template.description || ""}
            rows={2}
            placeholder="Tuliskan keunggulan estetika, tema warna, dan nuansa template ini..."
            className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Price & Search Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Harga Jual (Rp)
            </label>
            <input
              type="number"
              name="price"
              defaultValue={template.price ?? 0}
              min={0}
              step={1000}
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            />
            <p className="mt-1 text-[11px] text-[#A39284]">Isi 0 jika template ini gratis.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Tagar Pencarian (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              name="tags"
              defaultValue={(template.tags || []).join(", ")}
              placeholder="floral, jawa, elegan, modern, islami"
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Media Upload Section: Foto Sampul + Video Pratinjau */}
        <div className="border-t border-[#EBE3D5] pt-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Foto Sampul / Thumbnail Upload */}
            <div className="rounded-xl border border-[#E3DACD] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#2C221E]">Foto Sampul (Thumbnail Katalog)</h4>
                  <p className="text-[11px] text-[#8A7A70]">Tampilan utama di kartu katalog & landing page</p>
                </div>
                {thumbnailUrl && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Foto Aktif
                  </span>
                )}
              </div>

              {photoError && (
                <p className="text-[11px] text-red-600 font-medium">{photoError}</p>
              )}

              {/* Photo Preview Card */}
              {thumbnailUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-[#D9CFC4] aspect-video bg-[#F7F4EE] group">
                  {/* Preview can point to a newly uploaded authenticated asset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl}
                    alt="Pratinjau Foto Sampul"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="rounded-lg bg-white/90 hover:bg-white text-[#2C221E] px-3 py-1.5 text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl("")}
                      className="rounded-lg bg-red-600/90 hover:bg-red-600 text-white px-3 py-1.5 text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : (
                /* Photo Dropzone Box */
                <div
                  onClick={() => photoInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#D9CFC4] hover:border-[#D4AF37] p-5 text-center bg-[#FAF8F5] hover:bg-[#F7F4EE] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                >
                  <div className="mb-2 rounded-full bg-[#EFE9DF] p-2.5 text-[#5A4D44]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#2C221E]">
                    {uploadingPhoto ? "Mengunggah foto..." : "Pilih atau Seret Foto Sampul"}
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#8A7A70]">
                    Format PNG, JPG, atau WebP (Rasio 16:9 disarankan)
                  </span>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handlePhotoSelect}
                hidden
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualPhotoUrl(!showManualPhotoUrl)}
                  className="text-[11px] font-medium text-[#7D6B5D] hover:text-[#2C221E] underline cursor-pointer"
                >
                  {showManualPhotoUrl ? "Tutup input URL" : "Atau masukkan URL foto manual"}
                </button>
              </div>

              {showManualPhotoUrl && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://contoh.com/foto-sampul.jpg"
                    className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3 py-2 text-xs text-[#2C221E] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}
            </div>

            {/* Video Pratinjau Upload */}
            <div className="rounded-xl border border-[#E3DACD] bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#2C221E]">Video Pratinjau (Live Demo Video)</h4>
                  <p className="text-[11px] text-[#8A7A70]">Video interaktif yang diputar saat preview template</p>
                </div>
                {previewVideoUrl && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                    Video Aktif
                  </span>
                )}
              </div>

              {videoError && (
                <p className="text-[11px] text-red-600 font-medium">{videoError}</p>
              )}

              {/* Video Player Preview */}
              {previewVideoUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-[#D9CFC4] bg-black aspect-video flex items-center justify-center">
                    <video
                      src={previewVideoUrl}
                      controls
                      playsInline
                      className="w-full h-full max-h-[180px] object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={uploadingVideo}
                      onClick={() => videoInputRef.current?.click()}
                      className="rounded-lg border border-[#D9CFC4] bg-white hover:bg-[#FAF8F5] text-[#2C221E] px-3 py-1 text-[11px] font-semibold cursor-pointer"
                    >
                      Ganti Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVideoUrl("")}
                      className="rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3 py-1 text-[11px] font-semibold cursor-pointer"
                    >
                      Hapus Video
                    </button>
                  </div>
                </div>
              ) : (
                /* Video Dropzone Box */
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#D9CFC4] hover:border-[#D4AF37] p-5 text-center bg-[#FAF8F5] hover:bg-[#F7F4EE] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                >
                  <div className="mb-2 rounded-full bg-[#EFE9DF] p-2.5 text-[#5A4D44]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-[#2C221E]">
                    {uploadingVideo ? "Mengunggah video..." : "Pilih atau Seret Video Pratinjau"}
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#8A7A70]">
                    Format MP4 atau WebP video (Maksimal 30MB)
                  </span>
                </div>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleVideoSelect}
                hidden
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowManualVideoUrl(!showManualVideoUrl)}
                  className="text-[11px] font-medium text-[#7D6B5D] hover:text-[#2C221E] underline cursor-pointer"
                >
                  {showManualVideoUrl ? "Tutup input URL" : "Atau masukkan URL video manual"}
                </button>
              </div>

              {showManualVideoUrl && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={previewVideoUrl}
                    onChange={(e) => setPreviewVideoUrl(e.target.value)}
                    placeholder="https://contoh.com/video-demo.mp4"
                    className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3 py-2 text-xs text-[#2C221E] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Palet Warna Template (Katalog & Showcase) */}
        <div className="border-t border-[#EBE3D5] pt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#2C221E] uppercase tracking-wider">
                Palet Warna Tema Template
              </h4>
              <span className="text-[11px] font-semibold text-[#84633F] bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                {colorPalette.length} / 10 Warna
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#8A7A70]">
              Tentukan warna tema template ini. Pengunjung katalog web dapat memilih warna favorit dari palet ini saat melihat atau memesan undangan.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <span className="block text-[11px] font-semibold text-[#5A4D44] mb-2">
              Pilihan Preset Cepat (1-Klik Terapkan):
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_PALETTES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setColorPalette([...preset.swatches])}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D9CFC4] bg-white hover:bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#423630] font-medium transition cursor-pointer shadow-2xs hover:border-[#D4AF37]"
                >
                  <span className="flex -space-x-1">
                    {preset.swatches.map((sw, idx) => (
                      <span
                        key={idx}
                        className="h-3.5 w-3.5 rounded-full border border-white shadow-2xs shrink-0"
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                  </span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Swatches Editor */}
          <div className="space-y-3">
            <span className="block text-[11px] font-semibold text-[#5A4D44]">
              Daftar Swatch Warna Tema Aktif:
            </span>

            {colorPalette.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D9CFC4] bg-[#FAF8F5] p-4 text-center text-xs text-[#8A7A70]">
                Belum ada warna palet. Pilih preset di atas atau klik &quot;Tambah Warna Kustom&quot; di bawah.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {colorPalette.map((swatch, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-[#E3DACD] bg-white p-3 space-y-2.5 shadow-2xs relative"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={swatch.hex.length === 7 ? swatch.hex : "#8A9A86"}
                        onChange={(e) => updateSwatch(idx, { hex: e.target.value })}
                        className="h-8 w-8 cursor-pointer rounded-lg border border-[#D9CFC4] p-0.5 bg-white shrink-0"
                        title="Pilih warna HEX"
                      />
                      <input
                        type="text"
                        value={swatch.hex}
                        onChange={(e) => updateSwatch(idx, { hex: e.target.value })}
                        placeholder="#8A9A86"
                        maxLength={7}
                        className="w-24 rounded-lg border border-[#D9CFC4] bg-[#FAF8F5] px-2 py-1 font-mono text-xs text-[#2C221E] uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => removeSwatch(idx)}
                        className="ml-auto text-rose-500 hover:text-rose-700 text-xs p-1 rounded hover:bg-rose-50 cursor-pointer"
                        title="Hapus swatch"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#7D6B5D] mb-0.5">
                        Nama Warna
                      </label>
                      <input
                        type="text"
                        value={swatch.name}
                        onChange={(e) => updateSwatch(idx, { name: e.target.value })}
                        placeholder="mis. Sage Green, Gold Kencana"
                        maxLength={40}
                        className="w-full rounded-lg border border-[#D9CFC4] bg-white px-2.5 py-1 text-xs text-[#2C221E] outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
                      <input
                        type="radio"
                        name="primarySwatchRadio"
                        checked={swatch.isPrimary ?? false}
                        onChange={() => setPrimarySwatch(idx)}
                        className="text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <span className="text-[10px] text-[#8A7A70] font-medium">
                        {swatch.isPrimary ? "Warna Utama (Default Terpilih)" : "Jadikan Warna Utama"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {colorPalette.length < 10 && (
              <button
                type="button"
                onClick={addCustomSwatch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#D4AF37] bg-[#FAF8F5] hover:bg-[#F7F4EE] px-4 py-2 text-xs font-semibold text-[#84633F] cursor-pointer transition shadow-2xs"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Tambah Warna Kustom</span>
              </button>
            )}
          </div>

          <input type="hidden" name="colorPaletteJson" value={JSON.stringify(colorPalette)} />
        </div>

        {/* Features / Badges */}
        <div>
          <span className="block text-xs font-semibold text-[#5A4D44] mb-2">
            Fitur Aktif Template (Badges)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {FEATURES.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2.5 rounded-xl border border-[#E3DACD] bg-white px-3 py-2 text-xs text-[#423630] cursor-pointer hover:bg-[#F9F7F3]"
              >
                <input
                  type="checkbox"
                  name="supportedFeatures"
                  value={f.id}
                  defaultChecked={activeFeatures.has(f.id)}
                  className="rounded border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <span className="text-[11px] leading-tight font-medium">{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Public & Featured Switches */}
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-[#EBE3D5] bg-[#FAF8F5] p-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={template.isPublic ?? false}
              className="rounded border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <div>
              <span className="block text-xs font-bold text-[#2C221E]">Tampilkan di Katalog Publik</span>
              <span className="block text-[11px] text-[#8A7A70]">Template akan muncul di halaman katalog dan landing page.</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={template.isFeatured ?? false}
              className="rounded border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37]"
            />
            <div>
              <span className="block text-xs font-bold text-[#2C221E]">Rekomendasi Utama (Featured)</span>
              <span className="block text-[11px] text-[#8A7A70]">Disorot di posisi paling atas sebagai template unggulan.</span>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={pending || uploadingPhoto || uploadingVideo}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2C221E] hover:bg-[#3D302A] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {pending ? "Menyimpan Metadata…" : "Simpan Metadata Katalog"}
          </button>
        </div>
      </form>
    </div>
  );
}
