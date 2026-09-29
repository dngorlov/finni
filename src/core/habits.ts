import type { MeterEffect } from "./economy";

/**
 * «Привычка» of a Магазин item: buying it on consecutive Игровые дни changes
 * the Счастье it gives. `grow` adds `step` per day in a row, up to `max` extra
 * (бонус за дни подряд). `fade` takes `step` per day in a row, never below `min`
 * (мороженое даёт меньше за дни подряд). Сытость never changes.
 */
export type Habit =
  | { kind: "grow"; step: number; max: number }
  | { kind: "fade"; step: number; min: number };

/**
 * Days in a row before `today` (day today−1, today−2, …) with at least one
 * purchase. Today's own purchases never count, so every purchase of the item
 * within one Игровой день gives the same Счастье.
 */
export function habitStreak(purchaseDays: Iterable<number>, today: number): number {
  const days = new Set(purchaseDays);
  let streak = 0;
  while (days.has(today - streak - 1)) streak += 1;
  return streak;
}

/** Days with a purchase of `itemId`, from Журнал rows (`kind: "purchase"`, item id, day number). */
export function purchaseDaysOf(
  entries: readonly { kind: string; itemId: string | null; dayN: number }[],
  itemId: string,
): number[] {
  return entries.filter((entry) => entry.kind === "purchase" && entry.itemId === itemId).map((entry) => entry.dayN);
}

/** Счастье one purchase gives after `streak` days in a row. `base` is the catalog value. */
export function habitMood(base: number, habit: Habit | undefined, streak: number): number {
  if (!habit) return base;
  const days = Math.max(0, streak);
  if (habit.kind === "grow") return base + Math.min(habit.max, habit.step * days);
  return Math.max(Math.min(habit.min, base), base - habit.step * days);
}

/** Days in a row after which the value stops changing: the number of segments on the bar. */
export function habitSegments(base: number, habit: Habit): number {
  if (habit.step <= 0) return 0;
  const span = habit.kind === "grow" ? habit.max : base - habit.min;
  return Math.max(0, Math.ceil(span / habit.step));
}

/** Filled segments for `streak`: never more than the bar has. */
export function habitFilled(base: number, habit: Habit, streak: number): number {
  return Math.min(Math.max(0, streak), habitSegments(base, habit));
}

/** The Счастье effect of an item: `effect` or `also`, whichever is mood. */
export function moodEffectOf(item: { effect: MeterEffect; also?: MeterEffect }): MeterEffect | null {
  if (item.effect.meter === "mood") return item.effect;
  if (item.also?.meter === "mood") return item.also;
  return null;
}

/** What the Магазин card shows for a habit item: bar segments, how many are filled, today's Счастье. */
export type HabitView = {
  kind: Habit["kind"];
  streak: number;
  segments: number;
  filled: number;
  mood: number;
};

/** Null for an item without a habit (or without Счастье). `item` is the catalog item, not `withHabit`'s copy. */
export function habitView(
  item: { effect: MeterEffect; also?: MeterEffect; habit?: Habit },
  streak: number,
): HabitView | null {
  const mood = moodEffectOf(item);
  if (!item.habit || !mood) return null;
  return {
    kind: item.habit.kind,
    streak: Math.max(0, streak),
    segments: habitSegments(mood.delta, item.habit),
    filled: habitFilled(mood.delta, item.habit, streak),
    mood: habitMood(mood.delta, item.habit, streak),
  };
}

/**
 * The item as it works today: its Счастье effect replaced by the habit value.
 * Items without a habit (or without Счастье) come back unchanged.
 */
export function withHabit<T extends { effect: MeterEffect; also?: MeterEffect; habit?: Habit }>(
  item: T,
  streak: number,
): T {
  const mood = moodEffectOf(item);
  if (!item.habit || !mood) return item;
  const delta = habitMood(mood.delta, item.habit, streak);
  if (delta === mood.delta) return item;
  const swap = (effect: MeterEffect): MeterEffect => (effect.meter === "mood" ? { ...effect, delta } : effect);
  return { ...item, effect: swap(item.effect), ...(item.also ? { also: swap(item.also) } : {}) };
}
