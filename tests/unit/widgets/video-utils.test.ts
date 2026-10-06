import { describe, expect, it } from "vitest";
import {
  buildYouTubeEmbedUrl,
  extractYouTubeId,
  getYouTubeThumbnail,
  parseAspectRatio,
  parseVideoSource,
} from "@/features/widgets/video-utils";

describe("Video Utilities (video-utils.ts)", () => {
  describe("extractYouTubeId", () => {
    it("extracts ID from standard watch URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&feature=shared")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from short URL (youtu.be)", () => {
      expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abc123xyz")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from YouTube Shorts URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ?feature=share")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from embed URL", () => {
      expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
      expect(extractYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("extracts ID from mobile URL", () => {
      expect(extractYouTubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("accepts a raw 11-character video ID", () => {
      expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    });

    it("returns null for non-YouTube URLs and invalid values", () => {
      expect(extractYouTubeId("https://example.com/video.mp4")).toBeNull();
      expect(extractYouTubeId("https://vimeo.com/12345678")).toBeNull();
      expect(extractYouTubeId("")).toBeNull();
      expect(extractYouTubeId(null)).toBeNull();
      expect(extractYouTubeId(undefined)).toBeNull();
      expect(extractYouTubeId(12345)).toBeNull();
    });
  });

  describe("getYouTubeThumbnail", () => {
    it("constructs HQ thumbnail URL from video ID", () => {
      expect(getYouTubeThumbnail("dQw4w9WgXcQ")).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    });
  });

  describe("buildYouTubeEmbedUrl", () => {
    it("builds privacy-friendly embed URL with loop, mute, and controls", () => {
      const url = buildYouTubeEmbedUrl("dQw4w9WgXcQ", {
        autoplay: true,
        loop: true,
        muted: true,
        showControls: true,
      });

      expect(url).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?");
      expect(url).toContain("autoplay=1");
      expect(url).toContain("mute=1");
      expect(url).toContain("loop=1");
      expect(url).toContain("playlist=dQw4w9WgXcQ");
      expect(url).toContain("controls=1");
      expect(url).toContain("playsinline=1");
    });

    it("hides controls when showControls is false", () => {
      const url = buildYouTubeEmbedUrl("dQw4w9WgXcQ", {
        showControls: false,
      });

      expect(url).toContain("controls=0");
    });
  });

  describe("parseVideoSource", () => {
    it("correctly identifies YouTube source", () => {
      const parsed = parseVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(parsed.isYouTube).toBe(true);
      expect(parsed.youtubeId).toBe("dQw4w9WgXcQ");
      expect(parsed.thumbnailUrl).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    });

    it("identifies direct video URL", () => {
      const parsed = parseVideoSource("https://cdn.example.com/wedding-teaser.mp4");
      expect(parsed.isYouTube).toBe(false);
      expect(parsed.isDirect).toBe(true);
      expect(parsed.resolvedUrl).toBe("https://cdn.example.com/wedding-teaser.mp4");
    });

    it("resolves asset ID into asset API path", () => {
      const parsed = parseVideoSource("12345678-1234-1234-1234-123456789abc");
      expect(parsed.isYouTube).toBe(false);
      expect(parsed.isDirect).toBe(true);
      expect(parsed.resolvedUrl).toBe("/api/assets/12345678-1234-1234-1234-123456789abc/file");
    });

    it("returns null resolvedUrl for empty or invalid values", () => {
      expect(parseVideoSource("").resolvedUrl).toBeNull();
      expect(parseVideoSource(null).resolvedUrl).toBeNull();
      expect(parseVideoSource(undefined).resolvedUrl).toBeNull();
    });
  });

  describe("parseAspectRatio", () => {
    it("calculates numeric ratio for various formats", () => {
      expect(parseAspectRatio("16:9")).toBeCloseTo(1.777, 2);
      expect(parseAspectRatio("9:16")).toBeCloseTo(0.5625, 2);
      expect(parseAspectRatio("4:3")).toBeCloseTo(1.333, 2);
      expect(parseAspectRatio("1:1")).toBe(1);
      expect(parseAspectRatio("unknown")).toBeCloseTo(1.777, 2);
    });
  });
});
