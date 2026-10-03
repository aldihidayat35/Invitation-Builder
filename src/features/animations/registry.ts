/**
 * Central Animation Preset Registry (PRD §12, P-09, FR-ANM-001).
 *
 * Provides safe extensibility without modifying existing animation schemas
 * or runtime switches.
 */
import type { Element } from "@/lib/schema";
import { ALL_PRESETS } from "./definitions";
import type { AnimationCategory, AnimationPreset } from "./types";

export class AnimationPresetRegistry {
  private readonly presets = new Map<string, AnimationPreset>();

  constructor(initialPresets: readonly AnimationPreset[] = ALL_PRESETS) {
    for (const preset of initialPresets) {
      this.register(preset);
    }
  }

  register(preset: AnimationPreset): void {
    if (this.presets.has(preset.id)) {
      throw new Error(`Animation preset "${preset.id}" is already registered.`);
    }
    this.presets.set(preset.id, preset);
  }

  get(id: string): AnimationPreset | undefined {
    return this.presets.get(id);
  }

  has(id: string): boolean {
    return this.presets.has(id);
  }

  list(category?: AnimationCategory): readonly AnimationPreset[] {
    const all = Array.from(this.presets.values());
    if (!category) return all;
    return all.filter((p) => p.category === category);
  }

  listForElement(elementType: Element["type"], category?: AnimationCategory): readonly AnimationPreset[] {
    const list = this.list(category);
    return list.filter((p) => p.applicableElements.includes(elementType));
  }

  validate(presetId: string): boolean {
    return this.presets.has(presetId);
  }
}

export const animationPresetRegistry = new AnimationPresetRegistry();
