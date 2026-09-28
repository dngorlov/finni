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

/** Meter bounds for the Дом pose (M2 spec; not settled in ROADMAP). */
export const POSE_THRESHOLDS = {
  /** Any meter below this: sad. */
  sadBelow: 30,
  /** Both meters at or above this: happy. */
  happyFrom: 70,
} as const;

/** Pose from meters. */
export function poseFromMeters(care: number, mood: number): PetPose {
  if (care < POSE_THRESHOLDS.sadBelow || mood < POSE_THRESHOLDS.sadBelow) return "sad";
  if (care >= POSE_THRESHOLDS.happyFrom && mood >= POSE_THRESHOLDS.happyFrom) return "happy";
  return "idle";
}
