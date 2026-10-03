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

  const preset =
    animationPresetRegistry.get(track.presetId) ?? animationPresetRegistry.get("fadeIn")!;
  const fromProps = preset.keyframes.from;
  const toProps = preset.keyframes.to;

  const startX = origX + (fromProps.x ?? 0);
  const startY = origY + (fromProps.y ?? 0);
  const startRot = origRotation + (fromProps.rotation ?? 0);
  const startScaleX = origScaleX * (fromProps.scaleX ?? fromProps.scale ?? 1);
  const startScaleY = origScaleY * (fromProps.scaleY ?? fromProps.scale ?? 1);
  const startOpacity = fromProps.opacity !== undefined ? fromProps.opacity : origOpacity;

  const targetX = origX + (toProps.x ?? 0);
  const targetY = origY + (toProps.y ?? 0);
  const targetRot = origRotation + (toProps.rotation ?? 0);
  const targetScaleX = origScaleX * (toProps.scaleX ?? toProps.scale ?? 1);
  const targetScaleY = origScaleY * (toProps.scaleY ?? toProps.scale ?? 1);
  const targetOpacity = toProps.opacity !== undefined ? toProps.opacity : origOpacity;

  // Apply initial relative offsets from keyframes
  node.opacity(startOpacity);
  node.x(startX);
  node.y(startY);
  node.rotation(startRot);
  node.scaleX(startScaleX);
  node.scaleY(startScaleY);
  layer?.batchDraw();

  const tweenObj = {
    opacity: startOpacity,
    x: startX,
    y: startY,
    rotation: startRot,
    scaleX: startScaleX,
    scaleY: startScaleY,
  };

  const tween = gsap.to(tweenObj, {
    opacity: targetOpacity,
    x: targetX,
    y: targetY,
    rotation: targetRot,
    scaleX: targetScaleX,
    scaleY: targetScaleY,
    duration: Math.max(0.1, track.durationMs / 1000),
    delay: track.delayMs / 1000,
    ease: track.easing,
    repeat:
      track.repeat !== 0
        ? track.repeat === -1
          ? 2
          : Math.min(2, track.repeat)
        : preset.loop
          ? 2
          : 0,
    yoyo: track.yoyo ?? preset.yoyo ?? false,
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
