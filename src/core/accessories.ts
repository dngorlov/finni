import { STAGE_CODES, type Stage } from "./stages";

/**
 * Аксессуар follows Этап. The stored key keeps the first-run encoding:
 * a1 = без аксессуара (Новичок), a2 = очки (Про), a3 = шапочка с антенной (Миллионер).
 */
export const ACCESSORY_KEYS = ["a1", "a2", "a3"] as const;
export type AccessoryKey = (typeof ACCESSORY_KEYS)[number];

/** The Этап that opens each Аксессуар. */
export const ACCESSORY_STAGE: Readonly<Record<AccessoryKey, Stage>> = {
  a1: "novice",
  a2: "pro",
  a3: "millionaire",
};

export function isAccessoryKey(value: string): value is AccessoryKey {
  return (ACCESSORY_KEYS as readonly string[]).includes(value);
}

/** 0 for none, 1 for glasses, 2 for the hat. An unknown key counts as none. */
export function accessoryRank(key: string): number {
  return isAccessoryKey(key) ? ACCESSORY_KEYS.indexOf(key) : 0;
}

export function accessoryUnlocked(key: string, stage: Stage): boolean {
  return isAccessoryKey(key) && accessoryRank(key) <= STAGE_CODES[stage];
}

/** Every Аксессуар the child may wear on this Этап, none first. */
export function unlockedAccessories(stage: Stage): AccessoryKey[] {
  return ACCESSORY_KEYS.filter((key) => accessoryUnlocked(key, stage));
}

/** The Аксессуар this Этап opened (none on Новичок). */
export function newestAccessory(stage: Stage): AccessoryKey {
  return ACCESSORY_KEYS[STAGE_CODES[stage]] ?? "a1";
}

/** A stored key the Этап does not allow yet falls back to the best one it does. */
export function clampAccessory(key: string, stage: Stage): AccessoryKey {
  if (!isAccessoryKey(key)) return "a1";
  return accessoryUnlocked(key, stage) ? key : newestAccessory(stage);
}

/**
 * The Аксессуар still waiting for its «Новый аксессуар» card, given the rank
 * the child has already been shown. Null when nothing new has opened.
 */
export function pendingAccessoryUnlock(stage: Stage, seenRank: number): AccessoryKey | null {
  const rank = STAGE_CODES[stage];
  if (rank <= 0 || rank <= seenRank) return null;
  return newestAccessory(stage);
}
