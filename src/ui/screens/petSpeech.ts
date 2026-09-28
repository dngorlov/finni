import { poseFromMeters } from "../pet/keys";
import { homeStrings } from "../stringsHome";

/** Low Сытость speaks from its own pool first: food is the most useful hint. */
const HUNGRY_BELOW = 30;

export type SpeechMood = "hungry" | "sad" | "happy" | "idle";

export type SpeechInput = {
  care: number;
  mood: number;
  goalName: string;
  accumulated: number;
  cost: number;
  /** Копилка is open, so the child can pick a Цель. */
  canPickGoal: boolean;
  /** Local hour, 0–23. */
  hour: number;
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

function timeLine(hour: number): string {
  if (hour >= 5 && hour < 12) return homeStrings.petLineMorning;
  if (hour >= 12 && hour < 17) return homeStrings.petLineDay;
  if (hour >= 17 && hour < 22) return homeStrings.petLineEvening;
  return homeStrings.petLineNight;
}

function goalLine(input: SpeechInput): string | null {
  if (!input.goalName || input.cost <= 0) return input.canPickGoal ? homeStrings.petLinePickGoal : null;
  const left = input.cost - input.accumulated;
  if (left <= 0) return homeStrings.petLineGoalReady;
  if (input.accumulated <= 0) return homeStrings.petLineGoalStart(input.goalName);
  if (input.accumulated * 2 >= input.cost) return homeStrings.petLineGoalHalf;
  return homeStrings.petLineGoalLeft(left);
}

/**
 * Everything the pet may say right now: its mood's lines first (the first one
 * opens every visit), then its Цель, the time of day, and kind any-mood lines.
 * Never a scolding line.
 */
export function speechPool(input: SpeechInput): readonly string[] {
  const goal = goalLine(input);
  const lines = [
    ...MOOD_LINES[speechMood(input.care, input.mood)],
    ...(goal ? [goal] : []),
    timeLine(input.hour),
    ...homeStrings.petLinesAny,
  ];
  return [...new Set(lines)];
}

/** A different line from the pool, picked with `random`. */
export function nextSpeechLine(pool: readonly string[], current: string | null, random: () => number): string | null {
  const choices = pool.filter((line) => line !== current);
  if (choices.length === 0) return pool[0] ?? null;
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
  return choices[index] ?? null;
}
