import { readCustomGoalItem } from "../core/customGoal";
import { showStageThreshold, type Stage } from "../core/stages";
import type { SavingsView } from "../data/repositories/gameRepository";
import { DEFAULT_GOAL_EMOJI } from "./goalEmojis";
import { strings } from "./strings";

type NamedGoal = { id: string; name: string; icon?: string };

export function activeGoalLabel(
  goal: { key: string; custom: boolean; name: string | null; icon: string | null } | null,
  goals: readonly NamedGoal[],
): { name: string; icon: string } | null {
  if (!goal) return null;
  if (goal.custom) {
    return { name: goal.name ?? "", icon: goal.icon || "⭐" };
  }
  const known = goals.find((item) => item.id === goal.key);
  if (!known) return null;
  return { name: known.name, icon: known.icon ?? "" };
}

/** The Порог line, or null when this Цель should not show it. */
export function goalThresholdLabel(savings: SavingsView, stage: Stage): string | null {
  const goal = savings.activeGoal;
  if (!goal || goal.threshold == null) return null;
  if (!showStageThreshold({ stage, custom: goal.custom, price: goal.cost, threshold: goal.threshold })) {
    return null;
  }
  return strings.stageThreshold(savings.stageCredit, goal.threshold);
}

export function goalFace(savings: SavingsView, stage: Stage, goals: readonly NamedGoal[]) {
  const label = activeGoalLabel(savings.activeGoal, goals);
  return {
    name: label?.name ?? "",
    icon: savings.activeGoal?.custom ? (label?.icon ?? "") : "",
    threshold: goalThresholdLabel(savings, stage),
  };
}

/** Places on the Дом shelf. */
export const SHELF_GOALS = 3;

/**
 * The Цели already bought, for the shelf on Дом: the latest few, oldest of them first.
 * `boughtIds` comes oldest first. A Своя цель keeps its name; its значок is not stored with
 * the purchase, so it gets the default star.
 */
export function shelfGoals(
  boughtIds: readonly string[],
  goals: readonly NamedGoal[],
  limit = SHELF_GOALS,
): { id: string; name: string; icon: string }[] {
  const faces: { id: string; name: string; icon: string }[] = [];
  for (const id of boughtIds) {
    const known = goals.find((goal) => goal.id === id);
    if (known) {
      faces.push({ id, name: known.name, icon: known.icon || DEFAULT_GOAL_EMOJI });
      continue;
    }
    const custom = readCustomGoalItem(id);
    if (custom) faces.push({ id, name: custom.name, icon: DEFAULT_GOAL_EMOJI });
  }
  return limit > 0 ? faces.slice(-limit) : [];
}
