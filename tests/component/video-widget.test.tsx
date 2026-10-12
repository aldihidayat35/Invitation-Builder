import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createEmptyDocument, validateDocumentSemantics } from "@/lib/schema";
import {
  defaultWidgetRegistry,
  getWidgetStyleVariants,
  WIDGET_STYLE_VARIANTS,
} from "@/features/widgets";
import { parseVideoSource } from "@/features/widgets/video-utils";
import { VideoWidget } from "@/features/widgets/runtime/VideoWidget";
import { WidgetRuntime } from "@/features/widgets/runtime";

describe("Video Widget (FR-WDG-VIDEO: YouTube, Direct Upload, Loop, Scroll Autoplay & 6 Models)", () => {
  it("is registered in defaultWidgetRegistry with correct label and default frame", () => {
    const resolved = defaultWidgetRegistry.resolve("video");
    expect(resolved.kind).toBe("known");
    if (resolved.kind === "known") {
      expect(resolved.definition.label).toBe("Video");
      expect(resolved.definition.hidden).toBeFalsy();
      expect(resolved.definition.defaultFrame).toEqual({ w: 326, h: 220 });
      expect(resolved.definition.defaultProps).toMatchObject({
        sourceType: "youtube",
        loop: true,
        muted: true,
        showControls: true,
        aspectRatio: "16:9",
      });

      const visibleWidgets = defaultWidgetRegistry.list().filter((w) => !w.hidden);
      expect(visibleWidgets.some((w) => w.type === "video")).toBe(true);
    }
  });

  it("provides at least 6 distinct design style models/variants", () => {
    const variants = getWidgetStyleVariants("video");
    expect(variants.length).toBeGreaterThanOrEqual(6);

    const variantIds = variants.map((v) => v.id);
    expect(variantIds).toContain("cinematic-frame");
    expect(variantIds).toContain("story-portrait");
    expect(variantIds).toContain("vintage-polaroid");
    expect(variantIds).toContain("arch-luxury");
    expect(variantIds).toContain("minimal-glass");
    expect(variantIds).toContain("gold-ornament");

    expect(WIDGET_STYLE_VARIANTS.video).toBeDefined();
  });

  it("renders empty placeholder when no video source is provided", () => {
    render(<VideoWidget url="" />);
    expect(screen.getByTestId("video-empty-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Video Belum Diatur")).toBeInTheDocument();
  });

  it("renders YouTube iframe when YouTube URL is provided", () => {
    render(<VideoWidget url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />);
    const iframe = screen.getByTestId("youtube-iframe") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(iframe.src).toContain("loop=1");
    expect(iframe.src).toContain("playlist=dQw4w9WgXcQ");
  });

  it("renders HTML5 <video> tag when direct video URL is provided", () => {
    render(
      <VideoWidget
        url="https://example.com/invitation.mp4"
        loop={true}
        muted={true}
        showControls={true}
      />,
    );
    const video = screen.getByTestId("html5-video-player") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.src).toBe("https://example.com/invitation.mp4");
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.controls).toBe(true);
  });

  it("renders poster cover overlay and dismisses on user interaction", () => {
    render(
      <VideoWidget
        url="https://example.com/invitation.mp4"
        poster="https://example.com/cover.jpg"
      />,
    );

    const overlay = screen.getByTestId("video-poster-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay.style.backgroundImage).toContain("https://example.com/cover.jpg");

    // Click to play
    fireEvent.click(overlay);

    // Overlay is dismissed
    expect(screen.queryByTestId("video-poster-overlay")).not.toBeInTheDocument();
  });

  it("renders each of the 6 design variants without crashing", () => {
    const variants = [
      "cinematic-frame",
      "story-portrait",
      "vintage-polaroid",
      "arch-luxury",
      "minimal-glass",
      "gold-ornament",
    ];

    for (const variant of variants) {
      const { container, unmount } = render(
        <VideoWidget
          url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          caption="Our Wedding Journey"
          style={{ variant }}
        />,
      );

      expect(container.querySelector("[data-widget='video']")).toBeInTheDocument();
      expect(screen.getByText("Our Wedding Journey")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders through WidgetRuntime generic dispatcher", () => {
    render(
      <WidgetRuntime
        widgetType="video"
        props={{
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          caption: "Video Bahagia",
          aspectRatio: "16:9",
          loop: true,
        }}
        style={{ variant: "cinematic-frame" }}
      />,
    );

    expect(screen.getByTestId("youtube-iframe")).toBeInTheDocument();
    expect(screen.getByText("Video Bahagia")).toBeInTheDocument();
  });

  it("resolves dynamic bound variable to default preset URL and renders video without showing 'Video Belum Diatur'", () => {
    const mockVariables = [
      {
        key: "video.url",
        default: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    ];

    // 1. parseVideoSource resolves default preset URL when bound to variable
    const sourceInfo = parseVideoSource({ bind: "video.url" }, mockVariables);
    expect(sourceInfo.isYouTube).toBe(true);
    expect(sourceInfo.youtubeId).toBe("dQw4w9WgXcQ");
    expect(sourceInfo.resolvedUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // 2. parseVideoSource uses fallback if provided in binding object
    const fallbackSourceInfo = parseVideoSource({
      bind: "video.custom",
      fallback: "https://youtu.be/dQw4w9WgXcQ",
    });
    expect(fallbackSourceInfo.isYouTube).toBe(true);
    expect(fallbackSourceInfo.youtubeId).toBe("dQw4w9WgXcQ");

    // 3. VideoWidget renders YouTube iframe automatically from variable default
    const { unmount } = render(
      <VideoWidget
        url={{ bind: "video.url" }}
        variables={mockVariables}
      />,
    );

    expect(screen.queryByTestId("video-empty-placeholder")).not.toBeInTheDocument();
    expect(screen.getByTestId("youtube-iframe")).toBeInTheDocument();
    unmount();

    // 4. VideoWidget with fallback renders without error
    render(
      <VideoWidget
        url={{ bind: "video.custom", fallback: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }}
      />,
    );
    expect(screen.queryByTestId("video-empty-placeholder")).not.toBeInTheDocument();
    expect(screen.getByTestId("youtube-iframe")).toBeInTheDocument();
  });

  it("validates sourceType: 'variable' in document semantics without schema issues", () => {
    const baseDoc = createEmptyDocument();
    const doc = {
      ...baseDoc,
      variables: [
        {
          key: "custom.vidioYoutube",
          type: "url" as const,
          label: "Vidio YouTube",
          default: "https://youtu.be/P6lZQS3Odc8",
          required: false,
        },
      ],
      sections: [
        {
          id: "sec-1",
          visible: true,
          baseHeight: 500,
          overflow: "hidden" as const,
          background: { fit: "cover" as const },
          elements: [
            {
              id: "el-video-1",
              type: "widget" as const,
              name: "Video",
              visible: true,
              locked: false,
              frame: { x: 0, y: 0, w: 326, h: 220, rotation: 0 },
              widgetType: "video",
              widgetVersion: 1,
              style: { variant: "cinematic-frame" },
              props: {
                sourceType: "variable",
                url: { bind: "custom.vidioYoutube", fallback: "https://youtu.be/P6lZQS3Odc8" },
                autoplayOnScroll: false,
                loop: true,
                muted: true,
                showControls: true,
                aspectRatio: "16:9",
                caption: "",
              },
            },
          ],
        },
      ],
    };

    const issues = validateDocumentSemantics(doc, { widgets: defaultWidgetRegistry });
    expect(issues.filter((i) => i.path.includes("sourceType"))).toEqual([]);
    expect(issues).toEqual([]);
  });
});
