import { describe, it, expect } from "vitest";
import { resolveDocument } from "@/lib/engine/resolve-document";
import { canonicalDocumentV1Schema } from "@/lib/schema/document";
import {
  classifySection,
  classifyAllSections,
} from "@/features/invitations/sections-classifier";
import { isServerActionAllowed } from "@/lib/auth/server-action-policy";

const baseSectionToggleDoc = canonicalDocumentV1Schema.parse({
  schemaVersion: 1,
  design: {
    baseWidth: 390,
    tokens: {},
  },
  variables: [],
  sections: [
    {
      id: "sec_cover",
      name: "Cover Pembuka",
      baseHeight: 844,
      isOpening: true,
      visible: true,
      overflow: "hidden",
      elements: [],
    },
    {
      id: "sec_couple",
      name: "Profil Mempelai",
      baseHeight: 700,
      visible: true,
      overflow: "hidden",
      elements: [
        {
          id: "wdg_couple",
          type: "widget",
          widgetType: "coupleProfile",
          frame: { x: 0, y: 0, w: 390, h: 600, rotation: 0 },
          props: {},
        },
      ],
    },
    {
      id: "sec_events",
      name: "Rangkaian Acara",
      baseHeight: 800,
      visible: true,
      overflow: "hidden",
      elements: [
        {
          id: "wdg_events",
          type: "widget",
          widgetType: "eventSchedule",
          frame: { x: 0, y: 0, w: 390, h: 500, rotation: 0 },
          props: {},
        },
      ],
    },
    {
      id: "sec_story",
      name: "Love Story Pengantin",
      baseHeight: 650,
      visible: true,
      overflow: "hidden",
      elements: [
        {
          id: "wdg_story",
          type: "widget",
          widgetType: "loveStory",
          frame: { x: 0, y: 0, w: 390, h: 400, rotation: 0 },
          props: {},
        },
      ],
    },
    {
      id: "sec_gallery",
      name: "Galeri Foto",
      baseHeight: 750,
      visible: true,
      overflow: "hidden",
      elements: [
        {
          id: "wdg_gallery",
          type: "widget",
          widgetType: "gallery",
          frame: { x: 0, y: 0, w: 390, h: 500, rotation: 0 },
          props: { items: [{ assetId: "ast_1", src: "/demo.jpg" }] },
        },
      ],
    },
  ],
});

describe("Section Classification & Mandatory Protection", () => {
  it("classifies core sections as mandatory and optional sections as toggleable", () => {
    const classified = classifyAllSections(baseSectionToggleDoc.sections, []);
    expect(classified).toHaveLength(5);

    const cover = classified.find((s) => s.id === "sec_cover")!;
    expect(cover.isMandatory).toBe(true);
    expect(cover.enabled).toBe(true);
    expect(cover.category).toBe("Cover");

    const couple = classified.find((s) => s.id === "sec_couple")!;
    expect(couple.isMandatory).toBe(true);
    expect(couple.category).toBe("Mempelai");

    const events = classified.find((s) => s.id === "sec_events")!;
    expect(events.isMandatory).toBe(true);
    expect(events.category).toBe("Acara");

    const story = classified.find((s) => s.id === "sec_story")!;
    expect(story.isMandatory).toBe(false);
    expect(story.enabled).toBe(true);
    expect(story.category).toBe("Love Story");

    const gallery = classified.find((s) => s.id === "sec_gallery")!;
    expect(gallery.isMandatory).toBe(false);
    expect(gallery.enabled).toBe(true);
    expect(gallery.category).toBe("Galeri Foto");
  });

  it("marks optional section as disabled when ID is in disabledSections set", () => {
    const classified = classifyAllSections(baseSectionToggleDoc.sections, ["sec_story"]);
    const story = classified.find((s) => s.id === "sec_story")!;
    expect(story.enabled).toBe(false);

    const gallery = classified.find((s) => s.id === "sec_gallery")!;
    expect(gallery.enabled).toBe(true);
  });

  it("never disables mandatory core sections even if requested in disabledSections", () => {
    const classified = classifyAllSections(baseSectionToggleDoc.sections, ["sec_cover", "sec_couple"]);
    const cover = classified.find((s) => s.id === "sec_cover")!;
    expect(cover.isMandatory).toBe(true);
    expect(cover.enabled).toBe(true);

    const couple = classified.find((s) => s.id === "sec_couple")!;
    expect(couple.isMandatory).toBe(true);
    expect(couple.enabled).toBe(true);
  });
});

describe("Document Resolver: sections.disabled", () => {
  it("renders all sections when sections.disabled is empty", () => {
    const resolved = resolveDocument(baseSectionToggleDoc, {
      "gallery.enabled": true,
      "gallery.items": [{ assetId: "ast_1", src: "/demo.jpg" }],
    });

    const story = resolved.sections.find((s) => s.id === "sec_story")!;
    expect(story.hidden).toBe(false);

    const gallery = resolved.sections.find((s) => s.id === "sec_gallery")!;
    expect(gallery.hidden).toBe(false);
  });

  it("hides section in resolved document when present in data['sections.disabled']", () => {
    const resolved = resolveDocument(baseSectionToggleDoc, {
      "sections.disabled": ["sec_story"],
      "gallery.enabled": true,
      "gallery.items": [{ assetId: "ast_1", src: "/demo.jpg" }],
    });

    const story = resolved.sections.find((s) => s.id === "sec_story")!;
    expect(story.hidden).toBe(true);

    const gallery = resolved.sections.find((s) => s.id === "sec_gallery")!;
    expect(gallery.hidden).toBe(false);
  });

  it("never hides opening cover even if accidentally listed in data['sections.disabled']", () => {
    const resolved = resolveDocument(baseSectionToggleDoc, {
      "sections.disabled": ["sec_cover"],
    });

    const cover = resolved.sections.find((s) => s.id === "sec_cover")!;
    expect(cover.hidden).toBe(false);
  });
});

describe("Server Action Policy for Section Management", () => {
  it("allows anonymous actor to call savePortalSectionsAction", () => {
    expect(isServerActionAllowed("savePortalSectionsAction", "anonymous")).toBe(true);
  });

  it("allows owner actor to call saveInvitationSectionsAction", () => {
    expect(isServerActionAllowed("saveInvitationSectionsAction", "owner")).toBe(true);
    expect(isServerActionAllowed("saveInvitationSectionsAction", "anonymous")).toBe(false);
  });
});
