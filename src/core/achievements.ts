import type { Stage } from "./stages";

/** Shelf Желаемые. Both are required; the first one alone is not a Достижение. */
export const TREAT_ITEM_IDS = ["candy", "ice-cream"] as const;

/**
 * Обед, Проезд, and Лекарство bought on the same Игровой день — the Счета
 * of the day the pet is ill. One of them, or the same three on different days, does not count.
 */
export const SICK_DAY_ITEM_IDS = ["lunch", "transport", "medicine"] as const;

/** Deposits into Копилка on this many different days. One lump toward a Цель is not enough. */
export const SAVINGS_DAYS = 6;
/** Confirmed Планы. The first confirmation is not enough. */
export const PLANS_CONFIRMED = 3;
/** Closed Игровые дни. The first finished Урок closes day 1 and is not enough. */
export const DAYS_CLOSED = 10;
/** Finished Задания. The first one is not enough. */
export const LESSONS_COMPLETED = 4;
/** Days closed inside the План. */
export const DAYS_WITHIN_PLAN = 5;
/** Days whose Счета were paid. */
export const DAYS_BILLS_PAID = 7;
/**
 * Days that paid Счета, stayed inside the План, and put coins in Копилка.
 * Lands earlier than {@link DAYS_WITHIN_PLAN} and {@link DAYS_BILLS_PAID}, so one close does not finish all three.
 */
export const PERFECT_DAYS = 3;

/**
 * What the profile has done so far. Counts only grow; an earned achievement
 * is stored and is not taken away if a later day looks different.
 */
export type AchievementFacts = {
  /** Конфета and Мороженое have each been bought at least once. */
  bothTreats: boolean;
  /** Days on which Обед, Проезд, and Лекарство were all bought. */
  sickDays: number;
  /** Distinct days with a deposit into Копилка. */
  savingsDays: number;
  plansConfirmed: number;
  daysClosed: number;
  lessonsCompleted: number;
  /** Вклады whose term ended and that were paid back. */
  bankPaid: number;
  stage: Stage;
  daysWithinPlan: number;
  daysBillsPaid: number;
  perfectDays: number;
};

export type AchievementPurchase = {
  dayId: string;
  itemId: string;
  boughtAsActiveGoal: boolean;
};

export type AchievementDay = {
  withinPlan: boolean;
  mandatoryCovered: boolean;
  deposited: boolean;
};

/**
 * One Достижение per distinct habit. A single shop buy, the first Задание,
 * and the first Цель used to finish several at once: a Желаемое was also
 * «Первая покупка», the first Цель also moved Этап to Про and filled Копилка
 * past 50, and the first Урок closed the day (План, Счета, «уложился»).
 * Those ids stay in the table and are no longer listed.
 */
export const ACHIEVEMENT_RULES = [
  { id: "sweets", met: (facts: AchievementFacts) => facts.bothTreats },
  { id: "sick_day", met: (facts: AchievementFacts) => facts.sickDays >= 1 },
  { id: "piggy", met: (facts: AchievementFacts) => facts.savingsDays >= SAVINGS_DAYS },
  { id: "plans", met: (facts: AchievementFacts) => facts.plansConfirmed >= PLANS_CONFIRMED },
  { id: "ten_days", met: (facts: AchievementFacts) => facts.daysClosed >= DAYS_CLOSED },
  { id: "lessons", met: (facts: AchievementFacts) => facts.lessonsCompleted >= LESSONS_COMPLETED },
  { id: "interest", met: (facts: AchievementFacts) => facts.bankPaid >= 1 },
  { id: "kept_word", met: (facts: AchievementFacts) => facts.daysWithinPlan >= DAYS_WITHIN_PLAN },
  { id: "bills_week", met: (facts: AchievementFacts) => facts.daysBillsPaid >= DAYS_BILLS_PAID },
  { id: "steady", met: (facts: AchievementFacts) => facts.perfectDays >= PERFECT_DAYS },
  { id: "millionaire", met: (facts: AchievementFacts) => facts.stage === "millionaire" },
] as const;

export type AchievementId = (typeof ACHIEVEMENT_RULES)[number]["id"];

export function emptyAchievementFacts(over: Partial<AchievementFacts> = {}): AchievementFacts {
  return {
    bothTreats: false,
    sickDays: 0,
    savingsDays: 0,
    plansConfirmed: 0,
    daysClosed: 0,
    lessonsCompleted: 0,
    bankPaid: 0,
    stage: "novice",
    daysWithinPlan: 0,
    daysBillsPaid: 0,
    perfectDays: 0,
    ...over,
  };
}

/** Counts the profile's purchases, deposits, and closed days into {@link AchievementFacts}. */
export function achievementFactsFrom(activity: {
  purchases: readonly AchievementPurchase[];
  savingsInDayIds: readonly string[];
  plansConfirmed: number;
  daysClosed: number;
  scores: readonly AchievementDay[];
  lessonsCompleted: number;
  bankPaid: number;
  stage: Stage;
}): AchievementFacts {
  const shelf = activity.purchases.filter((row) => !row.boughtAsActiveGoal);
  const treatIds = new Set(TREAT_ITEM_IDS.filter((id) => shelf.some((row) => row.itemId === id)));
  const byDay = new Map<string, Set<string>>();
  for (const row of shelf) {
    const items = byDay.get(row.dayId) ?? new Set<string>();
    items.add(row.itemId);
    byDay.set(row.dayId, items);
  }
  let sickDays = 0;
  for (const items of byDay.values()) {
    if (SICK_DAY_ITEM_IDS.every((id) => items.has(id))) sickDays += 1;
  }
  return {
    bothTreats: treatIds.size === TREAT_ITEM_IDS.length,
    sickDays,
    savingsDays: new Set(activity.savingsInDayIds).size,
    plansConfirmed: activity.plansConfirmed,
    daysClosed: activity.daysClosed,
    lessonsCompleted: activity.lessonsCompleted,
    bankPaid: activity.bankPaid,
    stage: activity.stage,
    daysWithinPlan: activity.scores.filter((row) => row.withinPlan).length,
    daysBillsPaid: activity.scores.filter((row) => row.mandatoryCovered).length,
    perfectDays: activity.scores.filter((row) => row.withinPlan && row.mandatoryCovered && row.deposited).length,
  };
}

export function earnedAchievementIds(facts: AchievementFacts): AchievementId[] {
  return ACHIEVEMENT_RULES.filter((rule) => rule.met(facts)).map((rule) => rule.id);
}

/** Catalog order, so the reward modal and the lists agree. */
export function orderEarned<T extends { id: string }>(rows: readonly T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ACHIEVEMENT_RULES.flatMap((rule) => {
    const row = byId.get(rule.id);
    return row ? [row] : [];
  });
}
