import type { Stage } from "./stages";

/** Shop item that feeds the «Обед готов» achievement. */
export const LUNCH_ITEM_ID = "lunch";

/**
 * What the profile has done so far. Counts only grow; an earned achievement
 * is stored and is not taken away if a later day looks different.
 */
export type AchievementFacts = {
  shopBuys: number;
  lunchBuys: number;
  optionalBuys: number;
  savingsIns: number;
  savedTotal: number;
  goalsBought: number;
  customGoalsBought: number;
  plansConfirmed: number;
  daysClosed: number;
  lessonsCompleted: number;
  bankOpens: number;
  stage: Stage;
  daysWithinPlan: number;
  daysBillsPaid: number;
};

/**
 * One Достижение per distinct step. Dropped as near-duplicates (2026-09-28):
 * «Обед готов» (the first buy is Обед, so it always came with «Первая покупка»),
 * «День позади» (the first finished Урок is what closes day 1, so it always came
 * with «Первый урок»), and «Своя цель» (Своя цель is gone, ADR-0015). Rows
 * already stored under those ids stay in the table and are no longer listed.
 */
export const ACHIEVEMENT_RULES = [
  { id: "first_buy", met: (facts: AchievementFacts) => facts.shopBuys >= 1 },
  { id: "treat", met: (facts: AchievementFacts) => facts.optionalBuys >= 1 },
  { id: "first_save", met: (facts: AchievementFacts) => facts.savingsIns >= 1 },
  { id: "save_50", met: (facts: AchievementFacts) => facts.savedTotal >= 50 },
  { id: "plan", met: (facts: AchievementFacts) => facts.plansConfirmed >= 1 },
  { id: "week", met: (facts: AchievementFacts) => facts.daysClosed >= 7 },
  { id: "lesson", met: (facts: AchievementFacts) => facts.lessonsCompleted >= 1 },
  { id: "goal", met: (facts: AchievementFacts) => facts.goalsBought >= 1 },
  { id: "bank", met: (facts: AchievementFacts) => facts.bankOpens >= 1 },
  { id: "word", met: (facts: AchievementFacts) => facts.daysWithinPlan >= 1 },
  { id: "bills", met: (facts: AchievementFacts) => facts.daysBillsPaid >= 1 },
  { id: "pro", met: (facts: AchievementFacts) => facts.stage === "pro" || facts.stage === "millionaire" },
  { id: "millionaire", met: (facts: AchievementFacts) => facts.stage === "millionaire" },
] as const;

export type AchievementId = (typeof ACHIEVEMENT_RULES)[number]["id"];

export function emptyAchievementFacts(over: Partial<AchievementFacts> = {}): AchievementFacts {
  return {
    shopBuys: 0,
    lunchBuys: 0,
    optionalBuys: 0,
    savingsIns: 0,
    savedTotal: 0,
    goalsBought: 0,
    customGoalsBought: 0,
    plansConfirmed: 0,
    daysClosed: 0,
    lessonsCompleted: 0,
    bankOpens: 0,
    stage: "novice",
    daysWithinPlan: 0,
    daysBillsPaid: 0,
    ...over,
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
