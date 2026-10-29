import { describe, expect, it } from "vitest";
import { elementActionSchema, imageElementSchema, textElementSchema, shapeElementSchema } from "@/lib/schema";

describe("Element Action Schema", () => {
  it("validates url action with target and hoverEffect", () => {
    const valid = elementActionSchema.safeParse({
      type: "url",
      url: "https://example.com/location",
      target: "_blank",
      hoverEffect: "scale",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.type).toBe("url");
      expect(valid.data.url).toBe("https://example.com/location");
      expect(valid.data.target).toBe("_blank");
      expect(valid.data.hoverEffect).toBe("scale");
    }
  });

  it("validates scroll_to_section action", () => {
    const valid = elementActionSchema.safeParse({
      type: "scroll_to_section",
      sectionId: "sec-rsvp-1234",
      hoverEffect: "glow",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.type).toBe("scroll_to_section");
      expect(valid.data.sectionId).toBe("sec-rsvp-1234");
    }
  });

  it("validates open_invitation action", () => {
    const valid = elementActionSchema.safeParse({
      type: "open_invitation",
      hoverEffect: "opacity",
    });
    expect(valid.success).toBe(true);
  });

  it("validates whatsapp, phone, and email actions", () => {
    const wa = elementActionSchema.safeParse({
      type: "whatsapp",
      phone: "081234567890",
      message: "Halo, saya konfirmasi hadir",
    });
    expect(wa.success).toBe(true);

    const tel = elementActionSchema.safeParse({
      type: "phone",
      phone: "+628123456789",
    });
    expect(tel.success).toBe(true);

    const email = elementActionSchema.safeParse({
      type: "email",
      email: "acara@example.com",
    });
    expect(email.success).toBe(true);
  });

  it("rejects invalid action types", () => {
    const invalid = elementActionSchema.safeParse({
      type: "execute_script",
      url: "alert(1)",
    });
    expect(invalid.success).toBe(false);
  });

  it("supports action in image, text, and shape elements", () => {
    const imageParsed = imageElementSchema.safeParse({
      id: "img_action_1",
      type: "image",
      frame: { x: 0, y: 0, w: 100, h: 100, rotation: 0 },
      source: { assetId: "00000000-0000-0000-0000-000000000000" },
      action: {
        type: "url",
        url: "https://maps.google.com",
        target: "_blank",
        hoverEffect: "scale",
      },
    });
    expect(imageParsed.success).toBe(true);

    const textParsed = textElementSchema.safeParse({
      id: "txt_action_1",
      type: "text",
      frame: { x: 10, y: 10, w: 200, h: 40, rotation: 0 },
      content: { segments: [{ text: "Buka Google Maps" }] },
      action: {
        type: "scroll_to_section",
        sectionId: "sec_map",
      },
    });
    expect(textParsed.success).toBe(true);

    const shapeParsed = shapeElementSchema.safeParse({
      id: "shp_action_1",
      type: "shape",
      shapeType: "rectangle",
      frame: { x: 50, y: 50, w: 120, h: 48, rotation: 0 },
      action: {
        type: "open_invitation",
      },
    });
    expect(shapeParsed.success).toBe(true);
  });
});
