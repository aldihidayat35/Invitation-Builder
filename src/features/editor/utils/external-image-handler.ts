/**
 * Utilitas untuk menangani paste dan drag-and-drop gambar dari luar editor
 * (file lokal, screenshot OS, salinan dari browser web, dan URL gambar).
 */

import { uploadAssetFile, uploadBlobAsAsset } from "@/features/assets/upload";
import { saveAssetFromUrlAction } from "@/features/assets/actions";
import { assetUrl } from "@/features/assets/urls";
import type { EditorStore } from "../core/store";

export type ToastType = "info" | "success" | "error";

export interface EditorToastEventDetail {
  readonly message: string;
  readonly type: ToastType;
}

export const EDITOR_TOAST_EVENT = "dib:editor-toast";

/** Memicu toast notifikasi di antarmuka editor */
export function showEditorToast(message: string, type: ToastType = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<EditorToastEventDetail>(EDITOR_TOAST_EVENT, {
      detail: { message, type },
    }),
  );
}

/** Memeriksa apakah suatu teks adalah URL gambar atau data URI gambar */
export function isImageUrlString(rawText: string): boolean {
  const text = rawText.trim();
  if (!text) return false;

  // Data URI gambar
  if (text.startsWith("data:image/")) return true;

  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const pathname = url.pathname.toLowerCase();
    // Ekstensi gambar lazim
    if (/\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i.test(pathname)) return true;

    // Layanan hosting gambar populer
    const hostname = url.hostname.toLowerCase();
    if (
      hostname.includes("unsplash.com") ||
      hostname.includes("pexels.com") ||
      hostname.includes("pixabay.com") ||
      hostname.includes("imgur.com") ||
      hostname.includes("cloudinary.com") ||
      hostname.includes("images.google.com") ||
      hostname.includes("gravatar.com")
    ) {
      return true;
    }

    // Query parameter tipe gambar
    if (/(format|ext|f|type)=(jpe?g|png|gif|webp|svg|avif)/i.test(url.search)) {
      return true;
    }

    // Path yang secara eksplisit mengindikasikan file gambar
    if (/\/images?\/|\/photos?\/|\/img\//i.test(pathname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Mengambil nama file yang wajar dari URL */
export function extractFilenameFromUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    const pathname = url.pathname;
    const parts = pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && /\.[a-z0-9]+$/i.test(lastPart)) {
      return decodeURIComponent(lastPart).slice(0, 100);
    }
  } catch {
    // fallback
  }
  return `image-${Date.now()}.png`;
}

/** Mengonversi string Data URI ke objek Blob */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(",");
    const part0 = parts[0];
    const part1 = parts[1];
    if (!part0 || !part1) return null;

    const match = part0.match(/:(.*?);/);
    const mime = match && match[1] ? match[1] : "image/png";
    const binary = atob(part1);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  } catch {
    return null;
  }
}

/** Mengambil dimensi intrinsik gambar */
export function getImageDimensions(
  source: string | Blob,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      return resolve({ width: 300, height: 300 });
    }
    const img = new Image();
    const objectUrl = typeof source === "string" ? null : URL.createObjectURL(source);
    const src = objectUrl ?? (source as string);

    img.onload = () => {
      const w = img.naturalWidth || img.width || 300;
      const h = img.naturalHeight || img.height || 300;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({ width: w, height: h });
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve({ width: 300, height: 300 });
    };

    img.src = src;
  });
}

/** Mengekstrak berkas gambar dari DataTransfer (clipboard atau drag-drop) */
export function extractImageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const results: File[] = [];

  // 1. Cek dt.files
  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files[i];
      if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|avif|bmp)$/i.test(file.name))) {
        results.push(file);
      }
    }
  }

  // 2. Jika belum ada dari files, cek dt.items (biasanya untuk screenshot / copy image browser)
  if (results.length === 0 && dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) results.push(file);
      }
    }
  }

  return results;
}

/** Memeriksa apakah DataTransfer mengandung berkas gambar */
export function hasImageFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  if (dt.types.includes("Files")) {
    if (dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const it = dt.items[i];
        if (it && it.kind === "file" && (it.type.startsWith("image/") || it.type === "")) {
          return true;
        }
      }
    }
    return true;
  }
  return false;
}

/** Mengimpor dan mengunggah berkas gambar lokal ke Asset Library lalu menambahkannya ke kanvas */
export async function importImageFile(
  workspaceId: string,
  file: File,
  store: EditorStore,
  options?: {
    readonly position?: { readonly x: number; readonly y: number };
    readonly sectionId?: string;
  },
): Promise<boolean> {
  showEditorToast(`Mengunggah gambar "${file.name || "gambar"}"...`, "info");
  try {
    const dims = await getImageDimensions(file);
    const res = await uploadAssetFile(workspaceId, file);
    if (!res.ok) {
      showEditorToast(`Gagal mengunggah gambar: ${res.error}`, "error");
      return false;
    }

    const publicUrl = assetUrl(res.asset.id);
    store.getState().addImage(
      {
        assetId: res.asset.id,
        url: publicUrl,
        width: res.asset.width || dims.width,
        height: res.asset.height || dims.height,
        name: res.asset.filename || file.name,
      },
      options,
    );

    showEditorToast("Gambar berhasil ditambahkan ke kanvas!", "success");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses gambar.";
    showEditorToast(`Gagal: ${msg}`, "error");
    return false;
  }
}

/** Mengimpor URL gambar (internet atau data URI) ke Asset Library lalu menambahkannya ke kanvas */
export async function importImageUrl(
  workspaceId: string,
  url: string,
  store: EditorStore,
  options?: {
    readonly position?: { readonly x: number; readonly y: number };
    readonly sectionId?: string;
  },
): Promise<boolean> {
  showEditorToast("Mengunduh gambar dari internet...", "info");
  try {
    if (url.startsWith("data:image/")) {
      const blob = dataUrlToBlob(url);
      if (!blob) {
        showEditorToast("Format data URI gambar tidak valid.", "error");
        return false;
      }
      const dims = await getImageDimensions(blob);
      const ext = blob.type.split("/")[1] || "png";
      const filename = `paste-${Date.now()}.${ext}`;
      const res = await uploadBlobAsAsset(workspaceId, blob, filename);
      if (!res.ok) {
        showEditorToast(`Gagal mengunggah gambar: ${res.error}`, "error");
        return false;
      }

      const publicUrl = assetUrl(res.asset.id);
      store.getState().addImage(
        {
          assetId: res.asset.id,
          url: publicUrl,
          width: res.asset.width || dims.width,
          height: res.asset.height || dims.height,
          name: res.asset.filename || filename,
        },
        options,
      );

      showEditorToast("Gambar berhasil ditambahkan ke kanvas!", "success");
      return true;
    }

    const filename = extractFilenameFromUrl(url);
    const res = await saveAssetFromUrlAction(workspaceId, url, filename);
    if (!res.ok) {
      showEditorToast(`Gagal mengunduh gambar: ${res.error}`, "error");
      return false;
    }

    const publicUrl = assetUrl(res.data.id);
    const dims = await getImageDimensions(publicUrl);
    store.getState().addImage(
      {
        assetId: res.data.id,
        url: publicUrl,
        width: res.data.width || dims.width,
        height: res.data.height || dims.height,
        name: res.data.filename || filename,
      },
      options,
    );

    showEditorToast("Gambar berhasil ditambahkan ke kanvas!", "success");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengimpor gambar dari URL.";
    showEditorToast(`Gagal: ${msg}`, "error");
    return false;
  }
}
