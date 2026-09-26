import { DEFAULT_GOAL_EMOJI } from "../goalEmojis";
import { readCustomGoalItem } from "../../core/customGoal";

export type RoomDecoration = { id: string; icon: string; name: string };

/**
 * Bought Цели as room decorations, oldest first. A preset shows its catalog
 * icon. A Своя цель keeps only its name after purchase, so it shows ⭐.
 */
export function roomDecorations(
  boughtIds: readonly string[],
  goals: readonly { id: string; name: string; icon?: string }[],
): RoomDecoration[] {
  const out: RoomDecoration[] = [];
  for (const id of boughtIds) {
    const preset = goals.find((goal) => goal.id === id);
    if (preset) {
      out.push({ id, name: preset.name, icon: preset.icon || DEFAULT_GOAL_EMOJI });
      continue;
    }
    const custom = readCustomGoalItem(id);
    if (custom) out.push({ id, name: custom.name, icon: DEFAULT_GOAL_EMOJI });
  }
  return out;
}
