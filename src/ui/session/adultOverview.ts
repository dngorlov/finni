import { localDate } from "../../core/clock";
import type { GameContent } from "../../data/content";
import type { TaskProgressView } from "../../data/repositories/gameRepository";
import type { SessionGame } from "./types";
import { strings } from "../strings";
import { endsGameDay, playableTasks } from "../../core/tasks";
import { TASK_TOPICS, topicTaskGroups } from "../tasks/model";

export type AdultTopicStat = {
  id: (typeof TASK_TOPICS)[number];
  title: string;
  done: number;
  total: number;
  line: string;
};

export type AdultOverview = {
  daysLine: string;
  tasksLine: string;
  topics: AdultTopicStat[];
  /** Null until at least one answer has been scored. */
  percent: number | null;
  correct: number;
  scored: number;
  answersLine: string;
  lessons: number;
  lessonDays: number;
  lessonsLine: string;
  lastLessonLine: string | null;
};

const TOPIC_TITLE: Record<(typeof TASK_TOPICS)[number], string> = {
  budget: strings.taskTopicBudget,
  savings: strings.taskTopicSavings,
  payments: strings.taskTopicPayments,
};

/** Whole local midnights between two moments. A later clock never goes negative. */
function calendarDaysAgo(atMs: number, nowMs: number): number {
  const [year, month, day] = localDate(new Date(atMs)).split("-").map(Number);
  const [nowYear, nowMonth, nowDay] = localDate(new Date(nowMs)).split("-").map(Number);
  const at = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).getTime();
  const now = new Date(nowYear ?? 0, (nowMonth ?? 1) - 1, nowDay ?? 1).getTime();
  return Math.max(0, Math.round((now - at) / 86_400_000));
}

/**
 * Уроки finished, grouped by the real calendar date of the first completion.
 * A replay updates the latest moment but does not add another урок or move the date.
 */
function lessonActivity(progress: readonly TaskProgressView[], lessonIds: ReadonlySet<string>, nowMs: number) {
  const days = new Set<string>();
  let lessons = 0;
  let lastAt: number | null = null;
  for (const row of progress) {
    if (row.status !== "completed" || !lessonIds.has(row.taskKey)) continue;
    const first = row.firstCompletedAt ?? row.completedAt;
    if (first == null) continue;
    lessons += 1;
    days.add(localDate(new Date(first)));
    const recent = row.completedAt ?? first;
    if (lastAt == null || recent > lastAt) lastAt = recent;
  }
  return {
    lessons,
    days: days.size,
    lastLessonLine: lastAt == null ? null : strings.adultLastLesson(strings.adultLastLessonWhen(calendarDaysAgo(lastAt, nowMs))),
  };
}

export function adultOverview(
  game: SessionGame,
  content: GameContent,
  profileId: string,
  nowMs = Date.now(),
): AdultOverview {
  const progress = game.listTaskProgress(profileId);
  const last = game.lastClosedDay(profileId);
  const groups = topicTaskGroups(content.tasks);
  const byKey = new Map(progress.map((row) => [row.taskKey, row]));
  const completed = (taskId: string) => byKey.get(taskId)?.status === "completed";
  const nonCorrection = playableTasks(content.tasks);
  const lessonIds = new Set(content.tasks.filter((task) => endsGameDay(task)).map((task) => task.id));
  const correct = progress.reduce((sum, row) => sum + row.correctAnswers, 0);
  const scored = progress.reduce((sum, row) => sum + row.scoredAnswers, 0);
  const percent = scored === 0 ? null : Math.round((correct * 100) / scored);
  const activity = lessonActivity(progress, lessonIds, nowMs);
  return {
    daysLine: last ? strings.resultsDaysPlayed(last.n) : strings.adultDaysEmpty,
    tasksLine: strings.resultsTasksDone(
      nonCorrection.filter((task) => completed(task.id)).length,
      nonCorrection.length,
    ),
    topics: TASK_TOPICS.map((topic) => {
      const pair = groups[topic].filter((task) => !task.correction);
      const done = pair.filter((task) => completed(task.id)).length;
      return {
        id: topic,
        title: TOPIC_TITLE[topic],
        done,
        total: pair.length,
        line: strings.adultTopicLine(TOPIC_TITLE[topic], done, pair.length),
      };
    }),
    percent,
    correct,
    scored,
    answersLine: percent == null ? strings.adultAnswersEmpty : strings.adultAnswersLine(percent, correct, scored),
    lessons: activity.lessons,
    lessonDays: activity.days,
    lessonsLine:
      activity.lessons === 0
        ? strings.adultLessonsEmpty
        : strings.adultLessonsLine(activity.lessons, activity.days),
    lastLessonLine: activity.lastLessonLine,
  };
}
