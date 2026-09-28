import { readCustomGoalItem } from "../../core/customGoal";
import { FEATURES } from "../../core/config";
import { currentTask, createLessonPin, type CurrentTask } from "../../core/currentTask";
import { billsForDay } from "../../core/economy";
import { unlockedTasks } from "../../core/tasks";
import type { GameContent } from "../../data/content";
import type { SessionGame } from "../session/types";
import { strings } from "../strings";
import { completedTaskIds } from "./model";

const pinLesson = createLessonPin();

function goalsLeft(game: SessionGame, content: GameContent, profileId: string, stage: string): number {
  const ids = content.goals.filter((goal) => goal.stage === stage).map((goal) => goal.id);
  const owned = new Set<string>();
  for (const row of game.listJournal(profileId)) {
    if (row.itemId && ids.includes(row.itemId)) owned.add(row.itemId);
  }
  const day = game.dayState(profileId);
  for (const id of game.purchasedItemIds(profileId, day.dayId)) {
    if (ids.includes(id)) owned.add(id);
  }
  return ids.filter((id) => !owned.has(id)).length;
}

/** Текущая задача for the open Игровой день. Hidden once the day is closed. */
export function resolveCurrentTask(
  game: SessionGame,
  content: GameContent,
  profileId: string,
): CurrentTask | null {
  let day;
  try {
    day = game.dayState(profileId);
  } catch {
    return null;
  }
  if (!day.open) return null;
  const profile = game.getProfile(profileId);
  const completed = completedTaskIds(game.listTaskProgress(profileId));
  const savingsOpen = profile.isDemo || completed.has(FEATURES.savingsTaskId);
  const planOpen = profile.isDemo || completed.has(FEATURES.planTaskId);
  const unlocked = unlockedTasks(content.tasks, completed);
  const openIds = new Set(unlocked.map((task) => task.id));
  const purchased = new Set(game.purchasedItemIds(profileId, day.dayId));
  const due = billsForDay(day.n, content.bills).items;
  const lessonPool = unlocked
    .filter(
      (task) =>
        task.pin != null &&
        !task.parent &&
        !task.correction &&
        task.id !== FEATURES.savingsTaskId &&
        task.id !== FEATURES.planTaskId &&
        !completed.has(task.id),
    )
    .map((task) => task.id);

  const activeGoal = game.savingsState(profileId).activeGoal;
  const task = currentTask({
    savingsOpen,
    planOpen,
    hasGoal: Boolean(activeGoal) || goalsLeft(game, content, profileId, profile.stage) === 0,
    goalReadyId: activeGoal?.achieved ? activeGoal.key : null,
    planConfirmed: day.plan.status === "confirmed",
    billsCovered: due.every((id) => purchased.has(id)),
    savingsLessonPending: openIds.has(FEATURES.savingsTaskId) && !completed.has(FEATURES.savingsTaskId),
    planLessonPending: openIds.has(FEATURES.planTaskId) && !completed.has(FEATURES.planTaskId),
    lessonPool,
    pickLesson: pinLesson,
  });
  if (task?.kind === "buy-bills") return { ...task, itemIds: due.filter((id) => !purchased.has(id)) };
  return task;
}

/** «обед», «обед и проезд», «обед, проезд и лекарство» from catalog names. */
export function billsPhrase(itemIds: readonly string[], content: GameContent): string {
  const names = itemIds.map((id) => (content.catalog.find((item) => item.id === id)?.name ?? id).toLowerCase());
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}`;
}

export function currentTaskLabel(task: CurrentTask, content: GameContent): string {
  if (task.kind === "set-goal") return strings.currentTaskSetGoal;
  if (task.kind === "buy-goal") {
    const name = readCustomGoalItem(task.goalId)?.name ?? content.goals.find((goal) => goal.id === task.goalId)?.name ?? task.goalId;
    return strings.currentTaskBuyGoal(name);
  }
  if (task.kind === "confirm-plan") return strings.currentTaskPlan;
  if (task.kind === "buy-bills") {
    const phrase = billsPhrase(task.itemIds ?? [], content);
    return phrase ? strings.currentTaskBills(phrase) : strings.currentTaskShop;
  }
  const title = content.tasks.find((row) => row.id === task.taskId)?.title ?? task.taskId;
  return strings.currentTaskLesson(title);
}
