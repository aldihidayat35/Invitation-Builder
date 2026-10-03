import { createWidgetRegistry, type WidgetRegistry } from "./registry";
import { P0_WIDGETS } from "./definitions";
import { P1_WIDGETS } from "./definitions-p1";

/**
 * Registry used by server-side validation/publishing, the editor palette/inspector
 * and the runtime. Unknown widget types stay reported as `unknown_widget_type`
 * (a publish blocker) and render a safe fallback instead of crashing.
 */
export const defaultWidgetRegistry: WidgetRegistry = createWidgetRegistry([
  ...P0_WIDGETS,
  ...P1_WIDGETS,
]);
