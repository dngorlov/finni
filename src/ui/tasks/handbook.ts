import { taskUnlockOrder, type TaskContent, type TaskNode } from "../../core/tasks";

/**
 * A theory card the child can reread. Play-start prompts («Начать») and the
 * closing «Готово!» card are the lesson session, not the handbook.
 */
export function teachingCards(task: TaskContent): TaskNode[] {
  return task.nodes.filter(
    (node) => node.kind === "card" && node.title != null && node.title !== "Готово!" && node.button !== "Начать",
  );
}

/**
 * Pinned Уроки in map order. The child sees only finished ones.
 * Демо-режим lists every written pin, finished or not.
 */
export function handbookLessons(
  tasks: readonly TaskContent[],
  completedIds: ReadonlySet<string>,
  all = false,
): TaskContent[] {
  return taskUnlockOrder(tasks).filter(
    (task) => !task.comingSoon && (all || completedIds.has(task.id)),
  );
}

export interface HandbookWord {
  id: string;
  title: string;
  text: string;
}

/** One Урок’s words, under that lesson’s own heading. */
export interface HandbookSection {
  id: string;
  title: string;
  words: HandbookWord[];
}

/**
 * Finished Уроки in map order, each with its own words.
 * A tile is the word (`term`), never a theory-card title.
 */
export function handbookSections(lessons: readonly TaskContent[]): HandbookSection[] {
  return lessons.flatMap((task) => {
    const words = (task.words ?? []).map((word) => ({
      id: `${task.id}:${word.term}`,
      title: word.term,
      text: word.text,
    }));
    if (words.length === 0) return [];
    return [{ id: task.id, title: task.title, words }];
  });
}
