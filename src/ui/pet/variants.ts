import { ACCESSORY_KEYS } from "../../core/accessories";

export type PetVariant = { species: string; color: string; accessory: string };

export const DEFAULT_VARIANT: PetVariant = { species: "sp1", color: "c1", accessory: "a1" };

export function variantKey(variant: PetVariant): string {
  return `${variant.species}/${variant.color}/${variant.accessory}`;
}

/**
 * Which drawn sheet stands in for a requested look. Andrei has not drawn
 * every species × color × accessory, so: the requested accessory, then the
 * same species and color with none, then the same species and color with any
 * other accessory (glasses before hat), then sp1/c1 with none.
 */
export function resolvePetVariant(requested: PetVariant, available: ReadonlySet<string>): PetVariant {
  const { species, color } = requested;
  const order = [requested.accessory, "a1", ...ACCESSORY_KEYS];
  for (const accessory of order) {
    const candidate = { species, color, accessory };
    if (available.has(variantKey(candidate))) return candidate;
  }
  return DEFAULT_VARIANT;
}
