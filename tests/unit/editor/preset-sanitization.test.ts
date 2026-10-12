import { describe, expect, it } from "vitest";
import { sanitizePresetToVariableInput } from "@/features/editor/core/global-presets";
import { addVariable } from "@/features/editor/core/ops";
import { createEmptyDocument, variableDefinitionSchema } from "@/lib/schema";

describe("Preset Sanitization and Addition to Template", () => {
  it("sanitizes video URL preset (like custom.vidio) and successfully adds to document", () => {
    let doc = createEmptyDocument();
    const rawVideoPreset = {
      id: "preset_vidio_1",
      key: "custom.vidio",
      label: "Vidio",
      category: "kustom" as const,
      type: "url",
      default: "", // empty default should not fail URL validation
      description: "Variabel Vidio",
      maxLength: null, // null maxLength from DB should not fail strictObject
    };

    const sanitized = sanitizePresetToVariableInput(rawVideoPreset);
    expect(sanitized).not.toBeNull();
    expect(variableDefinitionSchema.safeParse(sanitized).success).toBe(true);

    doc = addVariable(doc, sanitized!);
    expect(doc.variables).toHaveLength(1);
    expect(doc.variables[0]?.key).toBe("custom.vidio");
    expect(doc.variables[0]?.type).toBe("url");
    expect(doc.variables[0]?.label).toBe("Vidio");
  });

  it("sanitizes text preset with null maxLength from DB and adds successfully", () => {
    let doc = createEmptyDocument();
    const rawTextPreset = {
      key: "custom.keteranganAcara",
      label: "Keterangan Acara",
      type: "text",
      default: "",
      maxLength: null,
    };

    const sanitized = sanitizePresetToVariableInput(rawTextPreset);
    expect(sanitized).not.toBeNull();
    expect(variableDefinitionSchema.safeParse(sanitized).success).toBe(true);

    doc = addVariable(doc, sanitized!);
    expect(doc.variables).toHaveLength(1);
    expect(doc.variables[0]?.key).toBe("custom.keteranganAcara");
    expect(doc.variables[0]?.type).toBe("text");
  });

  it("sanitizes number, datetime, image, color presets correctly without forbidden keys", () => {
    const presets = [
      {
        key: "custom.jumlahTamu",
        label: "Jumlah Tamu",
        type: "number",
        default: "150",
        maxLength: null,
      },
      {
        key: "custom.waktuAkad",
        label: "Waktu Akad",
        type: "datetime",
        default: "",
        maxLength: null,
      },
      {
        key: "custom.bannerAcara",
        label: "Banner Acara",
        type: "image",
        default: "",
        maxLength: null,
      },
      {
        key: "custom.warnaTema",
        label: "Warna Tema",
        type: "color",
        default: "#D4AF37",
        maxLength: null,
      },
    ];

    let doc = createEmptyDocument();
    for (const p of presets) {
      const sanitized = sanitizePresetToVariableInput(p);
      expect(sanitized).not.toBeNull();
      const parsed = variableDefinitionSchema.safeParse(sanitized);
      expect(parsed.success).toBe(true);

      doc = addVariable(doc, sanitized!);
    }

    expect(doc.variables).toHaveLength(4);
    expect(doc.variables.map((v) => v.key)).toEqual([
      "custom.jumlahTamu",
      "custom.waktuAkad",
      "custom.bannerAcara",
      "custom.warnaTema",
    ]);
  });
});
