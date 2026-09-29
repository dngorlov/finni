/**
 * Every engine constant in one place (ROADMAP §10): tuning happens here or in
 * assets/content — never scattered across modules.
 */
export const ECONOMY = {
  /** Стартовый бюджет: granted once at profile creation (§2.1). */
  startingBudget: 30,
  /**
   * Unscored correction Задания (`taskRewardDue`). A scored mission pays up to
   * its own `reward` in tasks.json: a pinned Урок is 30 or 35 (the old daily
   * stipend folded into the lesson that ends the day), a mini-game is 10 or 15.
   */
  taskReward: 10,
} as const;

export const METERS = {
  min: 0,
  max: 100,
  /** Initial meter values at profile creation (not settled in ROADMAP; midpoint chosen). */
  initialCare: 50,
  initialMood: 50,
  /** Сытость taken at the end of every Игровой день. A purchase adds its own gain on top and does not cancel this. */
  dailyCareDrop: 15,
  /** Счастье taken at the end of every Игровой день. A purchase adds its own gain on top and does not cancel this. */
  dailyMoodDrop: 15,
  /** Счастье penalty when actual optional spend exceeds the plan bucket (§2.2). */
  overspendMoodPenalty: 5,
  /** Счастье taken when an open План was never confirmed. A closed План does not pay this. */
  noPlanMoodPenalty: 10,
} as const;

export const SAVINGS = {
  /** How many recent deposits feed the rolling average for the date estimate (§2.1). */
  estimateWindow: 5,
} as const;

/**
 * Банк (вклад), separate from Копилка (2026-09-24, Александр): opens after the
 * lesson about banks; coins leave Баланс on confirm and come back with
 * interest when the term (in Игровые дни) ends. No early withdrawal.
 */
/** Lessons that open money tools. Демо-режим shows the tools without them. */
export const FEATURES = {
  savingsTaskId: "savings_what",
  planTaskId: "budget_plan",
} as const;

export const BANK = {
  /** Finishing this Задание shows the Банк tile (Демо-режим: always). */
  unlockTaskId: "savings_where",
  minDeposit: 10,
  offers: [
    { id: "short", days: 3, ratePercent: 10 },
    { id: "long", days: 5, ratePercent: 20 },
  ],
} as const;
