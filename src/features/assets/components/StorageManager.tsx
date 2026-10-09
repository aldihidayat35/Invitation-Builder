"use client";

import React, { useState, useTransition, useRef } from "react";
import { copyTextToClipboard } from "@/lib/browser/clipboard";
import type { StorageAssetItem, StorageOverview } from "../api";
import { deleteAssetAction, getStorageOverviewAction, listAllStorageAssetsAction } from "../actions";
import { uploadAssetFile } from "../upload";
import { formatBytes } from "../config";
import { DashboardHeroHeader } from "@/features/dashboard-layout";

interface StorageManagerProps {
  readonly initialOverview: StorageOverview;
  readonly initialAssets: StorageAssetItem[];
  readonly workspaceId?: string;
  readonly isSuperAdmin?: boolean;
  readonly limitMb: number;
}

export function StorageManager({
  initialOverview,
  initialAssets,
  workspaceId,
  isSuperAdmin = false,
  limitMb,
}: StorageManagerProps) {
  const [overview, setOverview] = useState<StorageOverview>(initialOverview);
  const [assets, setAssets] = useState<StorageAssetItem[]>(initialAssets);
  const [selectedType, setSelectedType] = useState<"all" | "image" | "video">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [confirmDelete, setConfirmDelete] = useState<StorageAssetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [previewAsset, setPreviewAsset] = useState<StorageAssetItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const refreshData = async () => {
    startTransition(async () => {
      const [newOverview, newAssets] = await Promise.all([
        getStorageOverviewAction(isSuperAdmin ? undefined : workspaceId),
        listAllStorageAssetsAction({
          workspaceId: isSuperAdmin ? undefined : workspaceId,
          type: selectedType,
          search: searchQuery,
        }),
      ]);

      if (newOverview.ok) {
        setOverview(newOverview.data);
      }
      if (newAssets.ok) {
        setAssets(newAssets.data.items);
      }
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!workspaceId) {
      setUploadError("Workspace belum aktif. Silakan pilih workspace terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    const totalFiles = files.length;
    let successCount = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i]!;
      setUploadProgress(`Mengunggah berkas ${i + 1} dari ${totalFiles}: ${file.name}...`);

      const res = await uploadAssetFile(workspaceId, file);
      if (res.ok) {
        successCount++;
      } else {
        setUploadError(`Gagal mengunggah "${file.name}": ${res.error}`);
        break;
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (successCount > 0) {
      showToast(`Berhasil menambahkan ${successCount} berkas media.`);
      await refreshData();
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);

    const res = await deleteAssetAction(confirmDelete.id);
    setIsDeleting(false);

    if (res.ok) {
      showToast(`Berkas "${confirmDelete.filename}" berhasil dihapus permanen.`);
      setConfirmDelete(null);
      if (previewAsset?.id === confirmDelete.id) {
        setPreviewAsset(null);
      }
      // Optimistic update
      setAssets((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      await refreshData();
    } else {
      showToast(`Gagal menghapus berkas: ${res.error}`);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    if (await copyTextToClipboard(fullUrl)) {
      setCopiedId(id);
      showToast("URL media berhasil disalin ke clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      showToast("Gagal menyalin link.");
    }
  };

  // Filter items in memory
  const filteredAssets = assets.filter((asset) => {
    if (selectedType === "image" && !asset.mimeType.startsWith("image/")) return false;
    if (selectedType === "video" && !asset.mimeType.startsWith("video/")) return false;
    if (searchQuery.trim()) {
      return asset.filename.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <span className="text-amber-400">✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <DashboardHeroHeader
        eyebrow={
          <>
            <span>{isSuperAdmin ? "PLATFORM STORAGE" : "WORKSPACE MEDIA"}</span>
            <span>•</span>
            <span className="font-mono text-stone-400">KUOTA: {limitMb}MB</span>
          </>
        }
        title="Manajemen Storage & Galeri Media"
        description="Kelola berkas media, pantau kuota disk, serta tambahkan atau hapus foto dan video aplikasi secara terpusat."
        actions={
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              id="storage-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors focus:outline-hidden disabled:opacity-60 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-[#2C221E]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Unggah Media Baru</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Uploading Status Banner */}
      {uploadProgress && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 shadow-xs">
          <svg className="h-5 w-5 animate-spin text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold">{uploadProgress}</p>
            <p className="text-[11px] text-amber-700">Sedang memverifikasi bytes dan memproses file...</p>
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-rose-600 text-base">⚠️</span>
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-600 hover:text-rose-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Storage KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kapasitas */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kapasitas Storage</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              overview.usagePercent >= 90
                ? "bg-rose-100 text-rose-700"
                : overview.usagePercent >= 75
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {overview.usagePercent}% Terpakai
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{overview.formattedUsed}</span>
              <span className="text-xs font-medium text-slate-400">/ {overview.formattedLimit}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overview.usagePercent >= 90
                    ? "bg-rose-500"
                    : overview.usagePercent >= 75
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-amber-500 to-amber-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(overview.usagePercent, 2))}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Maksimum {limitMb} MB dapat diubah di konfigurasi .env
            </p>
          </div>
        </div>

        {/* Card 2: Foto & Gambar */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Foto & Gambar</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{overview.imageCount}</div>
            <p className="mt-1 text-xs text-slate-400">Berkas format PNG, JPG, WebP, GIF</p>
          </div>
        </div>

        {/* Card 3: Video & Animasi */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Video & Media</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{overview.videoCount}</div>
            <p className="mt-1 text-xs text-slate-400">Berkas format MP4, WebM, OGG</p>
          </div>
        </div>

        {/* Card 4: Total Seluruh Media */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Media</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{overview.fileCount}</div>
            <p className="mt-1 text-xs text-slate-400">Media tersimpan di sistem</p>
          </div>
        </div>
      </div>

      {/* Media Gallery Section */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        {/* Controls Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 w-fit">
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                selectedType === "all"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Media ({overview.fileCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("image")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                selectedType === "image"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Foto & Gambar ({overview.imageCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("video")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                selectedType === "video"
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Video ({overview.videoCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari nama berkas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-hidden"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="mt-6">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Tidak ada berkas media ditemukan</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {searchQuery
                  ? `Tidak ada berkas yang cocok dengan kata kunci "${searchQuery}".`
                  : "Belum ada berkas media di storage. Klik tombol di atas untuk mengunggah."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  Unggah Berkas Sekarang
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAssets.map((asset) => {
                const isVideo = asset.mimeType.startsWith("video/");
                return (
                  <div
                    key={asset.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white transition hover:shadow-md hover:border-amber-400/80"
                  >
                    {/* Media Thumbnail Container */}
                    <div
                      className="relative aspect-square w-full cursor-pointer overflow-hidden bg-slate-100 flex items-center justify-center"
                      onClick={() => setPreviewAsset(asset)}
                    >
                      {isVideo ? (
                        <div className="relative h-full w-full flex items-center justify-center bg-slate-900">
                          <video
                            src={asset.url}
                            className="h-full w-full object-cover opacity-80"
                            preload="metadata"
                          />
                          <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-white shadow-md">
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      )}

                      {/* Format Badge */}
                      <span className="absolute top-2 left-2 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase backdrop-blur-xs">
                        {asset.filename.split(".").pop() || "FILE"}
                      </span>

                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAsset(asset);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-800 hover:bg-white transition"
                          title="Lihat Detail"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(asset.url, asset.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-slate-800 hover:bg-white transition"
                          title="Salin URL"
                        >
                          {copiedId === asset.id ? (
                            <span className="text-[10px] font-bold text-emerald-600">✓</span>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(asset);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                          title="Hapus Media"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Meta Caption */}
                    <div className="p-2.5">
                      <p
                        className="truncate text-xs font-semibold text-slate-800"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatBytes(asset.bytes)}</span>
                        {asset.width && asset.height ? (
                          <span>{asset.width}×{asset.height}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Hapus Berkas Media Permanen?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Berkas <strong>&ldquo;{confirmDelete.filename}&rdquo;</strong> ({formatBytes(confirmDelete.bytes)}) akan dihapus permanen dari penyimpanan disk server dan basis data. Media yang telah dihapus tidak dapat dipulihkan.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-60"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="overflow-hidden pr-4">
                <h3 className="truncate text-sm font-bold text-slate-900" title={previewAsset.filename}>
                  {previewAsset.filename}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {previewAsset.mimeType} · {formatBytes(previewAsset.bytes)}
                  {previewAsset.width && previewAsset.height ? ` · ${previewAsset.width}×${previewAsset.height}px` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Media Display Area */}
            <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-950 p-4 max-h-[55vh]">
              {previewAsset.mimeType.startsWith("video/") ? (
                <video
                  src={previewAsset.url}
                  controls
                  autoPlay
                  className="max-h-full max-w-full rounded-lg shadow-lg"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAsset.url}
                  alt={previewAsset.filename}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              )}
            </div>

            {/* Modal Footer & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3.5 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  readOnly
                  value={previewAsset.url}
                  className="flex-1 sm:w-80 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewAsset.url, previewAsset.id)}
                  className="rounded-lg bg-amber-500/10 border border-amber-300 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-500/20 transition"
                >
                  Salin URL
                </button>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = previewAsset;
                    setPreviewAsset(null);
                    setConfirmDelete(toDel);
                  }}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 transition"
                >
                  Hapus Berkas
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAsset(null)}
                  className="rounded-lg bg-slate-800 px-3.5 py-1.5 font-semibold text-white hover:bg-slate-700 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
