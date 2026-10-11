import {
  MAX_VARIABLES,
  variableDefinitionSchema,
  type CanonicalDocument,
  type VariableDefinitionInput,
  type VariableDefinition,
} from "@/lib/schema";
import { DEFAULT_COUNTDOWN_LABELS } from "./logic";

/**
 * Auto-bound system variables for Gift Widget (Hadiah)
 * 3 main variables (bank, accountNumber, accountName) + 3 optional secondary variables
 */
export const GIFT_AUTO_VARIABLES: readonly VariableDefinitionInput[] = [
  {
    key: "gift.bank",
    type: "text",
    label: "Jenis Rekening / Bank (Utama)",
    description: "Nama bank atau dompet digital penerima (contoh: BCA, Mandiri, BRI, DANA)",
    default: "BCA",
    required: true,
  },
  {
    key: "gift.accountNumber",
    type: "text",
    label: "Nomor Rekening (Utama)",
    description: "Nomor rekening bank atau nomor HP dompet digital",
    default: "1234567890",
    required: true,
  },
  {
    key: "gift.accountName",
    type: "text",
    label: "Atas Nama Rekening (Utama)",
    description: "Nama lengkap pemilik rekening penerima hadiah",
    default: "Nama Mempelai",
    required: true,
  },
  {
    key: "gift.bank2",
    type: "text",
    label: "Jenis Rekening 2 (Opsional)",
    description: "Nama bank atau dompet digital kedua jika ingin menampilkan 2 rekening",
    default: "",
    required: false,
  },
  {
    key: "gift.accountNumber2",
    type: "text",
    label: "Nomor Rekening 2 (Opsional)",
    description: "Nomor rekening bank atau dompet digital kedua jika ada",
    default: "",
    required: false,
  },
  {
    key: "gift.accountName2",
    type: "text",
    label: "Atas Nama Rekening 2 (Opsional)",
    description: "Nama lengkap pemilik rekening kedua jika ada",
    default: "",
    required: false,
  },
];

/**
 * Auto-bound system variables for Map Widget (Peta Lokasi)
 * 3 variables: latitude, longitude, and text address
 */
export const MAP_AUTO_VARIABLES: readonly VariableDefinitionInput[] = [
  {
    key: "event.location.lat",
    type: "number",
    label: "Latitude Lokasi Acara",
    description: "Titik koordinat latitude lokasi acara untuk Google Maps",
    default: -6.175392,
    required: true,
  },
  {
    key: "event.location.lng",
    type: "number",
    label: "Longitude Lokasi Acara",
    description: "Titik koordinat longitude lokasi acara untuk Google Maps",
    default: 106.827153,
    required: true,
  },
  {
    key: "event.location.address",
    type: "text",
    label: "Alamat Lokasi Acara",
    description: "Alamat lengkap atau nama gedung tempat berlangsungnya acara",
    default: "Gedung Pernikahan Megah, Jl. Contoh No. 1, Jakarta Pusat",
    required: true,
  },
];

/**
 * Auto-bound system variables for Countdown Widget (Hitung Mundur)
 * 1 datetime variable with IANA timezone
 */
export const COUNTDOWN_AUTO_VARIABLES: readonly VariableDefinitionInput[] = [
  {
    key: "event.datetime",
    type: "datetime",
    label: "Waktu & Tanggal Acara",
    description: "Tanggal dan jam dimulainya acara untuk hitung mundur otomatis",
    default: {
      local: "2026-11-28T09:00",
      timeZone: "Asia/Jakarta",
    },
    required: true,
  },
];

/**
 * Auto-bound system variables for Music Widget & Global Audio (Musik)
 * 2 variables: URL audio and song title
 */
export const MUSIC_AUTO_VARIABLES: readonly VariableDefinitionInput[] = [
  {
    key: "audio.url",
    type: "url",
    label: "Link / File Audio Musik",
    description: "URL file lagu atau musik latar undangan (format MP3/OGG)",
    default: "https://actions.google.com/sounds/v1/ambiences/wind_chimes.ogg",
    required: true,
  },
  {
    key: "audio.title",
    type: "text",
    label: "Judul Lagu Musik",
    description: "Judul lagu pengiring yang ditampilkan di pemutar musik",
    default: "Gending Pengantin - Tradisional Anggun",
    required: true,
  },
];

export const AUTO_VARIABLE_WIDGET_TYPES = ["gift", "map", "countdown", "music"] as const;
export type AutoVariableWidgetType = (typeof AUTO_VARIABLE_WIDGET_TYPES)[number];

export function isWidgetUsingAutoVariables(widgetType: string): widgetType is AutoVariableWidgetType {
  return (AUTO_VARIABLE_WIDGET_TYPES as readonly string[]).includes(widgetType);
}

export function getAutoVariablesForWidget(widgetType: string): readonly VariableDefinitionInput[] {
  switch (widgetType) {
    case "gift":
      return GIFT_AUTO_VARIABLES;
    case "map":
      return MAP_AUTO_VARIABLES;
    case "countdown":
      return COUNTDOWN_AUTO_VARIABLES;
    case "music":
      return MUSIC_AUTO_VARIABLES;
    default:
      return [];
  }
}

function internalAddVariable(
  doc: CanonicalDocument,
  input: VariableDefinitionInput,
): CanonicalDocument {
  const parsed = variableDefinitionSchema.safeParse(input);
  if (!parsed.success) return doc;
  if (doc.variables.some((v) => v.key === parsed.data.key)) return doc;
  if (doc.variables.length >= MAX_VARIABLES) return doc;
  return { ...doc, variables: [...doc.variables, parsed.data] };
}

/**
 * Ensures that all auto-variables required by the widget are declared in the document.
 * If not present, they are injected into `doc.variables` with their designer default values.
 */
export function ensureWidgetAutoVariables(
  doc: CanonicalDocument,
  widgetType: string,
): CanonicalDocument {
  const varsToEnsure = getAutoVariablesForWidget(widgetType);
  if (varsToEnsure.length === 0) return doc;

  let updatedDoc = doc;
  for (const v of varsToEnsure) {
    if (!updatedDoc.variables.some((existing) => existing.key === v.key)) {
      updatedDoc = internalAddVariable(updatedDoc, v);
    }
  }

  // Khusus musik: aktifkan juga audio latar global undangan jika belum aktif
  if (widgetType === "music") {
    const audioUrl = (MUSIC_AUTO_VARIABLES[0] as { default: string }).default;
    const audioTitle = (MUSIC_AUTO_VARIABLES[1] as { default: string }).default;
    if (!updatedDoc.design.audio || !updatedDoc.design.audio.enabled) {
      updatedDoc = {
        ...updatedDoc,
        design: {
          ...updatedDoc.design,
          audio: {
            enabled: true,
            src: audioUrl,
            title: audioTitle,
            position: "bottom-right",
            loop: true,
            autoplayOnOpen: true,
          },
        },
      };
    }
  }

  return updatedDoc;
}

/**
 * Returns default widget props pre-bound to auto-variables.
 */
export function getWidgetAutoProps(widgetType: string): Record<string, unknown> {
  switch (widgetType) {
    case "gift":
      return {
        title: "Kirim Hadiah",
        bank: { bind: "gift.bank" },
        accountNumber: { bind: "gift.accountNumber" },
        accountName: { bind: "gift.accountName" },
        bank2: { bind: "gift.bank2" },
        accountNumber2: { bind: "gift.accountNumber2" },
        accountName2: { bind: "gift.accountName2" },
      };
    case "map":
      return {
        latitude: { bind: "event.location.lat" },
        longitude: { bind: "event.location.lng" },
        address: { bind: "event.location.address" },
        label: { bind: "event.location.address" },
        buttonText: "Buka Google Maps",
      };
    case "countdown":
      return {
        targetDateTime: { bind: "event.datetime" },
        labels: { ...DEFAULT_COUNTDOWN_LABELS },
        afterState: "message",
        afterMessage: "Acara telah dimulai",
      };
    case "music":
      return {
        src: { bind: "audio.url" },
        title: { bind: "audio.title" },
        autoplay: false,
      };
    default:
      return {};
  }
}

/**
 * Helper to resolve bound variable values for canvas visual previews.
 */
export function resolveCanvasBoundValue(
  value: unknown,
  variables?: readonly VariableDefinition[],
): unknown {
  if (
    value &&
    typeof value === "object" &&
    "bind" in value &&
    typeof (value as { bind: unknown }).bind === "string"
  ) {
    const key = (value as { bind: string }).bind;
    const def = variables?.find((v) => v.key === key);
    if (def && "default" in def && def.default !== undefined) {
      return def.default;
    }
    if ("fallback" in value && (value as { fallback?: unknown }).fallback !== undefined) {
      return (value as { fallback: unknown }).fallback;
    }
  }
  return value;
}
