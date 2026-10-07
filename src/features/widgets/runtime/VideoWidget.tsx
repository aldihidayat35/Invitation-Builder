"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildYouTubeEmbedUrl,
  parseAspectRatio,
  parseVideoSource,
  type VideoSourceInfo,
} from "../video-utils";
import { parseFrameImage } from "./PhotoFrameWidget";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";
import styles from "./VideoWidget.module.css";

export interface VideoWidgetProps {
  readonly url?: unknown;
  readonly sourceType?: unknown;
  readonly poster?: unknown;
  readonly caption?: unknown;
  readonly autoplayOnScroll?: unknown;
  readonly loop?: unknown;
  readonly muted?: unknown;
  readonly showControls?: unknown;
  readonly aspectRatio?: unknown;
  readonly style?: WidgetStyleProps;
}

function PlayIcon() {
  return (
    <svg className={styles.playIconSvg} viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function GoldCornerDecor({ className }: { readonly className?: string }) {
  return (
    <svg className={`${styles.goldCorner ?? ""} ${className ?? ""}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M 2 22 L 2 6 C 2 3.8 3.8 2 6 2 L 22 2" strokeWidth="1.8" />
      <path d="M 6 18 L 6 8 C 6 6.9 6.9 6 8 6 L 18 6" strokeWidth="1" opacity="0.6" />
      <circle cx="10" cy="10" r="1.5" fill="#d4af37" />
    </svg>
  );
}

export function VideoWidget({
  url,
  sourceType: _sourceType,
  poster,
  caption,
  autoplayOnScroll,
  loop = true,
  muted = true,
  showControls = true,
  aspectRatio = "16:9",
  style,
}: VideoWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Parse video source (YouTube or direct URL)
  const sourceInfo: VideoSourceInfo = useMemo(() => parseVideoSource(url), [url]);

  // Parse custom poster image (URL or asset ID)
  const posterUrl = useMemo(() => parseFrameImage(poster), [poster]);

  const captionText = typeof caption === "string" && caption.trim() ? caption.trim() : null;
  const shouldLoop = loop !== false;
  const isMuted = muted !== false;
  const displayControls = showControls !== false;
  const isAutoplayScroll = Boolean(autoplayOnScroll);

  const variant = style?.variant || "cinematic-frame";

  // IntersectionObserver for "autoplay on scroll into view"
  useEffect(() => {
    if (!isAutoplayScroll) return;
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsPlaying(true);
            if (videoRef.current) {
              videoRef.current.play().catch(() => {
                // Browser autoplay without user gesture may require muted
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  void videoRef.current.play();
                }
              });
            }
          } else {
            // When scrolled out of viewport, pause direct video to save resources
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [isAutoplayScroll]);

  // Handler when user clicks play overlay
  const handlePlayClick = () => {
    setHasInteracted(true);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play()?.catch((err) => {
        console.warn("Direct play failed, falling back to muted:", err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          void videoRef.current.play()?.catch(() => {});
        }
      });
    }
  };

  // Build iframe embed URL for YouTube
  const youtubeEmbedUrl = useMemo(() => {
    if (!sourceInfo.isYouTube || !sourceInfo.youtubeId) return null;
    return buildYouTubeEmbedUrl(sourceInfo.youtubeId, {
      autoplay: isPlaying || hasInteracted,
      loop: shouldLoop,
      muted: isMuted,
      showControls: displayControls,
    });
  }, [sourceInfo, isPlaying, hasInteracted, shouldLoop, isMuted, displayControls]);

  // Compute CSS aspect ratio helper class
  const ratioClass = useMemo(() => {
    switch (aspectRatio) {
      case "9:16":
        return styles.ratio_9_16;
      case "4:3":
        return styles.ratio_4_3;
      case "1:1":
        return styles.ratio_1_1;
      case "16:9":
      default:
        return styles.ratio_1_16_9 ?? styles.ratio_16_9;
    }
  }, [aspectRatio]);

  // Variant modifier class name
  const variantClass = useMemo(() => {
    switch (variant) {
      case "story-portrait":
        return styles.variant_story_portrait;
      case "vintage-polaroid":
        return styles.variant_vintage_polaroid;
      case "arch-luxury":
        return styles.variant_arch_luxury;
      case "minimal-glass":
        return styles.variant_minimal_glass;
      case "gold-ornament":
        return styles.variant_gold_ornament;
      case "cinematic-frame":
      default:
        return styles.variant_cinematic_frame;
    }
  }, [variant]);

  const hasMedia = sourceInfo.isYouTube || Boolean(sourceInfo.resolvedUrl);
  const showCover = !isPlaying && !hasInteracted && Boolean(posterUrl);

  return (
    <WidgetFrame
      type="video"
      style={style}
      className={`${styles.videoContainer} ${variantClass}`}
    >
      <div
        ref={containerRef}
        className={`${styles.videoFrameWrapper} ${ratioClass}`}
        data-testid="video-widget-frame"
      >
        {/* Variant 6: Gold Ornament corner decorations */}
        {variant === "gold-ornament" && (
          <>
            <GoldCornerDecor className={styles.goldCornerTL} />
            <GoldCornerDecor className={styles.goldCornerTR} />
            <GoldCornerDecor className={styles.goldCornerBR} />
            <GoldCornerDecor className={styles.goldCornerBL} />
          </>
        )}

        {/* Top Badges */}
        {sourceInfo.isYouTube && (
          <div className={`${styles.badgeTopLeft} ${styles.badgeYouTube}`}>
            <YouTubeIcon />
            <span>YouTube</span>
          </div>
        )}
        {variant === "story-portrait" && !sourceInfo.isYouTube && (
          <div className={styles.badgeTopLeft}>
            <span>✦ Video Story</span>
          </div>
        )}

        {/* 1. Empty Placeholder if no source is given */}
        {!hasMedia ? (
          <div className={styles.emptyPlaceholder} data-testid="video-empty-placeholder">
            <div className={styles.emptyIconCircle}>
              <PlayIcon />
            </div>
            <p className={styles.emptyTitle}>Video Belum Diatur</p>
            <p className={styles.emptySub}>Masukkan URL YouTube atau pilih file video</p>
          </div>
        ) : sourceInfo.isYouTube && youtubeEmbedUrl ? (
          /* 2. YouTube Iframe Embed */
          <>
            {showCover ? (
              <div
                className={styles.posterOverlay}
                style={{ backgroundImage: `url("${posterUrl}")` }}
                onClick={handlePlayClick}
                data-testid="video-poster-overlay"
              >
                <div className={styles.playButtonWrap}>
                  <button
                    type="button"
                    className={styles.playButtonCircle}
                    aria-label="Putar Video YouTube"
                    onClick={handlePlayClick}
                  >
                    <PlayIcon />
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={youtubeEmbedUrl}
                title={captionText ?? "Pemutar Video YouTube"}
                className={styles.iframePlayer}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                data-testid="youtube-iframe"
              />
            )}
          </>
        ) : (
          /* 3. HTML5 Direct Video Player */
          <>
            <video
              ref={videoRef}
              src={sourceInfo.resolvedUrl ?? undefined}
              poster={posterUrl ?? undefined}
              controls={displayControls}
              loop={shouldLoop}
              muted={isMuted}
              playsInline
              preload="auto"
              className={styles.videoPlayer}
              data-testid="html5-video-player"
            />

            {showCover && (
              <div
                className={styles.posterOverlay}
                style={{ backgroundImage: `url("${posterUrl}")` }}
                onClick={handlePlayClick}
                data-testid="video-poster-overlay"
              >
                <div className={styles.playButtonWrap}>
                  <button
                    type="button"
                    className={styles.playButtonCircle}
                    aria-label="Putar Video"
                    onClick={handlePlayClick}
                  >
                    <PlayIcon />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Story Portrait gradient footer with caption */}
        {variant === "story-portrait" && captionText && (
          <div className={styles.storyFooter}>{captionText}</div>
        )}
      </div>

      {/* Variant-specific captions */}
      {variant === "vintage-polaroid" && captionText && (
        <div className={styles.polaroidCaption}>{captionText}</div>
      )}
      {variant !== "vintage-polaroid" && variant !== "story-portrait" && captionText && (
        <div className={styles.captionBar}>{captionText}</div>
      )}
    </WidgetFrame>
  );
}
