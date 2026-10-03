/**
 * Development samples for the engine playground and tests.
 *
 * P-02: the SAMPLE TEMPLATE below contains no client data - every name, date
 * and place comes from a variable binding. The SAMPLE DATASETS are
 * fictitious sample data and exist only so the playground can show two
 * different resolved models from one template. Never import this file from
 * production code paths.
 */
import { canonicalDocumentSchema, type CanonicalDocument } from "@/lib/schema";
import type { GuestData, InvitationData } from "./types";

const SAMPLE_TEMPLATE_INPUT = {
  schemaVersion: 1,
  design: {
    baseWidth: 390,
    tokens: {
      colors: { paper: "#fbf6ef", ink: "#2b2118" },
      fonts: { display: "Playfair Display" },
    },
  },
  variables: [
    {
      key: "couple.bride.fullName",
      type: "text",
      label: "Nama lengkap mempelai wanita",
      required: true,
    },
    { key: "couple.bride.nickname", type: "text", label: "Nama panggilan mempelai wanita" },
    {
      key: "couple.groom.fullName",
      type: "text",
      label: "Nama lengkap mempelai pria",
      required: true,
    },
    { key: "couple.groom.nickname", type: "text", label: "Nama panggilan mempelai pria" },
    { key: "event.ceremony.startAt", type: "datetime", label: "Waktu akad", required: true },
    { key: "venue.name", type: "text", label: "Nama lokasi", required: true },
    { key: "venue.address", type: "text", label: "Alamat", required: true },
    { key: "contact.phone", type: "text", label: "Telepon panitia" },
    { key: "guest.name", type: "guest-context", label: "Nama tamu" },
  ],
  sections: [
    {
      id: "sec_cover",
      name: "Cover",
      background: { color: { token: "paper" } },
      elements: [
        {
          id: "el_greeting",
          type: "text",
          frame: { x: 32, y: 120, w: 326, h: 40, rotation: 0 },
          content: {
            segments: [
              { text: "Kepada Yth. " },
              { bind: "guest.name", fallback: "Tamu Undangan", formatter: { name: "title-case" } },
            ],
          },
          style: { fontSize: 18, textAlign: "center" },
        },
        {
          id: "el_title",
          type: "text",
          frame: { x: 32, y: 200, w: 326, h: 88, rotation: 0 },
          content: {
            segments: [
              { bind: "couple.bride.nickname", fallback: "Mempelai Wanita" },
              { text: " & " },
              { bind: "couple.groom.nickname", fallback: "Mempelai Pria" },
            ],
          },
          style: {
            fontFamily: { token: "display" },
            fontSize: 40,
            textAlign: "center",
            color: { token: "ink" },
          },
        },
      ],
    },
    {
      id: "sec_event",
      name: "Acara",
      elements: [
        {
          id: "el_when",
          type: "text",
          frame: { x: 32, y: 120, w: 326, h: 40, rotation: 0 },
          content: {
            segments: [
              {
                bind: "event.ceremony.startAt",
                formatter: { name: "datetime", style: "full", locale: "id-ID" },
              },
            ],
          },
          style: { fontSize: 18, textAlign: "center" },
        },
        {
          id: "el_where",
          type: "text",
          frame: { x: 32, y: 180, w: 326, h: 36, rotation: 0 },
          content: { segments: [{ bind: "venue.name", formatter: { name: "uppercase" } }] },
          style: { fontSize: 22, fontWeight: 700, textAlign: "center" },
        },
        {
          id: "el_address",
          type: "text",
          frame: { x: 32, y: 224, w: 326, h: 48, rotation: 0 },
          content: { segments: [{ bind: "venue.address" }] },
          style: { fontSize: 14, textAlign: "center" },
        },
        {
          id: "el_phone",
          type: "text",
          frame: { x: 32, y: 290, w: 326, h: 30, rotation: 0 },
          content: {
            segments: [
              { text: "Info: " },
              {
                bind: "contact.phone",
                hideWhenMissing: true,
                formatter: { name: "phone-display" },
              },
            ],
          },
          style: { fontSize: 14, textAlign: "center" },
        },
      ],
    },
  ],
} as const;

/** Reusable template without client data. Parsed once through the real schema. */
export function createSampleTemplate(): CanonicalDocument {
  return canonicalDocumentSchema.parse(structuredClone(SAMPLE_TEMPLATE_INPUT));
}

export interface SampleDataset {
  readonly id: "a" | "b";
  readonly label: string;
  readonly data: InvitationData;
  readonly guest: GuestData;
}

export const SAMPLE_DATASETS: readonly SampleDataset[] = [
  {
    id: "a",
    label: "Dataset A",
    data: {
      "couple.bride.fullName": "Anindya Larasati",
      "couple.bride.nickname": "Anin",
      "couple.groom.fullName": "Bagas Wicaksono",
      "couple.groom.nickname": "Bagas",
      "event.ceremony.startAt": { local: "2026-12-12T08:00", timeZone: "Asia/Jakarta" },
      "venue.name": "Gedung Kartini",
      "venue.address": "Jl. Melati No. 12, Yogyakarta",
      "contact.phone": "081234567890",
    },
    guest: { name: "budi santoso" },
  },
  {
    id: "b",
    label: "Dataset B",
    data: {
      "couple.bride.fullName": "Citra Maharani",
      "couple.groom.fullName": "Dimas Prakoso",
      "event.ceremony.startAt": { local: "2027-02-20T10:30", timeZone: "Asia/Makassar" },
      "venue.name": "Pantai Losari Hall",
      "venue.address": "Jl. Penghibur No. 3, Makassar",
    },
    guest: {},
  },
];
