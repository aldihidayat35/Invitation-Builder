import type { ReactNode } from "react";
import { defaultWidgetRegistry } from "../default-registry";
import { resolveWidgetStyleVariant } from "../widget-styles";
import type { WidgetRegistry } from "../registry";
import { CountdownWidget } from "./CountdownWidget";
import { GalleryWidget } from "./GalleryWidget";
import { GiftWidget } from "./GiftWidget";
import { GuestGreetingWidget } from "./GuestGreetingWidget";
import { MapWidget } from "./MapWidget";
import { MusicWidget } from "./MusicWidget";
import { PhotoFrameWidget } from "./PhotoFrameWidget";
import { RsvpWidget } from "./RsvpWidget";
import { TimelineWidget } from "./TimelineWidget";
import { WishesWidget } from "./WishesWidget";
import { CoupleProfileWidget } from "./CoupleProfileWidget";
import { OrnamentFrameWidget } from "./OrnamentFrameWidget";
import { VideoWidget } from "./VideoWidget";
import { GifWidget } from "./GifWidget";
import styles from "./runtime.module.css";
import { WidgetFrame, type WidgetStyleProps } from "./WidgetFrame";

export interface WidgetRuntimeProps {
  readonly widgetType: string;
  /** Props with bindings already resolved to typed values (see resolveDocument). */
  readonly props: Readonly<Record<string, unknown>>;
  readonly style?: WidgetStyleProps;
  readonly registry?: WidgetRegistry;
  /** Show a visible note for unsupported widgets (preview/editor). Public pages render nothing. */
  readonly showFallback?: boolean;
}

type Renderer = (props: Readonly<Record<string, unknown>>, style?: WidgetStyleProps) => ReactNode;

/** Runtime components keyed by widget type (props are picked explicitly, never spread from stored data); the definition (schema/defaults) lives in the registry. */
const RUNTIME: Readonly<Record<string, Renderer>> = {
  map: (p, style) => (
    <MapWidget coordinate={p.coordinate} label={p.label} buttonText={p.buttonText} style={style} />
  ),
  countdown: (p, style) => (
    <CountdownWidget
      targetDateTime={p.targetDateTime}
      labels={p.labels}
      afterState={p.afterState}
      afterMessage={p.afterMessage}
      style={style}
    />
  ),
  guestGreeting: (p, style) => (
    <GuestGreetingWidget
      guestName={p.guestName}
      prefix={p.prefix}
      fallback={p.fallback}
      style={style}
    />
  ),
  rsvp: (p, style) => (
    <RsvpWidget
      title={p.title}
      enablePartySize={p.enablePartySize}
      enableMessage={p.enableMessage}
      maxParty={p.maxParty}
      deadline={p.deadline}
      style={style}
    />
  ),
  gallery: (p, style) => (
    <GalleryWidget title={p.title} layout={p.layout} items={p.items} style={style} />
  ),
  music: (p, style) => (
    <MusicWidget src={p.src} title={p.title} autoplay={p.autoplay} style={style} />
  ),
  gift: (p, style) => <GiftWidget title={p.title} accounts={p.accounts} style={style} />,
  photoFrame: (p, style) => (
    <PhotoFrameWidget
      image={p.image}
      caption={p.caption}
      fit={p.fit}
      alt={p.alt}
      style={style}
    />
  ),
  timeline: (p, style) => (
    <TimelineWidget
      title={p.title}
      subtitle={p.subtitle}
      events={p.events}
      style={style}
    />
  ),
  wishes: (p, style) => (
    <WishesWidget
      title={p.title}
      subtitle={p.subtitle}
      items={p.items}
      allowPost={p.allowPost}
      maxDisplay={p.maxDisplay}
      style={style}
    />
  ),
  coupleProfile: (p, style) => (
    <CoupleProfileWidget
      title={p.title}
      subtitle={p.subtitle}
      connector={p.connector}
      order={p.order}
      showInstagram={p.showInstagram}
      showParents={p.showParents}
      groom={p.groom}
      bride={p.bride}
      style={style}
    />
  ),
  ornamentFrame: (p, style) => (
    <OrnamentFrameWidget
      shape={typeof p.shape === "string" ? p.shape : undefined}
      innerGap={typeof p.innerGap === "number" ? p.innerGap : undefined}
      fillOpacity={typeof p.fillOpacity === "number" ? p.fillOpacity : undefined}
      image={p.image}
      imageOpacity={typeof p.imageOpacity === "number" ? p.imageOpacity : undefined}
      strokeWidth={typeof p.strokeWidth === "number" ? p.strokeWidth : undefined}
      strokeColor={typeof p.strokeColor === "string" ? p.strokeColor : undefined}
      fillColor={typeof p.fillColor === "string" ? p.fillColor : undefined}
      doubleBorder={typeof p.doubleBorder === "boolean" ? p.doubleBorder : undefined}
      animationMode={
        p.animationMode === "once" ||
        p.animationMode === "scroll" ||
        p.animationMode === "loop" ||
        p.animationMode === "none"
          ? p.animationMode
          : undefined
      }
      animationSpeed={
        p.animationSpeed === "slow" || p.animationSpeed === "normal" || p.animationSpeed === "fast"
          ? p.animationSpeed
          : undefined
      }
      style={style}
    />
  ),
  video: (p, style) => (
    <VideoWidget
      url={p.url}
      sourceType={p.sourceType}
      poster={p.poster}
      caption={p.caption}
      autoplayOnScroll={p.autoplayOnScroll}
      loop={p.loop}
      muted={p.muted}
      showControls={p.showControls}
      aspectRatio={p.aspectRatio}
      style={style}
    />
  ),
  gif: (p, style) => (
    <GifWidget
      url={p.url}
      assetId={p.assetId}
      caption={p.caption}
      fit={p.fit}
      loop={p.loop}
      alignment={p.alignment}
      style={style}
    />
  ),
};

/**
 * Renders any widget by type. An unregistered type, or a registered type with
 * no runtime component, degrades to a safe fallback and never throws (P-09, NFR-REL-002).
 */
export function WidgetRuntime({
  widgetType,
  props,
  style,
  registry = defaultWidgetRegistry,
  showFallback = false,
}: WidgetRuntimeProps) {
  const resolved = registry.resolve(widgetType);
  const render = resolved.kind === "known" ? RUNTIME[widgetType] : undefined;
  if (render) {
    const variant = resolveWidgetStyleVariant(widgetType, style?.variant).variant.id;
    return <>{render(props, { ...style, variant })}</>;
  }
  if (!showFallback) return <div data-widget-fallback={widgetType} aria-hidden="true" />;
  return (
    <WidgetFrame type="unknown" style={style} className={styles.fallbackBox}>
      <span data-testid="widget-fallback">
        {resolved.kind === "unknown" ? resolved.fallback.label : "Widget tidak tersedia"}
        {` (${widgetType})`}
      </span>
    </WidgetFrame>
  );
}
