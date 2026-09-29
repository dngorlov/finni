import { FEATURES } from "./config";

/** The one action Текущая задача points at. Null when nothing is left to suggest. */
export type CurrentTask =
  | { kind: "set-goal" }
  | { kind: "buy-goal"; goalId: string }
  | { kind: "confirm-plan" }
  /** `left`: coins today's Счета still ask for on Обязательные, when the caller knows it. */
  | { kind: "buy-bills"; left?: number }
  /** Баланс cannot cover those Счета, and Копилка has coins to take out. */
  | { kind: "withdraw-savings" }
  | { kind: "lesson"; taskId: string };

export interface CurrentTaskInput {
  savingsOpen: boolean;
  planOpen: boolean;
  hasGoal: boolean;
  /** Копилка already covers the active Цель. */
  goalReadyId: string | null;
  planConfirmed: boolean;
  /** Today's Обязательные purchases reach the Счета minimum. */
  billsCovered: boolean;
  /** Coins available to spend right now. */
  balance: number;
  /** Price of today's still unpaid Счета. */
  unpaidBillCost: number;
  /** Coins sitting in Копилка. */
  pot: number;
  /** «Что такое сбережения» is playable and not completed. */
  savingsLessonPending: boolean;
  /** «Планирование бюджета» is playable and not completed. */
  planLessonPending: boolean;
  /** Open unfinished pinned Уроки, without the two feature lessons. */
  lessonPool: readonly string[];
  pickLesson: (pool: readonly string[]) => string;
}

/** First match wins. The two unlock lessons are never chosen from the random pool. */
export function currentTask(input: CurrentTaskInput): CurrentTask | null {
  if (input.savingsOpen && !input.hasGoal) return { kind: "set-goal" };
  if (input.savingsOpen && input.goalReadyId) return { kind: "buy-goal", goalId: input.goalReadyId };
  if (input.planOpen && !input.planConfirmed) return { kind: "confirm-plan" };
  if (!input.billsCovered) {
    if (input.balance >= input.unpaidBillCost) return { kind: "buy-bills" };
    if (input.savingsOpen && input.pot > 0) return { kind: "withdraw-savings" };
  }
  if (!input.savingsOpen && input.savingsLessonPending) {
    return { kind: "lesson", taskId: FEATURES.savingsTaskId };
  }
  if (!input.planOpen && input.planLessonPending) {
    return { kind: "lesson", taskId: FEATURES.planTaskId };
  }
  if (input.lessonPool.length === 0) return null;
  return { kind: "lesson", taskId: input.pickLesson(input.lessonPool) };
}

/** Same pick while the pool's ids stay the same; a new pool picks again. */
export function createLessonPin(random: () => number = Math.random): (pool: readonly string[]) => string {
  let pinned: { key: string; id: string } | null = null;
  return (pool) => {
    const key = [...pool].sort().join("\0");
    if (pinned?.key === key) return pinned.id;
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    const id = pool[index] ?? pool[0];
    if (!id) throw new Error("Пустой список уроков");
    pinned = { key, id };
    return id;
  };
}
