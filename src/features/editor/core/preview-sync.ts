import type { CanonicalDocument } from "@/lib/schema";
import { canonicalDocumentSchema } from "@/lib/schema";

export const PREVIEW_CHANNEL_PREFIX = "dib_preview_channel_";
export const PREVIEW_STORAGE_DOC_PREFIX = "dib_preview_doc_";
export const PREVIEW_STORAGE_TIME_PREFIX = "dib_preview_time_";

export interface PreviewUpdateMessage {
  readonly type: "DOCUMENT_UPDATE";
  readonly templateId: string;
  readonly document: CanonicalDocument;
  readonly timestamp: number;
}

export interface PreviewRequestMessage {
  readonly type: "REQUEST_LATEST";
  readonly templateId: string;
}

export type PreviewSyncMessage = PreviewUpdateMessage | PreviewRequestMessage;

export interface PreviewStateSnapshot {
  readonly raw: string | null;
  readonly document: CanonicalDocument;
  readonly isLiveDraft: boolean;
  readonly lastUpdated: number | null;
}

function getBroadcastChannelClass(): typeof BroadcastChannel | undefined {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    return window.BroadcastChannel;
  }
  if (typeof globalThis !== "undefined" && "BroadcastChannel" in globalThis) {
    return globalThis.BroadcastChannel;
  }
  return undefined;
}

/**
 * Creates a broadcaster in the editor to send document updates to preview tabs.
 * Uses BroadcastChannel for instant zero-latency cross-tab sync and syncs to localStorage.
 */
export function createPreviewBroadcaster(
  templateId: string,
  getDoc: () => CanonicalDocument,
  debounceMs = 120,
) {
  const BC = getBroadcastChannelClass();
  let channel: BroadcastChannel | null = null;
  if (BC) {
    try {
      channel = new BC(`${PREVIEW_CHANNEL_PREFIX}${templateId}`);
    } catch {
      channel = null;
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  function broadcastNow() {
    const doc = getDoc();
    const now = Date.now();

    // 1. Broadcast via BroadcastChannel
    if (channel) {
      try {
        const msg: PreviewUpdateMessage = {
          type: "DOCUMENT_UPDATE",
          templateId,
          document: doc,
          timestamp: now,
        };
        channel.postMessage(msg);
      } catch {
        // ignore channel errors
      }
    }

    // 2. Persist to localStorage for fallback and new tabs
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`,
          JSON.stringify(doc),
        );
        window.localStorage.setItem(
          `${PREVIEW_STORAGE_TIME_PREFIX}${templateId}`,
          String(now),
        );
      } catch {
        // ignore quota errors
      }
    }
  }

  function broadcastDebounced() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      broadcastNow();
    }, debounceMs);
  }

  // Respond immediately if a preview tab asks for latest document
  if (channel) {
    channel.onmessage = (event: MessageEvent<PreviewSyncMessage>) => {
      if (event.data?.type === "REQUEST_LATEST" && event.data.templateId === templateId) {
        broadcastNow();
      }
    };
  }

  return {
    broadcastNow,
    broadcastDebounced,
    dispose() {
      if (timer) clearTimeout(timer);
      if (channel) {
        channel.close();
      }
    },
  };
}

// Memory cache for the preview receiver
const previewSnapshotCache = new Map<string, PreviewStateSnapshot>();

export function clearPreviewSnapshotCache() {
  previewSnapshotCache.clear();
}

export function getCachedPreviewSnapshot(
  templateId: string,
  fallbackDoc: CanonicalDocument,
): PreviewStateSnapshot {
  const cached = previewSnapshotCache.get(templateId);
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined") {
    return {
      raw: null,
      document: fallbackDoc,
      isLiveDraft: false,
      lastUpdated: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(`${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`);
    const timeRaw = window.localStorage.getItem(`${PREVIEW_STORAGE_TIME_PREFIX}${templateId}`);
    const lastUpdated = timeRaw ? Number(timeRaw) : null;

    if (raw) {
      const parsed = canonicalDocumentSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        const snap: PreviewStateSnapshot = {
          raw,
          document: parsed.data,
          isLiveDraft: true,
          lastUpdated: Number.isFinite(lastUpdated) ? lastUpdated : Date.now(),
        };
        previewSnapshotCache.set(templateId, snap);
        return snap;
      }
    }
  } catch {
    // ignore
  }

  const fallback: PreviewStateSnapshot = {
    raw: null,
    document: fallbackDoc,
    isLiveDraft: false,
    lastUpdated: null,
  };
  previewSnapshotCache.set(templateId, fallback);
  return fallback;
}

/**
 * Subscribes the preview page to live updates from the editor via BroadcastChannel and storage events.
 */
export function subscribePreviewSync(
  templateId: string,
  fallbackDoc: CanonicalDocument,
  callback: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const BC = getBroadcastChannelClass();
  let channel: BroadcastChannel | null = null;
  if (BC) {
    try {
      channel = new BC(`${PREVIEW_CHANNEL_PREFIX}${templateId}`);
    } catch {
      channel = null;
    }
  }

  // Handle incoming BroadcastChannel updates
  if (channel) {
    channel.onmessage = (event: MessageEvent<PreviewSyncMessage>) => {
      const data = event.data;
      if (data?.type === "DOCUMENT_UPDATE" && data.templateId === templateId) {
        const snap: PreviewStateSnapshot = {
          raw: JSON.stringify(data.document),
          document: data.document,
          isLiveDraft: true,
          lastUpdated: data.timestamp,
        };
        previewSnapshotCache.set(templateId, snap);
        callback();
      }
    };

    // Request latest document immediately on connect
    try {
      channel.postMessage({
        type: "REQUEST_LATEST",
        templateId,
      } as PreviewRequestMessage);
    } catch {
      // ignore
    }
  }

  // Fallback: storage event listener for cross-tab updates via localStorage
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === `${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`) {
      const raw = window.localStorage.getItem(`${PREVIEW_STORAGE_DOC_PREFIX}${templateId}`);
      if (raw) {
        try {
          const parsed = canonicalDocumentSchema.safeParse(JSON.parse(raw));
          if (parsed.success) {
            const timeRaw = window.localStorage.getItem(`${PREVIEW_STORAGE_TIME_PREFIX}${templateId}`);
            const snap: PreviewStateSnapshot = {
              raw,
              document: parsed.data,
              isLiveDraft: true,
              lastUpdated: timeRaw ? Number(timeRaw) : Date.now(),
            };
            previewSnapshotCache.set(templateId, snap);
            callback();
          }
        } catch {
          // ignore parse error
        }
      }
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    if (channel) {
      channel.close();
    }
    window.removeEventListener("storage", handleStorage);
  };
}
