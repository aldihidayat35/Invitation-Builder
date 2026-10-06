/**
 * Video utility functions for YouTube embed parsing, video source validation,
 * thumbnail resolution, and aspect ratio calculations.
 */

export interface YouTubeInfo {
  readonly isYouTube: boolean;
  readonly videoId?: string;
  readonly embedUrl?: string;
  readonly thumbnailUrl?: string;
}

export interface VideoSourceInfo {
  readonly isYouTube: boolean;
  readonly youtubeId?: string;
  readonly resolvedUrl: string | null;
  readonly isDirect: boolean;
  readonly thumbnailUrl?: string;
}

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts an 11-character YouTube video ID from various standard YouTube URL formats:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/shorts/ID
 * - https://www.youtube.com/embed/ID
 * - https://m.youtube.com/watch?v=ID
 * - Raw 11-char ID
 */
export function extractYouTubeId(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Handle youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  // Handle youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch?.[1]) return shortsMatch[1];

  // Handle youtube.com/embed/<id> or youtube.com/v/<id>
  const embedMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/(?:embed|v)\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch?.[1]) return embedMatch[1];

  // Handle youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/youtube(?:-nocookie)?\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch?.[1]) return watchMatch[1];

  return null;
}

/**
 * Returns a high-quality YouTube thumbnail URL for a given video ID.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Builds an enhanced YouTube embed URL using youtube-nocookie.com,
 * configuring autoplay, looping, muted state, controls, and inline playback.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    readonly autoplay?: boolean;
    readonly loop?: boolean;
    readonly muted?: boolean;
    readonly showControls?: boolean;
  } = {},
): string {
  const params = new URLSearchParams();

  if (options.autoplay) {
    params.set("autoplay", "1");
  }

  // Modern browsers require audio to be muted for autoplay to proceed
  if (options.muted || options.autoplay) {
    params.set("mute", "1");
  }

  if (options.loop) {
    params.set("loop", "1");
    // YouTube embed requires `playlist` to equal `videoId` for single-video looping
    params.set("playlist", videoId);
  }

  if (options.showControls === false) {
    params.set("controls", "0");
  } else {
    params.set("controls", "1");
  }

  params.set("enablejsapi", "1");
  params.set("playsinline", "1");
  params.set("rel", "0");
  params.set("modestbranding", "1");

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

const ASSET_ID_REGEX = /^[0-9a-f-]{36}$/i;
const SAFE_VIDEO_PREFIX = /^(https?:\/\/|\/|data:video\/|blob:)/i;

/**
 * Resolves a raw URL/object prop into parsed video source info.
 */
export function parseVideoSource(raw: unknown): VideoSourceInfo {
  let urlString: string | null = null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      if (ASSET_ID_REGEX.test(trimmed)) {
        urlString = `/api/assets/${trimmed}/file`;
      } else {
        urlString = trimmed;
      }
    }
  } else if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>;
    if (typeof rec.assetId === "string" && ASSET_ID_REGEX.test(rec.assetId)) {
      urlString = `/api/assets/${rec.assetId}/file`;
    } else if (typeof rec.src === "string" && rec.src.trim()) {
      urlString = rec.src.trim();
    } else if (typeof rec.url === "string" && rec.url.trim()) {
      urlString = rec.url.trim();
    }
  }

  if (!urlString) {
    return {
      isYouTube: false,
      resolvedUrl: null,
      isDirect: false,
    };
  }

  const ytId = extractYouTubeId(urlString);
  if (ytId) {
    return {
      isYouTube: true,
      youtubeId: ytId,
      resolvedUrl: urlString,
      isDirect: false,
      thumbnailUrl: getYouTubeThumbnail(ytId),
    };
  }

  const isSafe = SAFE_VIDEO_PREFIX.test(urlString);
  return {
    isYouTube: false,
    resolvedUrl: isSafe ? urlString : null,
    isDirect: isSafe,
  };
}

/**
 * Computes numeric aspect ratio (width / height) from aspect ratio string.
 */
export function parseAspectRatio(ratio: unknown): number {
  switch (ratio) {
    case "9:16":
      return 9 / 16;
    case "4:3":
      return 4 / 3;
    case "1:1":
      return 1;
    case "16:9":
    default:
      return 16 / 9;
  }
}
