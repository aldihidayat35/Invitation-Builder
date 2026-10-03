/**
 * Test-only widget definitions. Real widgets are implemented in Fase 6;
 * these exist so Fase 1 can exercise the registry/semantic validator
 * without shipping widget behavior.
 */
import { z } from "zod";
import { coordinateSchema, safeUrlSchema } from "@/lib/schema";
import { createWidgetRegistry, defineProp } from "@/features/widgets";

export function createTestRegistry() {
  return createWidgetRegistry([
    {
      type: "map",
      version: 1,
      label: "Map",
      defaultFrame: { w: 326, h: 120 },
      defaultProps: { buttonText: "Buka Maps" },
      props: {
        coordinate: defineProp("coordinate", "Koordinat", coordinateSchema, { required: true }),
        label: defineProp("text", "Label", z.string().max(120)),
        buttonText: defineProp("text", "Teks tombol", z.string().max(40)),
        fallbackUrl: defineProp("url", "URL cadangan", safeUrlSchema()),
      },
    },
    {
      type: "guestGreeting",
      version: 1,
      label: "Guest greeting",
      defaultFrame: { w: 326, h: 60 },
      defaultProps: {},
      props: {
        guestName: defineProp("text", "Nama tamu", z.string().max(200)),
        prefix: defineProp("text", "Prefix", z.string().max(60)),
        fallback: defineProp("text", "Fallback", z.string().max(60)),
      },
    },
    {
      type: "countdown",
      version: 1,
      label: "Countdown",
      defaultFrame: { w: 326, h: 96 },
      defaultProps: {},
      props: {
        targetDateTime: defineProp("datetime", "Target", z.unknown(), { required: true }),
        labels: defineProp("text", "Label", z.record(z.string(), z.string())),
        afterState: defineProp("text", "Setelah waktu lewat", z.enum(["hide", "message"])),
      },
    },
  ]);
}
