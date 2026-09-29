import { poseFromMeters } from "../pet/keys";
import { homeStrings } from "../stringsHome";

/** Low Сытость speaks from its own pool first: food is the most useful hint. */
const HUNGRY_BELOW = 30;

/** How long a spoken line stays up. */
export const SPEECH_MS = 3500;
/** Quiet gap before the pet starts the next line on its own. */
export const QUIET_MS = 8000;
/**
 * Share of that quiet gap a hunger or sadness emoji fills.
 * The rest is split into a pause before the emoji and a pause after it,
 * so the mark never sits against a spoken line.
 */
export const MOOD_EMOJI_SHARE = 0.7;

export type SpeechMood = "hungry" | "sad" | "happy" | "idle";

export type SpeechInput = {
  care: number;
  mood: number;
};

/** Which pool the pet is speaking from. Hungry wins over the pose. */
export function speechMood(care: number, mood: number): SpeechMood {
  if (care < HUNGRY_BELOW) return "hungry";
  return poseFromMeters(care, mood);
}

const MOOD_LINES: Record<SpeechMood, readonly string[]> = {
  hungry: homeStrings.petLinesHungry,
  sad: homeStrings.petLinesSad,
  happy: homeStrings.petLinesHappy,
  idle: homeStrings.petLinesIdle,
};

/**
 * The lines the pet may say right now: its mood's pool. The first line opens
 * every visit; a tap or a quiet gap picks another from the same pool.
 */
export function speechPool(input: SpeechInput): readonly string[] {
  return MOOD_LINES[speechMood(input.care, input.mood)];
}

export type MoodEmoji = { glyph: string; label: string };

/** Hunger and sadness keep a face in the bubble while the pet is quiet. Other moods stay silent. */
export function moodEmoji(mood: SpeechMood): MoodEmoji | null {
  if (mood === "hungry") return { glyph: homeStrings.petHungryEmoji, label: homeStrings.petHungryEmojiLabel };
  if (mood === "sad") return { glyph: homeStrings.petSadEmoji, label: homeStrings.petSadEmojiLabel };
  return null;
}

/** How the quiet gap is spent: a pause, then the emoji, then a pause. */
export function quietSchedule(mood: SpeechMood): { before: number; emoji: number; after: number } {
  if (!moodEmoji(mood)) return { before: QUIET_MS, emoji: 0, after: 0 };
  const emoji = Math.round(QUIET_MS * MOOD_EMOJI_SHARE);
  const rest = QUIET_MS - emoji;
  const before = Math.floor(rest / 2);
  return { before, emoji, after: rest - before };
}

/** A different line from the pool, picked with `random`. */
export function nextSpeechLine(pool: readonly string[], current: string | null, random: () => number): string | null {
  const choices = pool.filter((line) => line !== current);
  if (choices.length === 0) return pool[0] ?? null;
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  return choices[index] ?? null;
}
