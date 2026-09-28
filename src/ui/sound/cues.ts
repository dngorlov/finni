/** Answer and mission cues. The files are original synthesis, not samples from another game. */
export type SoundCue = "correct" | "wrong" | "almost" | "complete";

/** Used when Настройки has never stored a level. Sounds start on. */
export const DEFAULT_SOUND_VOLUME = 80;

export const SOUND_VOLUME_STEP = 10;

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SOUND_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** `null` and junk mean the default. `"0"` stays muted. */
export function readSoundVolume(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === "") return DEFAULT_SOUND_VOLUME;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_SOUND_VOLUME;
  return clampVolume(parsed);
}

/** Loudness range the slider spans: 100 is full level, 1 is about 30 dB quieter. */
const VOLUME_RANGE_DB = 30;

/**
 * Slider 0–100 → player gain 0–1 on a decibel curve, so each step sounds like
 * the same change. A straight line (the first version) did almost nothing
 * above 50 and jumped near the bottom, because loudness is heard in decibels.
 */
export function gainForVolume(percent: number): number {
  const volume = clampVolume(percent);
  if (volume <= 0) return 0;
  return Math.pow(10, (-(100 - volume) / 100) * (VOLUME_RANGE_DB / 20));
}

export function stepVolume(value: number, direction: -1 | 1): number {
  return clampVolume(value + direction * SOUND_VOLUME_STEP);
}

/**
 * `good` celebrates, `bad` is the soft miss, `warn` («с ценой») is a short
 * in-between so a half-point answer is not silent and is not a fanfare.
 */
export function cueForVerdict(verdict: "good" | "warn" | "bad"): SoundCue {
  if (verdict === "good") return "correct";
  if (verdict === "warn") return "almost";
  return "wrong";
}
