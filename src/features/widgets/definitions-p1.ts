/**
 * P1 widgets (FR-WDG-005..008): RSVP, Gallery, Music, Gift.
 * Pure data + schemas only (P-05); runtime components live in `./runtime`.
 * Collections can be bound to `collection` variables (Data Mode). Gallery
 * items can also be managed directly in the editor as owned asset references.
 */
import { z } from "zod";
import { datetimeValueSchema, safeUrlSchema } from "@/lib/schema";
import { defineProp, type WidgetDefinition } from "./registry";
import { describeProp } from "./logic";
import { getDefaultWidgetStyle } from "./widget-styles";

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
  defaultStyle: getDefaultWidgetStyle(RSVP_WIDGET_TYPE),
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
  defaultStyle: getDefaultWidgetStyle(GALLERY_WIDGET_TYPE),
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
  defaultStyle: getDefaultWidgetStyle(MUSIC_WIDGET_TYPE),
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
  defaultStyle: getDefaultWidgetStyle(GIFT_WIDGET_TYPE),
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

export const PHOTO_FRAME_WIDGET_TYPE = "photoFrame";

export const photoFrameWidget: WidgetDefinition = {
  type: PHOTO_FRAME_WIDGET_TYPE,
  version: 1,
  label: "Bingkai Foto",
  defaultFrame: { w: 300, h: 360 },
  defaultStyle: getDefaultWidgetStyle(PHOTO_FRAME_WIDGET_TYPE),
  defaultProps: { fit: "cover" },
  props: {
    image: defineProp("url", "Foto (asset / URL)", z.union([z.string(), z.record(z.string(), z.unknown())]).optional()),
    caption: defineProp("text", "Keterangan foto (opsional)", z.string().max(120).optional()),
    fit: defineProp("text", "Mode tampilan", z.enum(["cover", "contain"]).default("cover"), {
      control: "select",
      options: [
        { value: "cover", label: "Cover (isi penuh)" },
        { value: "contain", label: "Contain (proporsional)" },
      ],
    }),
    alt: defineProp("text", "Teks alternatif", z.string().max(200).optional()),
  },
  placeholder: (props) => ({
    title: describeProp(props.caption) ?? "Bingkai Foto",
    subtitle: describeProp(props.image) ?? "Foto belum diisi",
  }),
};

export const TIMELINE_WIDGET_TYPE = "timeline";

export const timelineWidget: WidgetDefinition = {
  type: TIMELINE_WIDGET_TYPE,
  version: 1,
  label: "Rundown Acara",
  defaultFrame: { w: 326, h: 420 },
  defaultStyle: getDefaultWidgetStyle(TIMELINE_WIDGET_TYPE),
  defaultProps: {
    title: "Rundown Acara",
    subtitle: "Rangkaian Acara Bahagia",
    events: [
      {
        time: "08:00 - 10:00 WIB",
        title: "Akad Nikah",
        description: "Prosesi ijab kabul & doa bersama",
        location: "Masjid Raya",
        icon: "ring",
      },
      {
        time: "11:00 - 13:00 WIB",
        title: "Resepsi Pernikahan",
        description: "Ramah tamah & santap siang",
        location: "Grand Ballroom",
        icon: "glass",
      },
      {
        time: "19:00 - 21:00 WIB",
        title: "After Party",
        description: "Perayaan bersama kerabat dekat",
        location: "Rooftop Garden",
        icon: "sparkles",
      },
    ],
  },
  props: {
    title: defineProp("text", "Judul", z.string().max(80).default("Rundown Acara")),
    subtitle: defineProp("text", "Subjudul", z.string().max(120).optional()),
    events: defineProp(
      "collection",
      "Daftar Agenda (waktu, judul, lokasi, deskripsi)",
      collectionSchema,
      {
        control: "binding",
      },
    ),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "Rundown Acara",
    subtitle: `${describeProp(props.subtitle) ?? "Rangkaian Acara"} (${Array.isArray(props.events) ? props.events.length : 3} agenda)`,
  }),
};

export const WISHES_WIDGET_TYPE = "wishes";

export const wishesWidget: WidgetDefinition = {
  type: WISHES_WIDGET_TYPE,
  version: 1,
  label: "Buku Tamu & Doa",
  defaultFrame: { w: 326, h: 440 },
  defaultStyle: getDefaultWidgetStyle(WISHES_WIDGET_TYPE),
  defaultProps: {
    title: "Ucapan & Doa Restu",
    subtitle: "Doa restu Anda adalah kebahagiaan bagi kami",
    allowPost: true,
    maxDisplay: 6,
    items: [
      {
        name: "Dina & Rian",
        message: "Selamat menempuh hidup baru! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah. Bahagia selalu! 💕",
        presence: "hadir",
        date: "Baru saja",
      },
      {
        name: "Budi Santoso",
        message: "Happy wedding brother! Lancar jaya acaranya sampai hari H. Doa terbaik untuk kalian berdua!",
        presence: "hadir",
        date: "1 jam lalu",
      },
      {
        name: "Maya Indah",
        message: "Selamat ya kalian berdua! Maaf belum bisa hadir langsung karena masih dinas, tapi doa restu kami selalu menyertai kalian.",
        presence: "berhalangan",
        date: "3 jam lalu",
      },
    ],
  },
  props: {
    title: defineProp("text", "Judul", z.string().max(80).default("Ucapan & Doa Restu")),
    subtitle: defineProp("text", "Subjudul", z.string().max(120).optional()),
    allowPost: defineProp("boolean", "Izinkan tamu kirim ucapan langsung", z.boolean().default(true)),
    maxDisplay: defineProp("number", "Jumlah pesan ditampilkan", z.number().min(1).max(50).default(6)),
    items: defineProp(
      "collection",
      "Daftar Ucapan (name, message, presence, date)",
      collectionSchema,
      {
        control: "binding",
      },
    ),
  },
  placeholder: (props) => ({
    title: describeProp(props.title) ?? "Ucapan & Doa",
    subtitle: `${describeProp(props.subtitle) ?? "Buku Tamu"} (${Array.isArray(props.items) ? props.items.length : 3} ucapan)`,
  }),
};

export const COUPLE_PROFILE_WIDGET_TYPE = "coupleProfile";

const couplePersonSchema = z.union([
  z.object({
    name: z.string().optional(),
    fullName: z.string().optional(),
    role: z.string().optional(),
    parents: z.string().optional(),
    instagram: z.string().optional(),
    photo: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  }),
  collectionSchema,
  z.record(z.string(), z.unknown()),
]);

export const coupleProfileWidget: WidgetDefinition = {
  type: COUPLE_PROFILE_WIDGET_TYPE,
  version: 1,
  label: "Profil Mempelai",
  defaultFrame: { w: 326, h: 560 },
  defaultStyle: getDefaultWidgetStyle(COUPLE_PROFILE_WIDGET_TYPE),
  defaultProps: {
    title: "Mempelai",
    subtitle: "Dengan memohon rahmat dan ridho Allah SWT",
    nameFont: "",
    bodyFont: "",
    connector: "&",
    order: "groom-first",
    showInstagram: true,
    showParents: true,
    groom: {
      name: "Rama",
      fullName: "Rama Pratama, S.T.",
      role: "Mempelai Pria",
      parents: "Putra pertama dari Bpk. Bambang & Ibu Sri Wahyuni",
      instagram: "ramapratama",
      photo: "",
    },
    bride: {
      name: "Alya",
      fullName: "Alya Putri Saraswati, S.Ked.",
      role: "Mempelai Wanita",
      parents: "Putri kedua dari Bpk. Dr. Hendra & Ibu Ratna Dewi",
      instagram: "alyasaraswati",
      photo: "",
    },
  },
  props: {
    title: defineProp("text", "Judul Bagian", z.string().max(80).optional()),
    subtitle: defineProp("text", "Subjudul / Kutipan", z.string().max(160).optional()),
    nameFont: defineProp("text", "Font Nama Mempelai", z.string().max(80).optional(), {
      control: "font",
    }),
    bodyFont: defineProp("text", "Font Keterangan & Teks", z.string().max(80).optional(), {
      control: "font",
    }),
    connector: defineProp("text", "Konektor / Simbol Pemisah", z.string().max(20).default("&")),
    order: defineProp("text", "Urutan Mempelai", z.enum(["groom-first", "bride-first"]).default("groom-first"), {
      control: "select",
      options: [
        { value: "groom-first", label: "Mempelai Pria dulu" },
        { value: "bride-first", label: "Mempelai Wanita dulu" },
      ],
    }),
    showInstagram: defineProp("boolean", "Tampilkan Instagram", z.boolean().default(true)),
    showParents: defineProp("boolean", "Tampilkan Keterangan Orang Tua", z.boolean().default(true)),
    groom: defineProp(
      "collection",
      "Data Mempelai Pria (name, fullName, parents, photo, instagram)",
      couplePersonSchema,
      {
        control: "binding",
      },
    ),
    bride: defineProp(
      "collection",
      "Data Mempelai Wanita (name, fullName, parents, photo, instagram)",
      couplePersonSchema,
      {
        control: "binding",
      },
    ),
  },
  placeholder: (props) => {
    const groomRec = typeof props.groom === "object" && props.groom !== null && !Array.isArray(props.groom)
      ? (props.groom as Record<string, unknown>)
      : Array.isArray(props.groom) && props.groom.length > 0 && typeof props.groom[0] === "object"
        ? (props.groom[0] as Record<string, unknown>)
        : undefined;
    const brideRec = typeof props.bride === "object" && props.bride !== null && !Array.isArray(props.bride)
      ? (props.bride as Record<string, unknown>)
      : Array.isArray(props.bride) && props.bride.length > 0 && typeof props.bride[0] === "object"
        ? (props.bride[0] as Record<string, unknown>)
        : undefined;
    const groomName = typeof groomRec?.name === "string" ? groomRec.name : "Rama";
    const brideName = typeof brideRec?.name === "string" ? brideRec.name : "Alya";
    const conn = typeof props.connector === "string" ? props.connector : "&";
    return {
      title: `${groomName} ${conn} ${brideName}`,
      subtitle: "Profil Pasangan Mempelai",
    };
  },
};

export const P1_WIDGETS: readonly WidgetDefinition[] = [
  rsvpWidget,
  galleryWidget,
  musicWidget,
  giftWidget,
  photoFrameWidget,
  timelineWidget,
  wishesWidget,
  coupleProfileWidget,
];



