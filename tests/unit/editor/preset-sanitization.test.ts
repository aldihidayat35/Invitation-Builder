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

  it("sanitizes image preset with default assetId (uuid, json string, or object)", () => {
    const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    // Case 1: UUID string
    const res1 = sanitizePresetToVariableInput({
      key: "custom.foto1",
      label: "Foto 1",
      type: "image",
      default: validUuid,
    });
    expect(res1).not.toBeNull();
    expect(variableDefinitionSchema.safeParse(res1).success).toBe(true);
    expect(res1 && "default" in res1 ? res1.default : undefined).toEqual({ assetId: validUuid });

    // Case 2: JSON string
    const res2 = sanitizePresetToVariableInput({
      key: "custom.foto2",
      label: "Foto 2",
      type: "image",
      default: JSON.stringify({ assetId: validUuid }),
    });
    expect(res2).not.toBeNull();
    expect(variableDefinitionSchema.safeParse(res2).success).toBe(true);
    expect(res2 && "default" in res2 ? res2.default : undefined).toEqual({ assetId: validUuid });

    // Case 3: Object with assetId
    const res3 = sanitizePresetToVariableInput({
      key: "custom.foto3",
      label: "Foto 3",
      type: "image",
      default: { assetId: validUuid } as unknown as string,
    });
    expect(res3).not.toBeNull();
    expect(variableDefinitionSchema.safeParse(res3).success).toBe(true);
    expect(res3 && "default" in res3 ? res3.default : undefined).toEqual({ assetId: validUuid });
  });
});

