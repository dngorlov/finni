import type { ImageSourcePropType } from "react-native";
import { PET_SHEETS, type PetSheet } from "./petSprites.generated";
import { resolvePetVariant, variantKey, DEFAULT_VARIANT, type PetVariant } from "./variants";

/** Keys of every sheet Andrei has drawn (`sp/c/a`). */
export const DRAWN_VARIANTS: ReadonlySet<string> = new Set(Object.keys(PET_SHEETS));

function sheetFor(variant: PetVariant): PetSheet {
  const resolved = resolvePetVariant(variant, DRAWN_VARIANTS);
  return (PET_SHEETS[variantKey(resolved)] ?? PET_SHEETS[variantKey(DEFAULT_VARIANT)]) as PetSheet;
}

/** Every animation of this look (or its stand-in), upscaled ×8. */
export function petAtlasSource(variant: PetVariant): ImageSourcePropType {
  return sheetFor(variant).atlas;
}

/** The three still poses of this look (or its stand-in). */
export function petPosesSource(variant: PetVariant): ImageSourcePropType {
  return sheetFor(variant).poses;
}
