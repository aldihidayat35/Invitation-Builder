"use client";

import { useActionState } from "react";
import type { TemplateDetail } from "../types";
import type { ActionState } from "./action-state";
import styles from "./templates.module.css";

interface TemplateMetadataFormProps {
  template: TemplateDetail;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}

const CATEGORIES = [
  { value: "wedding", label: "Pernikahan (Wedding)" },
  { value: "engagement", label: "Tunangan (Engagement)" },
  { value: "birthday", label: "Ulang Tahun (Birthday)" },
  { value: "aqiqah", label: "Tasyakuran & Aqiqah" },
  { value: "graduation", label: "Wisuda (Graduation)" },
  { value: "corporate", label: "Formal / Corporate Event" },
  { value: "other", label: "Lainnya" },
];

const STYLES = [
  { value: "modern_minimalist", label: "Modern Minimalist" },
  { value: "rustic_boho", label: "Rustic & Boho Terracotta" },
  { value: "traditional_jawa", label: "Tradisional Jawa Kencana" },
  { value: "traditional_sunda", label: "Tradisional Sunda Siger" },
  { value: "traditional_minang", label: "Tradisional Minang" },
  { value: "botanical_sage", label: "Botanical Sage Green" },
  { value: "islamic_syari", label: "Islamic Syar'i & Elegant" },
  { value: "luxury_elegant", label: "Luxury Gold & Dark Walnut" },
  { value: "clean_editorial", label: "Clean Editorial Typography" },
];

const TIERS = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "exclusive", label: "Exclusive" },
  { value: "free", label: "Gratis (Free)" },
];

const FEATURES = [
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

export function TemplateMetadataForm({ template, action }: TemplateMetadataFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const meta = (template.metadata || {}) as Record<string, any>;
  const activeFeatures = new Set(meta.supportedFeatures || []);

  return (
    <div className="rounded-2xl border border-[#EBE3D5] bg-[#FDFBF7] p-6 shadow-sm">
      <div className="mb-6 border-b border-[#EBE3D5] pb-4">
        <h3 className="text-base font-bold text-[#2C221E]">Metadata & Pengaturan Katalog</h3>
        <p className="mt-1 text-xs text-[#8A7A70]">
          Konfigurasikan informasi katalog agar template ini dapat ditemukan calon pengguna dengan mudah di katalog publik dan landing page.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="templateId" value={template.id} />

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
            {state.error}
          </div>
        ) : null}

        {state.ok && state.message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            {state.message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Custom Slug URL
            </label>
            <input
              type="text"
              name="slug"
              defaultValue={template.slug || ""}
              placeholder="misal: classic-floral-botanical"
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            />
            <p className="mt-1 text-[11px] text-[#A39284]">Hanya huruf kecil, angka, dan strip (-).</p>
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
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Gaya Desain (Style)
            </label>
            <select
              name="style"
              defaultValue={template.style || "modern_minimalist"}
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              Tier Akses
            </label>
            <select
              name="tier"
              defaultValue={template.tier || "standard"}
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
            Deskripsi Singkat Template
          </label>
          <textarea
            name="description"
            defaultValue={template.description || ""}
            rows={3}
            placeholder="Tuliskan keunggulan estetika, tema warna, dan nuansa template ini..."
            className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
              URL Thumbnail Sampul Utama
            </label>
            <input
              type="text"
              name="thumbnailUrl"
              defaultValue={template.thumbnailUrl || ""}
              placeholder="/images/template-botanical.jpg atau URL gambar"
              className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
            />
          </div>

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
          </div>
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

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2C221E] hover:bg-[#3D302A] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {pending ? "Menyimpan Metadata…" : "Simpan Metadata Katalog"}
          </button>
        </div>
      </form>
    </div>
  );
}
