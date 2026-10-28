import { describe, it, expect } from "vitest";
import { resolveDocument } from "@/lib/engine/resolve-document";
import { canonicalDocumentV1Schema } from "@/lib/schema/document";

const baseAudioDoc = canonicalDocumentV1Schema.parse({
  schemaVersion: 1,
  design: {
    baseWidth: 390,
    tokens: {},
    audio: {
      enabled: true,
      src: "/audio/canon-in-d.mp3",
      title: "Canon in D Major",
      position: "bottom-right",
      loop: true,
      autoplayOnOpen: true,
    },
  },
  variables: [],
  sections: [
    {
      id: "sec_hero",
      baseHeight: 600,
      visible: true,
      overflow: "hidden",
      background: { fit: "cover" },
      elements: [],
    },
  ],
});

describe("Client Custom Backsound Resolution", () => {
  it("resolves default template audio when client has not customized audio", () => {
    const resolved = resolveDocument(baseAudioDoc, {});
    expect(resolved.audio).toBeDefined();
    expect(resolved.audio!.enabled).toBe(true);
    expect(resolved.audio!.src).toBe("/audio/canon-in-d.mp3");
    expect(resolved.audio!.title).toBe("Canon in D Major");
  });

  it("overrides audio when client chooses a different preset", () => {
    const clientData = {
      "audio.enabled": true,
      "audio.src": "/audio/there-is-romance.mp3",
      "audio.title": "There is Romance",
      "audio.artist": "Kevin MacLeod",
      "audio.presetId": "there-is-romance",
    };

    const resolved = resolveDocument(baseAudioDoc, clientData);
    expect(resolved.audio).toBeDefined();
    expect(resolved.audio!.enabled).toBe(true);
    expect(resolved.audio!.src).toBe("/audio/there-is-romance.mp3");
    expect(resolved.audio!.title).toBe("There is Romance");
  });

  it("resolves custom uploaded audio assetId to /api/assets/:id", () => {
    const customAssetId = "123e4567-e89b-12d3-a456-426614174000";
    const clientData = {
      "audio.enabled": true,
      "audio.assetId": customAssetId,
      "audio.title": "Lagu Cinta Kami",
    };

    const resolved = resolveDocument(baseAudioDoc, clientData);
    expect(resolved.audio).toBeDefined();
    expect(resolved.audio!.enabled).toBe(true);
    expect(resolved.audio!.src).toBe(`/api/assets/${customAssetId}`);
    expect(resolved.audio!.title).toBe("Lagu Cinta Kami");
  });

  it("completely disables and leaves resolved.audio undefined when client turns off audio", () => {
    const clientData = {
      "audio.enabled": false,
      "audio.src": "/audio/canon-in-d.mp3",
    };

    const resolved = resolveDocument(baseAudioDoc, clientData);
    expect(resolved.audio).toBeUndefined();
  });
});
