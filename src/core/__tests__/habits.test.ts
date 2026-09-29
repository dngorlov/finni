import type { CatalogItem } from "../economy";
import {
  habitFilled,
  habitMood,
  habitSegments,
  habitStreak,
  habitView,
  purchaseDaysOf,
  withHabit,
  type Habit,
} from "../habits";

const grow: Habit = { kind: "grow", step: 1, max: 3 };
const fade: Habit = { kind: "fade", step: 1, min: 1 };

describe("habitStreak", () => {
  it("counts earlier days in a row and ignores today", () => {
    expect(habitStreak([], 5)).toBe(0);
    expect(habitStreak([5], 5)).toBe(0);
    expect(habitStreak([4], 5)).toBe(1);
    expect(habitStreak([2, 3, 4, 5], 5)).toBe(3);
    expect(habitStreak([4, 4, 3], 5)).toBe(2);
  });

  it("starts over after a day without a purchase", () => {
    // Day 3 skipped: only day 4 counts for day 5.
    expect(habitStreak([1, 2, 4], 5)).toBe(1);
    // Yesterday skipped: nothing counts.
    expect(habitStreak([1, 2, 3], 5)).toBe(0);
  });
});

describe("purchaseDaysOf", () => {
  it("reads purchase rows of one item from Журнал", () => {
    const journal = [
      { kind: "purchase", itemId: "vitamins", dayN: 3 },
      { kind: "purchase", itemId: "soup", dayN: 3 },
      { kind: "task_reward", itemId: null, dayN: 2 },
      { kind: "purchase", itemId: "vitamins", dayN: 1 },
    ];
    expect(purchaseDaysOf(journal, "vitamins")).toEqual([3, 1]);
  });
});

describe("habitMood", () => {
  it("grows by one a day and stops at base + max", () => {
    expect([0, 1, 2, 3, 4, 10].map((streak) => habitMood(2, grow, streak))).toEqual([2, 3, 4, 5, 5, 5]);
  });

  it("fades by one a day and never goes below min", () => {
    expect([0, 1, 2, 3, 4, 5, 10].map((streak) => habitMood(5, fade, streak))).toEqual([5, 4, 3, 2, 1, 1, 1]);
  });

  it("leaves an item without a habit alone", () => {
    expect(habitMood(7, undefined, 4)).toBe(7);
  });
});

describe("habit bar", () => {
  it("has one segment per day that still changes the value", () => {
    expect(habitSegments(2, grow)).toBe(3);
    expect(habitSegments(5, fade)).toBe(4);
    expect([0, 2, 3, 9].map((streak) => habitFilled(2, grow, streak))).toEqual([0, 2, 3, 3]);
    expect([0, 2, 4, 9].map((streak) => habitFilled(5, fade, streak))).toEqual([0, 2, 4, 4]);
  });
});

describe("withHabit and habitView", () => {
  const vitamins: CatalogItem = {
    id: "vitamins",
    kind: "mandatory",
    price: 5,
    effect: { meter: "care", delta: 5 },
    also: { meter: "mood", delta: 2 },
    habit: grow,
  };
  const iceCream: CatalogItem = {
    id: "ice-cream",
    kind: "optional",
    price: 4,
    effect: { meter: "care", delta: 1 },
    also: { meter: "mood", delta: 5 },
    habit: fade,
  };

  it("витамины: +2 Счастье, +1 за день подряд, до +5; Сытость +5 always", () => {
    expect(withHabit(vitamins, 0)).toBe(vitamins);
    expect(withHabit(vitamins, 2).also).toEqual({ meter: "mood", delta: 4 });
    expect(withHabit(vitamins, 7).also).toEqual({ meter: "mood", delta: 5 });
    expect(withHabit(vitamins, 7).effect).toEqual({ meter: "care", delta: 5 });
    expect(habitView(vitamins, 2)).toEqual({ kind: "grow", streak: 2, segments: 3, filled: 2, mood: 4 });
  });

  it("мороженое: +5 Счастье, −1 за день подряд, не ниже +1; Сытость +1 always", () => {
    expect(withHabit(iceCream, 1).also).toEqual({ meter: "mood", delta: 4 });
    expect(withHabit(iceCream, 9).also).toEqual({ meter: "mood", delta: 1 });
    expect(withHabit(iceCream, 9).effect).toEqual({ meter: "care", delta: 1 });
    expect(habitView(iceCream, 9)).toEqual({ kind: "fade", streak: 9, segments: 4, filled: 4, mood: 1 });
  });

  it("gives other items no habit", () => {
    const soup: CatalogItem = { id: "soup", kind: "mandatory", price: 8, effect: { meter: "care", delta: 12 } };
    expect(habitView(soup, 3)).toBeNull();
    expect(withHabit(soup, 3)).toBe(soup);
  });
});
