import { FEATURES } from "../../core/config";
import type { DayInsightInput } from "../../core/dayInsights";
import { billsForDay, billsTotal, type DayBills } from "../../core/economy";
import type { CatalogItemContent } from "../../data/content";
import type { ActiveGoalView, DaySummaryView, JournalEntry } from "../../data/repositories/gameRepository";

const LESSON_INCOME = (entry: JournalEntry) =>
  entry.amount > 0 && (entry.labelKey.startsWith("task_reward:") || entry.labelKey === "task_scene");

/**
 * Everything «Разбор дня» needs about one closed Игровой день, read from the
 * day summary and that day's Журнал rows. The Цель is today's, so a reopened
 * Итоги counts the remaining coins from where Копилка stands now.
 */
export function dayInsightInput(input: {
  summary: DaySummaryView;
  journal: readonly JournalEntry[];
  catalog: readonly CatalogItemContent[];
  bills: readonly DayBills[];
  isDemo: boolean;
  savingsLessonDone: boolean;
  goal: ActiveGoalView | null;
}): DayInsightInput {
  const { summary } = input;
  const dayRows = input.journal.filter((entry) => entry.dayN === summary.n);
  // Счета are a coin minimum for Обязательные; every Обязательное feeds the pet.
  const dueTotal = billsTotal(billsForDay(summary.n, input.bills));
  const paid = Math.min(dueTotal, summary.actual.mandatory);
  // The lesson that opens Копилка can end the day, so that day had no Копилка yet.
  const openedSavingsToday = dayRows.some((entry) => entry.labelKey === `task_reward:${FEATURES.savingsTaskId}`);
  return {
    plan: summary.planConfirmed ? summary.plan : null,
    actual: summary.actual,
    bills: {
      due: dueTotal,
      paid,
      missedFood: paid < dueTotal,
    },
    savingsOpen: input.isDemo || (input.savingsLessonDone && !openedSavingsToday),
    noPlanPenalty: summary.meterDeltas.noPlan,
    lessonCoins: dayRows.filter(LESSON_INCOME).reduce((sum, entry) => sum + entry.amount, 0),
    goal: input.goal ? { remaining: input.goal.remaining } : null,
  };
}
