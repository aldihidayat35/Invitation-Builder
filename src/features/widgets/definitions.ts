/**
 * The three P0 widgets (FR-WDG-002..004): Map, Countdown, Guest Greeting.
 * Definitions are data + pure functions only (P-05): safe for server validation
 * and the editor. Runtime React components live in `./runtime`.
 */
import { z } from "zod";
import { coordinateSchema, datetimeValueSchema } from "@/lib/schema";
import { defineProp, type WidgetDefinition } from "./registry";
import {
  COUNTDOWN_UNITS,
  DEFAULT_COUNTDOWN_LABELS,
  DEFAULT_GREETING_FALLBACK,
  DEFAULT_GREETING_PREFIX,
  describeProp,
  greetingParts,
} from "./logic";

export const MAP_WIDGET_TYPE = "map";
export const COUNTDOWN_WIDGET_TYPE = "countdown";
export const GUEST_GREETING_WIDGET_TYPE = "guestGreeting";

export const mapWidget: WidgetDefinition = {
  type: MAP_WIDGET_TYPE,
  version: 1,
  label: "Peta lokasi",
  defaultFrame: { w: 326, h: 220 },
  defaultProps: { label: "Lokasi acara", buttonText: "Buka Google Maps" },
  props: {
    coordinate: defineProp("coordinate", "Koordinat", coordinateSchema, { required: true }),
    label: defineProp("text", "Label lokasi", z.string().max(120)),
    buttonText: defineProp("text", "Teks tombol", z.string().min(1).max(40)),
  },
  placeholder: (props) => ({
    title: describeProp(props.label) ?? "Peta lokasi",
    subtitle: `Koordinat: ${describeProp(props.coordinate) ?? "belum diatur"}`,
  }),
};

const countdownLabelsSchema = z.strictObject(
  Object.fromEntries(COUNTDOWN_UNITS.map((unit) => [unit, z.string().min(1).max(20).optional()])),
);

export const countdownWidget: WidgetDefinition = {
  type: COUNTDOWN_WIDGET_TYPE,
  version: 1,
  label: "Hitung mundur",
  defaultFrame: { w: 326, h: 96 },
  defaultProps: {
    labels: { ...DEFAULT_COUNTDOWN_LABELS },
    afterState: "message",
    afterMessage: "Acara telah dimulai",
  },
  props: {
    targetDateTime: defineProp("datetime", "Waktu target (+ zona waktu)", datetimeValueSchema, {
      required: true,
    }),
    labels: defineProp("text", "Label satuan", countdownLabelsSchema, {
      control: "record",
      fields: COUNTDOWN_UNITS.map((key) => ({ key, label: DEFAULT_COUNTDOWN_LABELS[key] })),
    }),
    afterState: defineProp("text", "Setelah waktu lewat", z.enum(["hide", "message"]), {
      control: "select",
      options: [
        { value: "message", label: "Tampilkan pesan" },
        { value: "hide", label: "Sembunyikan widget" },
      ],
    }),
    afterMessage: defineProp("text", "Pesan setelah waktu lewat", z.string().max(120)),
  },
  placeholder: (props) => ({
    title: "Hitung mundur",
    subtitle: `Target: ${describeProp(props.targetDateTime) ?? "belum diatur"}`,
  }),
};

export const guestGreetingWidget: WidgetDefinition = {
  type: GUEST_GREETING_WIDGET_TYPE,
  version: 1,
  label: "Sapaan tamu",
  defaultFrame: { w: 326, h: 64 },
  defaultProps: {
    prefix: DEFAULT_GREETING_PREFIX,
    fallback: DEFAULT_GREETING_FALLBACK,
  },
  props: {
    guestName: defineProp("text", "Nama tamu", z.string().max(200)),
    prefix: defineProp("text", "Awalan", z.string().max(60)),
    fallback: defineProp("text", "Teks cadangan", z.string().min(1).max(60)),
  },
  placeholder: (props) => {
    const g = greetingParts({
      guestName: describeProp(props.guestName),
      prefix: describeProp(props.prefix),
      fallback: describeProp(props.fallback),
    });
    return { title: `${g.prefix} ${g.name}` };
  },
};

export const P0_WIDGETS: readonly WidgetDefinition[] = [
  mapWidget,
  countdownWidget,
  guestGreetingWidget,
];
