/**
 * Public entry point for `src/features/widgets` (server/editor-safe: no React).
 * Runtime components: `@/features/widgets/runtime`.
 */
export {
  WidgetRegistry,
  createWidgetRegistry,
  defineProp,
  type ResolvedWidget,
  type UnknownWidgetFallback,
  type WidgetDefinition,
  type WidgetPlaceholder,
  type WidgetPropDefinition,
} from "./registry";
export { defaultWidgetRegistry } from "./default-registry";
export {
  COUNTDOWN_WIDGET_TYPE,
  GUEST_GREETING_WIDGET_TYPE,
  MAP_WIDGET_TYPE,
  P0_WIDGETS,
  countdownWidget,
  guestGreetingWidget,
  mapWidget,
} from "./definitions";
export {
  COUNTDOWN_UNITS,
  DEFAULT_COUNTDOWN_LABELS,
  computeCountdown,
  countdownTargetInstant,
  describeProp,
  greetingParts,
  mapUrl,
  mapEmbedUrl,
  type CountdownState,
  type CountdownUnit,
} from "./logic";
export {
  GALLERY_WIDGET_TYPE,
  GIFT_WIDGET_TYPE,
  MUSIC_WIDGET_TYPE,
  P1_WIDGETS,
  PHOTO_FRAME_WIDGET_TYPE,
  RSVP_WIDGET_TYPE,
  TIMELINE_WIDGET_TYPE,
  WISHES_WIDGET_TYPE,
  COUPLE_PROFILE_WIDGET_TYPE,
  coupleProfileWidget,
  galleryWidget,
  giftWidget,
  musicWidget,
  photoFrameWidget,
  rsvpWidget,
  timelineWidget,
  wishesWidget,
} from "./definitions-p1";
export {
  getDefaultWidgetStyle,
  getGalleryPresentation,
  QUICK_COLOR_PALETTES,
  resolveWidgetStyleVariant,
  WIDGET_STYLE_VARIANTS,
  getWidgetStyleVariants,
  type GalleryPresentation,
  type QuickColorPalette,
  type WidgetVariantResolution,
  type WidgetStyleVariant,
} from "./widget-styles";
export { estimateWidgetContentHeight } from "./estimate-height";

