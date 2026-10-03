/**
 * P1 widgets (FR-WDG-005..008): RSVP, Gallery, Music, Gift.
 * Pure data + schemas only (P-05); runtime components live in `./runtime`.
 * Collections are bound to `collection` variables (Data Mode), so no content
 * is ever hardcoded in a template.
 */
import { z } from "zod";
import { datetimeValueSchema, safeUrlSchema } from "@/lib/schema";
import { defineProp, type WidgetDefinition } from "./registry";
import { describeProp } from "./logic";

export const RSVP_WIDGET_TYPE = "rsvp";
export const GALLERY_WIDGET_TYPE = "gallery";
export const MUSIC_WIDGET_TYPE = "music";
export const GIFT_WIDGET_TYPE = "gift";

const collectionSchema = z.array(z.record(z.string(), z.unknown())).max(50);

export const rsvpWidget: WidgetDefinition = {
  type: RSVP_WIDGET_TYPE,
  version: 1,
  label: "RSVP",
  defaultFrame: { w: 326, h: 380 },
  defaultProps: {
    title: "Konfirmasi Kehadiran",
    enablePartySize: true,
    enableMessage: true,
    maxParty: 5,
  },
  props: {
    title: defineProp("text", "Judul", z.string().min(1).max(80)),
    enablePartySize: defineProp("boolean", "Tanyakan jumlah tamu", z.boolean()),
    enableMessage: defineProp("boolean", "Izinkan pesan/ucapan", z.boolean()),
    maxParty: defineProp("number", "Maks. jumlah tamu", z.int().min(1).max(20)),
    deadline: defineProp("datetime", "Batas konfirmasi (opsional)", datetimeValueSchema),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "RSVP",
    subtitle: "Formulir kehadiran tamu",
  }),
};

export const galleryWidget: WidgetDefinition = {
  type: GALLERY_WIDGET_TYPE,
  version: 1,
  label: "Galeri",
  defaultFrame: { w: 326, h: 320 },
  defaultProps: { title: "Galeri", layout: "grid", items: [] },
  props: {
    title: defineProp("text", "Judul", z.string().max(80)),
    layout: defineProp("text", "Tata letak", z.enum(["grid", "slider"]), {
      control: "select",
      options: [
        { value: "grid", label: "Grid" },
        { value: "slider", label: "Slider" },
      ],
    }),
    items: defineProp("collection", "Foto (assetId/src + alt)", collectionSchema, {
      control: "binding",
    }),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "Galeri",
    subtitle: `Layout: ${describeProp(props.layout) ?? "grid"}`,
  }),
};

export const musicWidget: WidgetDefinition = {
  type: MUSIC_WIDGET_TYPE,
  version: 1,
  label: "Musik",
  defaultFrame: { w: 326, h: 72 },
  defaultProps: { title: "Putar musik", autoplay: false },
  props: {
    src: defineProp("url", "URL audio", safeUrlSchema(), { required: true }),
    title: defineProp("text", "Label", z.string().max(60)),
    autoplay: defineProp("boolean", "Coba putar otomatis setelah interaksi", z.boolean()),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "Musik",
    subtitle: describeProp(props.src) ?? "URL audio belum diatur",
  }),
};

export const giftWidget: WidgetDefinition = {
  type: GIFT_WIDGET_TYPE,
  version: 1,
  label: "Hadiah",
  defaultFrame: { w: 326, h: 260 },
  defaultProps: { title: "Kirim Hadiah", accounts: [] },
  props: {
    title: defineProp("text", "Judul", z.string().max(80)),
    accounts: defineProp(
      "collection",
      "Rekening/e-wallet (bank, accountNumber, accountName)",
      collectionSchema,
      {
        control: "binding",
      },
    ),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "Hadiah",
    subtitle: "Rekening & e-wallet",
  }),
};

export const P1_WIDGETS: readonly WidgetDefinition[] = [
  rsvpWidget,
  galleryWidget,
  musicWidget,
  giftWidget,
];
