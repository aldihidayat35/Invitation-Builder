import { describe, expect, it } from "vitest";
import {
  canonicalDocumentV1Schema,
  createEmptyDocument,
  documentAudioSchema,
} from "@/lib/schema";
import { resolveDocument } from "@/lib/engine";
import { BACKSOUND_PRESETS } from "@/features/audio";
import { createEditorStore } from "@/features/editor/core/store";

describe("Global Backsound Feature", () => {
  it("validates documentAudioSchema defaults and positions", () => {
    const parsedDefault = documentAudioSchema.parse({});
    expect(parsedDefault.enabled).toBe(false);
    expect(parsedDefault.position).toBe("bottom-right");
    expect(parsedDefault.loop).toBe(true);
    expect(parsedDefault.autoplayOnOpen).toBe(true);

    const custom = documentAudioSchema.parse({
      enabled: true,
      src: "https://example.com/audio.mp3",
      title: "Lagu Pernikahan Romantis",
      position: "top-right",
      loop: false,
      autoplayOnOpen: true,
    });
    expect(custom.enabled).toBe(true);
    expect(custom.src).toBe("https://example.com/audio.mp3");
    expect(custom.position).toBe("top-right");
  });

  it("parses canonical document with audio design configuration", () => {
    const rawDoc = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: {},
        audio: {
          enabled: true,
          src: "https://example.com/sound.mp3",
          title: "Canon in D",
          position: "bottom-left",
        },
      },
      variables: [],
      sections: [],
    };

    const doc = canonicalDocumentV1Schema.parse(rawDoc);
    expect(doc.design.audio?.enabled).toBe(true);
    expect(doc.design.audio?.src).toBe("https://example.com/sound.mp3");
    expect(doc.design.audio?.position).toBe("bottom-left");
  });

  it("resolves document audio correctly in resolveDocument", () => {
    const rawDoc = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: {},
        audio: {
          enabled: true,
          src: "https://example.com/wedding-march.mp3",
          title: "Wedding March",
          position: "bottom-right",
          loop: true,
          autoplayOnOpen: true,
        },
      },
      variables: [],
      sections: [],
    };

    const doc = canonicalDocumentV1Schema.parse(rawDoc);
    const resolved = resolveDocument(doc);
    expect(resolved.audio).toBeDefined();
    expect(resolved.audio?.enabled).toBe(true);
    expect(resolved.audio?.src).toBe("https://example.com/wedding-march.mp3");
    expect(resolved.audio?.title).toBe("Wedding March");
    expect(resolved.audio?.position).toBe("bottom-right");
  });

  it("leaves resolved audio undefined when audio is disabled", () => {
    const rawDoc = {
      schemaVersion: 1,
      design: {
        baseWidth: 390,
        tokens: {},
        audio: {
          enabled: false,
          src: "https://example.com/test.mp3",
        },
      },
      variables: [],
      sections: [],
    };

    const doc = canonicalDocumentV1Schema.parse(rawDoc);
    const resolved = resolveDocument(doc);
    expect(resolved.audio).toBeUndefined();
  });

  it("provides available backsound presets", () => {
    expect(BACKSOUND_PRESETS.length).toBeGreaterThan(0);
    const first = BACKSOUND_PRESETS[0]!;
    expect(first.id).toBe("gending-pengantin");
    expect(first.src).toContain("https://");
  });

  it("updates audio settings via editor store patchDocumentAudio", () => {
    const initialDoc = createEmptyDocument();
    const store = createEditorStore({ document: initialDoc, revision: 1 });

    store.getState().patchDocumentAudio({
      enabled: true,
      src: "https://example.com/song.mp3",
      title: "Romantic Song",
      position: "top-right",
    });

    const updatedDoc = store.getState().history.present;
    expect(updatedDoc.design.audio?.enabled).toBe(true);
    expect(updatedDoc.design.audio?.src).toBe("https://example.com/song.mp3");
    expect(updatedDoc.design.audio?.title).toBe("Romantic Song");
    expect(updatedDoc.design.audio?.position).toBe("top-right");
  });
});
