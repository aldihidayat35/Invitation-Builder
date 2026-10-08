"use client";

import React, { useMemo, useState, useTransition } from "react";
import type {
  AvailableResellerOption,
  CreateUserInputForm,
  UpdateUserInputForm,
  UserListItem,
  UsersSummary,
} from "../types";
import {
  createUserAction,
  deleteUserAction,
  toggleUserStatusAction,
  updateUserAction,
} from "../actions";
import { UserStatsCards } from "./UserStatsCards";
import { CreateUserModal } from "./CreateUserModal";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { DashboardHeroHeader } from "@/features/dashboard-layout";
import type { SystemRole, UserStatus } from "@/lib/schema/domain";

interface UserManagerProps {
  initialUsers: UserListItem[];
  initialSummary: UsersSummary;
  availableResellers: AvailableResellerOption[];
  currentUserId: string;
}

function formatDate(date: Date | string) {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U"
  );
}

export function UserManager({
  initialUsers,
  initialSummary,
  availableResellers,
  currentUserId,
}: UserManagerProps) {
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);
  const [summary, setSummary] = useState<UsersSummary>(initialSummary);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<SystemRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);

  // Notifications and actions feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast("ID Pengguna berhasil disalin ke clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast("Gagal menyalin ID.", "error");
    }
  };

  // Re-calculate summary dynamically
  const recalculateSummary = (list: UserListItem[]) => {
    const s: UsersSummary = {
      total: list.length,
      owners: 0,
      resellers: 0,
      clients: 0,
      active: 0,
      disabled: 0,
    };
    for (const u of list) {
      if (u.systemRole === "owner") s.owners++;
      else if (u.systemRole === "reseller") s.resellers++;
      else if (u.systemRole === "client") s.clients++;

      if (u.status === "active") s.active++;
      else if (u.status === "disabled") s.disabled++;
    }
    setSummary(s);
  };

  // Handle Create User
  const handleCreateUser = async (data: CreateUserInputForm): Promise<boolean> => {
    const res = await createUserAction(data);
    if (res.ok && res.data) {
      const updatedList = [res.data, ...users];
      setUsers(updatedList);
      recalculateSummary(updatedList);
      showToast(res.message || "Pengguna berhasil dibuat!");
      return true;
    } else {
      showToast(res.error || "Gagal membuat pengguna.", "error");
      return false;
    }
  };

  // Handle Edit User
  const handleUpdateUser = async (data: UpdateUserInputForm): Promise<boolean> => {
    const res = await updateUserAction(data);
    if (res.ok && res.data) {
      const updatedList = users.map((u) => (u.id === data.userId ? res.data! : u));
      setUsers(updatedList);
      recalculateSummary(updatedList);
      showToast(res.message || "Data pengguna berhasil diperbarui!");
      return true;
    } else {
      showToast(res.error || "Gagal memperbarui pengguna.", "error");
      return false;
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string): Promise<boolean> => {
    const res = await deleteUserAction(userId);
    if (res.ok) {
      const updatedList = users.filter((u) => u.id !== userId);
      setUsers(updatedList);
      recalculateSummary(updatedList);
      showToast(res.message || "Pengguna berhasil dihapus.");
      return true;
    } else {
      showToast(res.error || "Gagal menghapus pengguna.", "error");
      return false;
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = (user: UserListItem) => {
    if (user.id === currentUserId && user.status === "active") {
      showToast("Anda tidak dapat menonaktifkan akun Anda sendiri.", "error");
      return;
    }

    const nextStatus: UserStatus = user.status === "active" ? "disabled" : "active";
    setStatusTogglingId(user.id);

    startTransition(async () => {
      try {
        const res = await toggleUserStatusAction(user.id, nextStatus);
        if (res.ok) {
          const updatedList = users.map((u) =>
            u.id === user.id ? { ...u, status: nextStatus, updatedAt: new Date() } : u,
          );
          setUsers(updatedList);
          recalculateSummary(updatedList);
          showToast(res.message || "Status akun berhasil diperbarui.");
        } else {
          showToast(res.error || "Gagal mengubah status akun.", "error");
        }
      } finally {
        setStatusTogglingId(null);
      }
    });
  };

  // Filter & sort
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const q = search.toLowerCase().trim();
        const matchSearch =
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.agencyName && u.agencyName.toLowerCase().includes(q)) ||
          (u.resellerAgencyName && u.resellerAgencyName.toLowerCase().includes(q));

        const matchRole = roleFilter === "all" || u.systemRole === roleFilter;
        const matchStatus = statusFilter === "all" || u.status === statusFilter;

        return matchSearch && matchRole && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "name_asc") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "name_desc") {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [users, search, roleFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl border animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-[#181513] text-white border-amber-500/30 shadow-black/30"
              : "bg-rose-900 text-white border-rose-700 shadow-rose-950/40"
          }`}
        >
          <span>{toastMessage.type === "success" ? "✨" : "⚠️"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <DashboardHeroHeader
        eyebrow="SUPER ADMIN • PLATFORM DIRECTORY"
        title="Manajemen Pengguna"
        description="Kelola seluruh akun platform, atur peran hak akses, konfigurasi kredensial, dan pantau status keaktifan user."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#BD9B2F] px-5 py-2.5 text-xs font-bold text-[#2C221E] shadow-md transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Pengguna Baru</span>
          </button>
        }
      />

      {/* KPI Stats Cards */}
      <UserStatsCards summary={summary} />

      {/* Main Table Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
        {/* Controls Toolbar */}
        <div className="flex flex-col gap-4 border-b border-stone-100 pb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="search"
                placeholder="Cari nama, email, atau agensi toko…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-[#FAF8F5] pl-9 pr-3.5 py-2.5 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none"
                aria-label="Cari pengguna"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | "all")}
                className="rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none"
                aria-label="Filter status pengguna"
              >
                <option value="all">Semua Status</option>
                <option value="active">🟢 Hanya Aktif</option>
                <option value="disabled">⚪ Hanya Nonaktif</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-stone-700 shadow-2xs focus:border-[#84633F] focus:bg-white focus:outline-none"
                aria-label="Urutkan pengguna"
              >
                <option value="newest">Terbaru Terdaftar</option>
                <option value="oldest">Terlama Terdaftar</option>
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
              </select>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === "all"
                  ? "bg-[#181513] text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("owner")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === "owner"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>👑</span>
              <span>Super Admin ({summary.owners})</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("reseller")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === "reseller"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span>🏪</span>
              <span>Mitra Seller ({summary.resellers})</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("client")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === "client"
                  ? "bg-blue-800 text-white shadow-xs"
                  : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <span>👤</span>
              <span>Klien ({summary.clients})</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-4 overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-stone-800">Tidak ada pengguna yang cocok</h3>
              <p className="mt-1 text-xs text-stone-500 max-w-sm">
                Coba sesuaikan kata kunci pencarian atau ubah filter peranan dan status akun.
              </p>
              {(search || roleFilter !== "all" || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="mt-3 text-xs font-semibold text-[#84633F] hover:underline"
                >
                  Reset semua filter
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200/80 text-[11px] font-bold uppercase tracking-wider text-stone-500 bg-[#FAF8F5]">
                  <th scope="col" className="px-4 py-3 rounded-l-xl">
                    Pengguna
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Peran Sistem
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Agensi / Afiliasi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status Akun
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Terdaftar
                  </th>
                  <th scope="col" className="px-4 py-3 text-right rounded-r-xl">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUserId;
                  const isToggling = statusTogglingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#FAF8F5]/80 transition ${
                        isCurrent ? "bg-amber-50/30" : ""
                      }`}
                    >
                      {/* User Info Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-2xs border ${
                              u.systemRole === "owner"
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : u.systemRole === "reseller"
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-stone-100 text-stone-700 border-stone-200"
                            }`}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 truncate">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-stone-500 text-[11px] truncate">
                                {u.email}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(u.id, u.id)}
                                title="Salin UUID"
                                className="text-stone-400 hover:text-stone-700 transition"
                              >
                                {copiedId === u.id ? (
                                  <span className="text-emerald-600 text-[10px]">✓</span>
                                ) : (
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* System Role Column */}
                      <td className="px-4 py-3.5">
                        {u.systemRole === "owner" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-300">
                            <span>👑</span>
                            <span>Super Admin</span>
                          </span>
                        )}
                        {u.systemRole === "reseller" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-900 border border-emerald-300">
                            <span>🏪</span>
                            <span>Mitra Seller</span>
                          </span>
                        )}
                        {u.systemRole === "client" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700 border border-stone-200">
                            <span>👤</span>
                            <span>Klien</span>
                          </span>
                        )}
                      </td>

                      {/* Affiliation / Agency Column */}
                      <td className="px-4 py-3.5">
                        {u.systemRole === "reseller" ? (
                          <div>
                            <span className="font-semibold text-emerald-900 block truncate">
                              {u.agencyName || "Toko Reseller"}
                            </span>
                            {u.agencySlug && (
                              <span className="font-mono text-[10px] text-stone-400 block truncate">
                                /{u.agencySlug}
                              </span>
                            )}
                          </div>
                        ) : u.systemRole === "client" && u.resellerName ? (
                          <div>
                            <span className="text-stone-700 block truncate">
                              Mitra: <strong>{u.resellerAgencyName || u.resellerName}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Status Column with quick toggle */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isToggling || (isCurrent && u.status === "active")}
                          title={
                            isCurrent
                              ? "Akun Anda sendiri tidak dapat dinonaktifkan"
                              : "Klik untuk mengubah status aktif/nonaktif"
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed ${
                            u.status === "active"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200"
                          }`}
                        >
                          {isToggling ? (
                            <svg className="h-3 w-3 animate-spin text-stone-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <span
                              className={`h-2 w-2 rounded-full ${
                                u.status === "active" ? "bg-emerald-500" : "bg-stone-400"
                              }`}
                            />
                          )}
                          <span>{u.status === "active" ? "Aktif" : "Nonaktif"}</span>
                        </button>
                      </td>

                      {/* Created At Column */}
                      <td className="px-4 py-3.5 text-stone-500 text-[11px] whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions Column */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditTarget(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition"
                            title="Edit pengguna"
                          >
                            <svg className="h-3.5 w-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            disabled={isCurrent}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                              isCurrent
                                ? "border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed"
                                : "border-rose-200 bg-white text-rose-700 shadow-2xs hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                            }`}
                            title={isCurrent ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus pengguna"}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateUser}
        availableResellers={availableResellers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={editTarget}
        currentUserId={currentUserId}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdateUser}
        availableResellers={availableResellers}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        user={deleteTarget}
        currentUserId={currentUserId}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
