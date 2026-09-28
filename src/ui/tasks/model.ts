import { playableTasks, unlockedTasks, type TaskContent } from "../../core/tasks";
import type { TaskProgressView } from "../../data/repositories/gameRepository";

export const TASK_TOPICS = ["budget", "savings", "payments"] as const;
export type TaskTopic = (typeof TASK_TOPICS)[number];

export function completedTaskIds(progress: readonly TaskProgressView[]): Set<string> {
  return new Set(progress.filter((row) => row.status === "completed").map((row) => row.taskKey));
}

/** Pending correction first, then the first open unfinished mission on the map. */
export function preferredHubTask(
  tasks: readonly TaskContent[],
  progress: readonly TaskProgressView[],
): TaskContent | null {
  const byKey = new Map(progress.map((row) => [row.taskKey, row]));
  const byId = new Map(tasks.map((task) => [task.id, task]));

  for (const row of progress) {
    const task = byId.get(row.taskKey);
    if (task?.correction && row.status !== "completed") return task;
  }

  const unlocked = unlockedTasks(tasks, completedTaskIds(progress));
  const unfinished = unlocked.find((task) => byKey.get(task.id)?.status !== "completed");
  if (unfinished) return unfinished;
  return unlocked[0] ?? null;
}

/** Finishable Задания (lessons + mini-games, no «скоро» pins) per topic. */
export function topicTaskGroups(tasks: readonly TaskContent[]): Record<TaskTopic, TaskContent[]> {
  const ordered = playableTasks(tasks);
  return {
    budget: ordered.filter((task) => task.topic === "budget"),
    savings: ordered.filter((task) => task.topic === "savings"),
    payments: ordered.filter((task) => task.topic === "payments"),
  };
}

/** Corrections still waiting to be played. A finished one leaves the map. */
export function correctionTasks(
  tasks: readonly TaskContent[],
  progress: readonly TaskProgressView[],
): TaskContent[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const seen = new Set<string>();
  const result: TaskContent[] = [];
  for (const row of progress) {
    const task = byId.get(row.taskKey);
    if (!task?.correction || row.status === "completed" || seen.has(task.id)) continue;
    seen.add(task.id);
    result.push(task);
  }
  return result;
}
