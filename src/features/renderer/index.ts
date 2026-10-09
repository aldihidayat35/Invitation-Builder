/**
 * Public renderer module (P-04, PRD §13).
 * Shared by preview and public runtime. MUST NOT import Konva or editor
 * modules — enforced by eslint `no-restricted-imports`.
 */
export { RendererViewport } from "./components/RendererViewport";
export type { RendererViewportProps } from "./components/RendererViewport";
export type { RuntimeMode } from "./types";
export { PublicImage } from "./components/PublicImage";
export type { PublicImageProps } from "./components/PublicImage";
export { AnimatedElement } from "./components/AnimatedElement";
export type { AnimatedElementProps } from "./components/AnimatedElement";
export { DocumentRenderer } from "./components/DocumentRenderer";
export type { DocumentRendererProps } from "./components/DocumentRenderer";
export {
  OpeningCoverCanvas,
  type OpeningCoverCanvasProps,
} from "./components/opening";
export {
  GlobalBacksoundPlayer,
  type GlobalBacksoundPlayerProps,
} from "./components/GlobalBacksoundPlayer";

