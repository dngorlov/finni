import { PET_SHEETS, type PetPixels } from "./petSprites.generated";
import { resolvePetVariant, variantKey, DEFAULT_VARIANT, type PetVariant } from "./variants";

/** Keys of every sheet Andrei has drawn (`sp/c/a`). */
export const DRAWN_VARIANTS: ReadonlySet<string> = new Set(Object.keys(PET_SHEETS));

/** Palette and every frame of this look (or its stand-in). */
export function petPixels(variant: PetVariant): PetPixels {
  const resolved = resolvePetVariant(variant, DRAWN_VARIANTS);
  return (PET_SHEETS[variantKey(resolved)] ?? PET_SHEETS[variantKey(DEFAULT_VARIANT)]) as PetPixels;
}
