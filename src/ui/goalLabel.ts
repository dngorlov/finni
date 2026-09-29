import { showStageThreshold, type Stage } from "../core/stages";
import type { SavingsView } from "../data/repositories/gameRepository";
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
