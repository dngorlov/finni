import { planKept, type PlanBuckets } from "./economy";

/**
 * «Автоматический анализ» of a closed Игровой день: what the child's actions
 * led to and what could have gone better. Pure and deterministic — the same
 * closed day always gives the same insights. Texts live in the UI strings;
 * an insight carries only its id and the numbers the sentence needs.
 */
export interface DayInsightInput {
  /** The confirmed План, or null when the day had none (closed, draft, or skipped). */
  plan: PlanBuckets | null;
  /** Coins that went to each bucket that day (Желаемые paid from Баланс only). */
  actual: PlanBuckets;
  /** Today's Счета: their total price, and the part of it that was bought. */
  bills: { due: number; paid: number; missedFood: boolean };
  /** Копилка was open during the whole day (not opened by the lesson that ended it). */
  savingsOpen: boolean;
  /** Счастье taken because an open План was never confirmed (≤ 0). */
  noPlanPenalty: number;
  /** Coins the day's finished Задания paid; 0 when none. */
  lessonCoins: number;
  /** Active Цель, if any: coins still missing (0 when Копилка already covers it). */
  goal: { remaining: number } | null;
}

export type GoodInsight =
  | { kind: "good"; id: "billsPaid" }
  | { kind: "good"; id: "planKept" }
  | { kind: "good"; id: "goalReady" }
  | { kind: "good"; id: "saved"; amount: number; goalRemaining: number | null; goalDays: number | null }
  | { kind: "good"; id: "lesson"; coins: number }
  | { kind: "good"; id: "dayDone" };

export type TipInsight =
  | { kind: "tip"; id: "wantsOverNeeds"; amount: number; missedFood: boolean }
  | { kind: "tip"; id: "billsMissed"; missing: number; missedFood: boolean }
  | { kind: "tip"; id: "overspentWants"; over: number }
  | { kind: "tip"; id: "noPlan" }
  | { kind: "tip"; id: "savedLess"; short: number }
  | { kind: "tip"; id: "nothingSaved"; hasGoal: boolean }
  | { kind: "tip"; id: "overPlan"; over: number };

export type Insight = GoodInsight | TipInsight;

/** At most this many insights are shown: praise first, then one clear tip. */
export const MAX_INSIGHTS = 3;

function goodInsights(input: DayInsightInput): GoodInsight[] {
  const { plan, actual, bills, goal } = input;
  const out: GoodInsight[] = [];
  if (bills.due > 0 && bills.paid >= bills.due) out.push({ kind: "good", id: "billsPaid" });
  if (plan !== null && planKept({ plan, actual })) out.push({ kind: "good", id: "planKept" });
  if (goal !== null && goal.remaining === 0) {
    out.push({ kind: "good", id: "goalReady" });
  } else if (actual.savings > 0) {
    const remaining = goal?.remaining ?? null;
    out.push({
      kind: "good",
      id: "saved",
      amount: actual.savings,
      goalRemaining: remaining,
      goalDays: remaining === null ? null : Math.ceil(remaining / actual.savings),
    });
  }
  if (input.lessonCoins > 0) out.push({ kind: "good", id: "lesson", coins: input.lessonCoins });
  return out;
}

function tipInsights(input: DayInsightInput): TipInsight[] {
  const { plan, actual, bills } = input;
  const out: TipInsight[] = [];
  const billsMissing = Math.max(0, bills.due - bills.paid);
  if (billsMissing > 0 && actual.optional > 0) {
    out.push({
      kind: "tip",
      id: "wantsOverNeeds",
      amount: Math.min(billsMissing, actual.optional),
      missedFood: bills.missedFood,
    });
  } else if (billsMissing > 0) {
    out.push({ kind: "tip", id: "billsMissed", missing: billsMissing, missedFood: bills.missedFood });
  }
  if (plan !== null && actual.optional > plan.optional) {
    out.push({ kind: "tip", id: "overspentWants", over: actual.optional - plan.optional });
  }
  if (input.noPlanPenalty < 0) out.push({ kind: "tip", id: "noPlan" });
  if (input.savingsOpen && plan !== null && actual.savings < plan.savings) {
    out.push({ kind: "tip", id: "savedLess", short: plan.savings - actual.savings });
  } else if (input.savingsOpen && actual.savings === 0 && (input.goal === null || input.goal.remaining > 0)) {
    out.push({ kind: "tip", id: "nothingSaved", hasGoal: input.goal !== null });
  }
  if (plan !== null) {
    const over = actual.mandatory + actual.optional - (plan.mandatory + plan.optional);
    if (over > 0 && actual.optional <= plan.optional) out.push({ kind: "tip", id: "overPlan", over });
  }
  return out;
}

/**
 * Up to three insights for a closed day, praise first, then at most one tip —
 * the most important one. A day with nothing to praise still gets a kind word.
 */
export function dayInsights(input: DayInsightInput): Insight[] {
  const goods = goodInsights(input);
  const tip = tipInsights(input)[0];
  const room = tip ? MAX_INSIGHTS - 1 : MAX_INSIGHTS;
  const praise: GoodInsight[] = goods.length > 0 ? goods.slice(0, room) : [{ kind: "good", id: "dayDone" }];
  return tip ? [...praise, tip] : praise;
}
