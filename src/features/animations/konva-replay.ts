/**
 * Konva Animation Replay Adapter (FR-ANM-006, AC-07, AC-08).
 *
 * Drives visual preview/replay of animations directly on canvas nodes
 * without touching the persisted document.
 */
import gsap from "gsap";
import type Konva from "konva";
import type { AnimationTrack } from "@/lib/schema";
import { animationPresetRegistry } from "./registry";

export function replayKonvaNode(
  node: Konva.Node,
  track: AnimationTrack,
  onComplete?: () => void,
): () => void {
  const layer = node.getLayer();
  const origOpacity = node.opacity();
  const origX = node.x();
  const origY = node.y();
  const origRotation = node.rotation();
  const origScaleX = node.scaleX();
  const origScaleY = node.scaleY();

  const preset = animationPresetRegistry.get(track.presetId) ?? animationPresetRegistry.get("fadeIn")!;
  const fromProps = preset.keyframes.from;

  // Apply initial relative offsets from keyframes
  if (fromProps.opacity !== undefined) node.opacity(fromProps.opacity);
  if (fromProps.x !== undefined) node.x(origX + fromProps.x);
  if (fromProps.y !== undefined) node.y(origY + fromProps.y);
  if (fromProps.rotation !== undefined) node.rotation(origRotation + fromProps.rotation);
  if (fromProps.scale !== undefined) {
    node.scaleX(origScaleX * fromProps.scale);
    node.scaleY(origScaleY * fromProps.scale);
  }
  layer?.batchDraw();

  const tweenObj = {
    opacity: node.opacity(),
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
  };

  const tween = gsap.to(tweenObj, {
    opacity: origOpacity,
    x: origX,
    y: origY,
    rotation: origRotation,
    scaleX: origScaleX,
    scaleY: origScaleY,
    duration: Math.max(0.1, track.durationMs / 1000),
    delay: track.delayMs / 1000,
    ease: track.easing,
    onUpdate: () => {
      node.opacity(tweenObj.opacity);
      node.x(tweenObj.x);
      node.y(tweenObj.y);
      node.rotation(tweenObj.rotation);
      node.scaleX(tweenObj.scaleX);
      node.scaleY(tweenObj.scaleY);
      layer?.batchDraw();
    },
    onComplete: () => {
      node.opacity(origOpacity);
      node.x(origX);
      node.y(origY);
      node.rotation(origRotation);
      node.scaleX(origScaleX);
      node.scaleY(origScaleY);
      layer?.batchDraw();
      onComplete?.();
    },
  });

  return () => {
    tween.kill();
    node.opacity(origOpacity);
    node.x(origX);
    node.y(origY);
    node.rotation(origRotation);
    node.scaleX(origScaleX);
    node.scaleY(origScaleY);
    layer?.batchDraw();
  };
}
