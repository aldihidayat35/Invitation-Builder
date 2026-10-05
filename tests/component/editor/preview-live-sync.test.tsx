/**
 * Component and Unit tests for Realtime Cross-Tab Live Preview Sync.
 */
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createPreviewBroadcaster,
  getCachedPreviewSnapshot,
  subscribePreviewSync,
  clearPreviewSnapshotCache,
  PREVIEW_STORAGE_DOC_PREFIX,
} from "@/features/editor/core/preview-sync";
import { TemplateRealPreview } from "@/features/editor/components/TemplateRealPreview";
import { fullDocument } from "../../helpers/documents";
import { canonicalDocumentSchema } from "@/lib/schema";

class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  static channels: MockBroadcastChannel[] = [];

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.channels.push(this);
  }

  postMessage(data: unknown) {
    for (const ch of MockBroadcastChannel.channels) {
      if (ch !== this && ch.name === this.name && ch.onmessage) {
        ch.onmessage({ data } as MessageEvent);
      }
    }
  }

  close() {
    MockBroadcastChannel.channels = MockBroadcastChannel.channels.filter((c) => c !== this);
  }
}

describe("Live Preview Cross-Tab Synchronization", () => {
  const templateId = "tmpl_sync_test";
  const originalBC = window.BroadcastChannel;

  beforeEach(() => {
    localStorage.clear();
    clearPreviewSnapshotCache();
    MockBroadcastChannel.channels = [];
    window.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
  });

  afterEach(() => {
    window.BroadcastChannel = originalBC;
  });

  it("createPreviewBroadcaster debounces repeated changes and broadcasts document update", () => {
    vi.useFakeTimers();
    try {
      const rawDoc = fullDocument();
      const currentDoc = canonicalDocumentSchema.parse(rawDoc);

      const receiverChannel = new MockBroadcastChannel(`dib_preview_channel_${templateId}`);
      const received: Array<{ type: string; templateId?: string; document?: unknown }> = [];
      receiverChannel.onmessage = (ev) => received.push(ev.data);

      const broadcaster = createPreviewBroadcaster(templateId, () => currentDoc, 120);

      // Initial broadcast
      broadcaster.broadcastNow();
      expect(received.length).toBe(1);
      expect(received[0]?.type).toBe("DOCUMENT_UPDATE");
      expect(received[0]?.templateId).toBe(templateId);
      expect(localStorage.getItem(`${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`)).toBeTruthy();

      // Trigger multiple rapid debounced broadcasts (simulating rapid typing)
      received.length = 0;
      broadcaster.broadcastDebounced();
      broadcaster.broadcastDebounced();
      broadcaster.broadcastDebounced();

      expect(received.length).toBe(0);

      // Advance time past debounce interval
      vi.advanceTimersByTime(120);

      expect(received.length).toBe(1);
      expect(received[0]?.type).toBe("DOCUMENT_UPDATE");

      broadcaster.dispose();
      receiverChannel.close();
    } finally {
      vi.useRealTimers();
    }
  });

  it("broadcaster responds to REQUEST_LATEST from a connecting preview tab", () => {
    const rawDoc = fullDocument();
    const currentDoc = canonicalDocumentSchema.parse(rawDoc);

    const receiverChannel = new MockBroadcastChannel(`dib_preview_channel_${templateId}`);
    const received: Array<{ type: string; templateId?: string; document?: unknown }> = [];
    receiverChannel.onmessage = (ev) => received.push(ev.data);

    const broadcaster = createPreviewBroadcaster(templateId, () => currentDoc);

    // Simulate preview tab connecting and requesting latest
    receiverChannel.postMessage({ type: "REQUEST_LATEST", templateId });

    expect(received.length).toBe(1);
    expect(received[0]?.type).toBe("DOCUMENT_UPDATE");
    expect(received[0]?.document).toEqual(currentDoc);

    broadcaster.dispose();
    receiverChannel.close();
  });

  it("subscribePreviewSync receives updates from storage events", () => {
    const rawDoc = fullDocument();
    const initialDoc = canonicalDocumentSchema.parse(rawDoc);

    const onUpdate = vi.fn();
    const unsubscribe = subscribePreviewSync(templateId, initialDoc, onUpdate);

    // Initial snapshot should be fallback
    const snap1 = getCachedPreviewSnapshot(templateId, initialDoc);
    expect(snap1.isLiveDraft).toBe(false);

    // Simulate storage event from editor
    const updatedDoc = {
      ...initialDoc,
      sections: [
        {
          ...initialDoc.sections[0]!,
          name: "Updated Section Name Live",
        },
        ...initialDoc.sections.slice(1),
      ],
    };

    window.localStorage.setItem(`${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`, JSON.stringify(updatedDoc));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: `${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`,
        newValue: JSON.stringify(updatedDoc),
      }),
    );

    expect(onUpdate).toHaveBeenCalled();

    const snap2 = getCachedPreviewSnapshot(templateId, initialDoc);
    expect(snap2.isLiveDraft).toBe(true);
    expect(snap2.document.sections[0]!.name).toBe("Updated Section Name Live");

    unsubscribe();
  });

  it("TemplateRealPreview live-updates UI when new document is broadcasted", () => {
    const rawDoc = fullDocument();
    const initialDoc = canonicalDocumentSchema.parse(rawDoc);

    render(
      <TemplateRealPreview
        templateId="tmpl_live_render"
        templateName="Pernikahan Megah"
        initialDocument={initialDoc}
      />,
    );

    // Verify initial badge
    const badge = screen.getByTestId("preview-live-badge");
    expect(badge).toBeInTheDocument();

    // Now simulate live update arriving from editor via BroadcastChannel
    const updatedDoc = canonicalDocumentSchema.parse(rawDoc);
    const titleEl = updatedDoc.sections[0]!.elements.find((el) => el.id === "el_title");
    if (titleEl && titleEl.type === "text") {
      titleEl.content.segments = [{ text: "Teks Baru Dari Editor" }];
    }

    const editorChannel = new MockBroadcastChannel("dib_preview_channel_tmpl_live_render");

    act(() => {
      editorChannel.postMessage({
        type: "DOCUMENT_UPDATE",
        templateId: "tmpl_live_render",
        document: updatedDoc,
        timestamp: Date.now(),
      });
    });

    // Content should now be updated in the DOM
    expect(screen.getByLabelText("Teks Baru Dari Editor")).toBeInTheDocument();
    expect(badge).toHaveTextContent("Live Terhubung");

    editorChannel.close();
  });
});
