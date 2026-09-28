export { ACCESSORY_KEYS, type AccessoryKey } from "../../core/accessories";

export const SPECIES_KEYS = ["sp1", "sp2", "sp3"] as const;
/**
 * Окрас keys in the order the child sees them: зелёный (c3, the app icon's
 * colour), оранжевый (c2), серый (c1). The stored keys never change.
 */
export const COLOR_KEYS = ["c3", "c2", "c1"] as const;

export type SpeciesKey = (typeof SPECIES_KEYS)[number];
export type ColorKey = (typeof COLOR_KEYS)[number];
export type PetPose = "idle" | "happy" | "sad";

/** A new Питомец starts green, like the app icon. */
export const DEFAULT_COLOR: ColorKey = "c3";

/** Pose from meters (M2 spec; not settled in ROADMAP). */
export function poseFromMeters(care: number, mood: number): PetPose {
  if (care < 30 || mood < 30) return "sad";
  if (care >= 70 && mood >= 70) return "happy";
  return "idle";
}
