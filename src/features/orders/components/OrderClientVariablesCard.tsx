"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { OrderClientVariablesSummary } from "../service";
import {
  IconClipboard,
  IconEdit,
  IconExternalLink,
  IconCheckCircle,
  IconClock,
  IconSparkles,
  IconEye,
  IconAlertTriangle,
  IconLayers,
  IconHeart,
  IconCalendar,
  IconMapPin,
  IconCreditCard,
  IconInfo,
} from "./OrderIcons";

interface OrderClientVariablesCardProps {
  variables: OrderClientVariablesSummary | null;
  orderId: string;
  invitationId?: string | null;
  invitationSlug?: string | null;
  clientAccessToken?: string | null;
  templateTitle?: string | null;
}

function formatGroupIcon(groupTitle: string) {
  const lower = groupTitle.toLowerCase();
  if (lower.includes("mempelai") || lower.includes("pasangan") || lower.includes("pengantin")) {
    return <IconHeart size={16} className="text-rose-500" />;
  }
  if (lower.includes("acara") || lower.includes("akad") || lower.includes("resepsi") || lower.includes("jadwal")) {
    return <IconCalendar size={16} className="text-[#84633F]" />;
  }
  if (lower.includes("lokasi") || lower.includes("tempat") || lower.includes("peta") || lower.includes("alamat")) {
    return <IconMapPin size={16} className="text-emerald-600" />;
  }
  if (lower.includes("rekening") || lower.includes("hadiah") || lower.includes("amplop") || lower.includes("bank")) {
    return <IconCreditCard size={16} className="text-indigo-600" />;
  }
  return <IconLayers size={16} className="text-stone-500" />;
}

function dateTimeFormat(date: Date | string | null): string {
  if (!date) return "Belum pernah diperbarui";
  const dateObj = date instanceof Date ? date : new Date(date);
  return !Number.isNaN(dateObj.getTime())
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(dateObj)
    : "—";
}

export function OrderClientVariablesCard({
  variables,
  orderId,
  invitationId,
  invitationSlug,
  clientAccessToken,
  templateTitle,
}: OrderClientVariablesCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    // Expand the first group by default
    "0": true,
  });
  const [searchQuery, setSearchQuery] = useState("");

  if (!variables || variables.totalCount === 0) {
    return (
      <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
              Formulir Data
            </span>
            <h3 className="font-bold text-[#2C221E] flex items-center gap-2 text-sm">
              <IconClipboard size={16} className="text-[#84633F]" />
              <span>Data Variabel Undangan (Hasil Input Klien)</span>
            </h3>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-stone-200 bg-[#FAF8F5]/80 p-5 text-center">
          <p className="text-xs text-stone-500">
            Template ini belum memiliki variabel dinamis yang terkonfigurasi.
          </p>
        </div>
      </article>
    );
  }

  const { filledCount, totalCount, hasData, lastUpdated, groups, values, errors } = variables;
  const percentage = Math.round((filledCount / totalCount) * 100);

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    groups.forEach((_, idx) => {
      all[idx] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const cleanQuery = searchQuery.trim().toLowerCase();

  return (
    <article className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
      {/* Header Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-[#84633F]/10 px-2 py-0.5 text-[10px] font-bold text-[#84633F]">
              Portal Self-Service
            </span>
            {hasData ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <IconCheckCircle size={11} className="text-emerald-600" />
                <span>Klien Telah Mengisi Data</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-[#8C5D2A]">
                <IconClock size={11} className="text-amber-500" />
                <span>Menunggu Pengisian Data Mandiri</span>
              </span>
            )}
            {templateTitle && (
              <span className="text-[11px] text-stone-400 font-medium">
                Tema: <strong className="text-stone-700">{templateTitle}</strong>
              </span>
            )}
          </div>
          <h3 className="mt-1 font-bold text-[#2C221E] flex items-center gap-2 text-base">
            <IconClipboard size={18} className="text-[#84633F]" />
            <span>Data Variabel Undangan (Hasil Input Klien)</span>
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {hasData
              ? `Klien telah mengisi ${filledCount} dari total ${totalCount} variabel formulir di portal mandiri.`
              : "Calon pengantin belum mengisi formulir data di portal mandiri. Data dapat dilengkapi via WhatsApp atau Studio."}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {invitationId && (
            <Link
              href={`/dashboard/invitations/${invitationId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#2C221E] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#42352E] transition"
            >
              <IconEdit size={13} />
              <span>Buka Studio</span>
            </Link>
          )}
          {invitationSlug && (
            <Link
              href={`/i/${invitationSlug}?preview=1`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition"
            >
              <IconEye size={13} />
              <span>Preview Undangan</span>
              <IconExternalLink size={11} className="text-stone-400" />
            </Link>
          )}
          {clientAccessToken && (
            <Link
              href={`/c/${clientAccessToken}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold text-[#84633F] shadow-2xs transition"
            >
              <span>Portal Klien</span>
              <IconExternalLink size={11} />
            </Link>
          )}
        </div>
      </div>

      {/* Progress & Meta Bar */}
      <div className="mt-4 rounded-xl border border-[#FAF0E6] bg-linear-to-r from-[#FAF8F5] to-white p-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2C221E]">Kemajuan Pengisian:</span>
            <span className="font-bold text-[#84633F]">
              {filledCount} / {totalCount} Variabel ({percentage}%)
            </span>
            {percentage === 100 && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                ✓ Lengkap
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <IconClock size={12} className="text-stone-400" />
            <span>Terakhir diupdate klien:</span>
            <strong className="text-stone-700">{dateTimeFormat(lastUpdated)}</strong>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-stone-200/80">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentage === 100
                ? "bg-emerald-600"
                : percentage > 50
                  ? "bg-[#84633F]"
                  : "bg-amber-500"
            }`}
            style={{ width: `${Math.max(percentage, 4)}%` }}
          />
        </div>
      </div>

      {/* Filter and Expand Controls */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari variabel (mis. nama, alamat, jam)..."
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 outline-none focus:border-[#84633F] shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-semibold text-[#84633F] hover:underline"
          >
            Buka Semua Grup
          </button>
          <span className="text-stone-300">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-semibold text-stone-500 hover:underline"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {/* Groups Accordion List */}
      <div className="mt-4 space-y-3">
        {groups.map((group, groupIdx) => {
          // Filter fields in group if search active
          const filteredFields = cleanQuery
            ? group.fields.filter((f) => {
                const val = values[f.key];
                return (
                  f.label.toLowerCase().includes(cleanQuery) ||
                  f.key.toLowerCase().includes(cleanQuery) ||
                  (typeof val === "string" && val.toLowerCase().includes(cleanQuery))
                );
              })
            : group.fields;

          if (filteredFields.length === 0) return null;

          const isExpanded = cleanQuery ? true : Boolean(expandedGroups[groupIdx]);
          const groupFilledCount = filteredFields.filter((f) => {
            const val = values[f.key];
            return typeof val === "string" && val.trim().length > 0;
          }).length;

          const groupTitle = group.label || group.group;

          return (
            <div
              key={group.group || groupIdx}
              className="rounded-xl border border-stone-200 bg-[#FAF8F5]/40 overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => toggleGroup(groupIdx)}
                className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-[#FAF8F5] transition text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded-md bg-stone-100">
                    {formatGroupIcon(groupTitle)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2C221E]">{groupTitle}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                    {groupFilledCount}/{filteredFields.length} terisi
                  </span>
                  <span className="text-stone-400 font-bold text-xs">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-3.5 border-t border-stone-100 bg-[#FAF8F5]/30">
                  <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {filteredFields.map((field) => {
                      const rawValue = values[field.key];
                      const isFilled = typeof rawValue === "string" && rawValue.trim().length > 0;
                      const hasError = Boolean(errors[field.key]);

                      return (
                        <div
                          key={field.key}
                          className={`rounded-lg border p-2.5 text-xs transition ${
                            hasError
                              ? "border-rose-200 bg-rose-50/50"
                              : isFilled
                                ? "border-stone-200/80 bg-white"
                                : "border-dashed border-stone-200 bg-stone-50/60"
                          }`}
                        >
                          <dt className="flex items-center justify-between gap-1 text-[11px] font-medium text-stone-500">
                            <span className="line-clamp-1">{field.label}</span>
                            <span className="font-mono text-[9px] text-stone-400">
                              {field.key}
                            </span>
                          </dt>

                          <dd className="mt-1 text-xs">
                            {isFilled ? (
                              field.type === "image" || field.key.includes("foto") || field.key.includes("image") ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-stone-800 break-all text-[11px]">
                                    {rawValue}
                                  </span>
                                  {rawValue.startsWith("http") || rawValue.startsWith("/") ? (
                                    <a
                                      href={rawValue}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-700 underline text-[10px] shrink-0"
                                    >
                                      Buka Foto ↗
                                    </a>
                                  ) : null}
                                </div>
                              ) : field.key.includes("maps") || field.key.includes("link") || rawValue.startsWith("http") ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-stone-800 break-all line-clamp-1">
                                    {rawValue}
                                  </span>
                                  <a
                                    href={rawValue}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-700 underline text-[10px] shrink-0"
                                  >
                                    Buka Link ↗
                                  </a>
                                </div>
                              ) : (
                                <span className="font-semibold text-[#2C221E] break-words">
                                  {rawValue}
                                </span>
                              )
                            ) : (
                              <span className="italic text-stone-400 text-[11px]">
                                (Belum diisi oleh klien)
                              </span>
                            )}

                            {hasError && (
                              <p className="mt-1 text-[10px] font-medium text-rose-700 flex items-center gap-1">
                                <IconAlertTriangle size={10} />
                                <span>{errors[field.key]}</span>
                              </p>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
