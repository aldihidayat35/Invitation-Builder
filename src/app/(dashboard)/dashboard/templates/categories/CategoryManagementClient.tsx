"use client";

import { useActionState, useState } from "react";
import type { TemplateCategoryWithCount } from "@/features/templates/types";
import type { ActionState } from "@/features/templates/components";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./actions";

interface Props {
  initialCategories: TemplateCategoryWithCount[];
}

export function CategoryManagementClient({ initialCategories }: Props) {
  const [createState, createAction, createPending] = useActionState<ActionState, FormData>(
    createCategoryAction,
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ActionState, FormData>(
    deleteCategoryAction,
    {},
  );

  const [editingCategory, setEditingCategory] = useState<TemplateCategoryWithCount | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TemplateCategoryWithCount | null>(null);

  const [updateState, updateFormAction, updatePending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const res = await updateCategoryAction(prev, formData);
      if (res.ok) setEditingCategory(null);
      return res;
    },
    {},
  );

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {(createState.error || updateState.error || deleteState.error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 shadow-xs" role="alert">
          {createState.error || updateState.error || deleteState.error}
        </div>
      )}

      {(createState.ok && createState.message) ||
      (updateState.ok && updateState.message) ||
      (deleteState.ok && deleteState.message) ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-xs" role="status">
          {createState.message || updateState.message || deleteState.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Tambah Kategori */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[#EBE3D5] bg-[#FDFBF7] p-6 shadow-sm sticky top-6">
            <div className="mb-5 border-b border-[#EBE3D5] pb-3">
              <h3 className="text-sm font-bold text-[#2C221E]">Tambah Kategori Baru</h3>
              <p className="mt-1 text-xs text-[#8A7A70]">
                Kategori ini akan langsung tersedia pada pilihan metadata template undangan.
              </p>
            </div>

            <form action={createAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Khitanan & Tasyakuran"
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Kode Slug URL
                </label>
                <input
                  type="text"
                  name="slug"
                  placeholder="misal: khitanan (otomatis jika kosong)"
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
                <p className="mt-1 text-[11px] text-[#A39284]">Huruf kecil, angka, dan tanda hubung (-).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Deskripsi Kategori
                </label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Deskripsi singkat peruntukan acara kategori ini..."
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Nomor Urutan Tampilan
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={initialCategories.length + 1}
                  min={0}
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={createPending}
                  className="w-full rounded-xl bg-[#2C221E] hover:bg-[#3D302A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {createPending ? "Menyimpan…" : "+ Tambah Kategori"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Daftar Kategori */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#EBE3D5] bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#EBE3D5] px-6 py-4 bg-[#FDFBF7]">
              <div>
                <h3 className="text-sm font-bold text-[#2C221E]">Daftar Kategori Aktif</h3>
                <p className="text-xs text-[#8A7A70]">
                  Total {initialCategories.length} kategori terdaftar dalam sistem
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#F0EAE1] bg-[#FAF8F5] text-[#7A6A60] font-semibold">
                    <th className="py-3 px-4 w-12 text-center">Urutan</th>
                    <th className="py-3 px-4">Nama & Slug</th>
                    <th className="py-3 px-4 hidden md:table-cell">Deskripsi</th>
                    <th className="py-3 px-4 text-center">Jumlah Template</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1] text-[#2C221E]">
                  {initialCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#9E8E82]">
                        Belum ada kategori yang dibuat. Silakan tambahkan kategori di sebelah kiri.
                      </td>
                    </tr>
                  ) : (
                    initialCategories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-[#8A7A70]">
                          #{cat.sortOrder}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#2C221E]">{cat.name}</div>
                          <div className="font-mono text-[11px] text-[#A39284]">slug: {cat.slug}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#6A5A50] hidden md:table-cell max-w-xs truncate">
                          {cat.description || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center rounded-full bg-[#F4F0E8] px-2.5 py-0.5 text-[11px] font-semibold text-[#5A4D44]">
                            {cat.templateCount} template
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(cat)}
                            className="inline-flex items-center rounded-lg border border-[#D9CFC4] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5A4D44] hover:bg-[#F9F7F3] cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(cat)}
                            className="inline-flex items-center rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Kategori */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#EBE3D5] bg-[#FDFBF7] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-4 border-b border-[#EBE3D5] pb-3">
              <h3 className="text-sm font-bold text-[#2C221E]">Ubah Kategori</h3>
              <p className="text-xs text-[#8A7A70]">
                Memperbarui informasi kategori <strong>{editingCategory.name}</strong>
              </p>
            </div>

            <form action={updateFormAction} className="space-y-4">
              <input type="hidden" name="id" value={editingCategory.id} />

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingCategory.name}
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Kode Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  required
                  defaultValue={editingCategory.slug}
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Deskripsi Kategori
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingCategory.description || ""}
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5A4D44] mb-1.5">
                  Urutan Tampilan
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={editingCategory.sortOrder}
                  className="w-full rounded-xl border border-[#D9CFC4] bg-white px-3.5 py-2.5 text-xs text-[#2C221E] shadow-xs outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBE3D5]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#5A4D44] hover:bg-[#F9F7F3] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatePending}
                  className="rounded-xl bg-[#2C221E] hover:bg-[#3D302A] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updatePending ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-red-600 mb-2">Hapus Kategori?</h3>
            <p className="text-xs text-[#5A4D44] mb-4">
              Apakah Anda yakin ingin menghapus kategori <strong>{deletingCategory.name}</strong>?
              {deletingCategory.templateCount > 0 ? (
                <span className="block mt-2 font-semibold text-red-600">
                  ⚠️ Peringatan: Kategori ini masih digunakan oleh {deletingCategory.templateCount} template.
                </span>
              ) : null}
            </p>

            <form action={async (formData) => {
              await deleteAction(formData);
              setDeletingCategory(null);
            }} className="flex justify-end gap-2.5">
              <input type="hidden" name="id" value={deletingCategory.id} />
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-xl border border-[#D9CFC4] bg-white px-4 py-2 text-xs font-semibold text-[#5A4D44] hover:bg-[#F9F7F3] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={deletePending}
                className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {deletePending ? "Menghapus…" : "Ya, Hapus"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
