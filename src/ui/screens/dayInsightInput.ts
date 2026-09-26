import { FEATURES } from "../../core/config";
import type { DayInsightInput } from "../../core/dayInsights";
import { billsForDay, type DayBills } from "../../core/economy";
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
  const { summary, catalog } = input;
  const dayRows = input.journal.filter((entry) => entry.dayN === summary.n);
  const bought = new Set(
    dayRows.filter((entry) => entry.kind === "purchase" && entry.itemId).map((entry) => entry.itemId as string),
  );
  const due = billsForDay(summary.n, input.bills).items.flatMap((id) => {
    const item = catalog.find((row) => row.id === id);
    return item ? [item] : [];
  });
  const missed = due.filter((item) => !bought.has(item.id));
  const dueTotal = due.reduce((sum, item) => sum + item.price, 0);
  const missedTotal = missed.reduce((sum, item) => sum + item.price, 0);
  // The lesson that opens Копилка can end the day, so that day had no Копилка yet.
  const openedSavingsToday = dayRows.some((entry) => entry.labelKey === `task_reward:${FEATURES.savingsTaskId}`);
  return {
    plan: summary.planConfirmed ? summary.plan : null,
    actual: summary.actual,
    bills: {
      due: dueTotal,
      paid: dueTotal - missedTotal,
      missedFood: missed.some((item) => item.effect.meter === "care"),
    },
    savingsOpen: input.isDemo || (input.savingsLessonDone && !openedSavingsToday),
    noPlanPenalty: summary.meterDeltas.noPlan,
    lessonCoins: dayRows.filter(LESSON_INCOME).reduce((sum, entry) => sum + entry.amount, 0),
    goal: input.goal ? { remaining: input.goal.remaining } : null,
  };
}
