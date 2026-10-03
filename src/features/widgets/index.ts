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
  type CountdownState,
  type CountdownUnit,
} from "./logic";
