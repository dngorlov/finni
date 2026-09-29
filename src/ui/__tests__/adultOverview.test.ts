import { loadContent } from "../../data/content";
import type { TaskProgressView } from "../../data/repositories/gameRepository";
import { adultOverview } from "../session/adultOverview";
import type { SessionGame } from "../session/types";

const content = loadContent();
const now = new Date(2026, 8, 26, 15, 0, 0).getTime();
const yesterday = new Date(2026, 8, 25, 15, 0, 0).getTime();

function row(partial: Pick<TaskProgressView, "taskKey"> & Partial<TaskProgressView>): TaskProgressView {
  return {
    status: "completed",
    rewardPaid: true,
    bestReward: 0,
    correctAnswers: 0,
    scoredAnswers: 0,
    firstCompletedAt: now,
    completedAt: now,
    ...partial,
  };
}

function overview(rows: TaskProgressView[], at = now) {
  const game = {
    listTaskProgress: () => rows,
    lastClosedDay: () => null,
  } as unknown as SessionGame;
  return adultOverview(game, content, "child", at);
}

describe("adult learning analytics", () => {
  it("stays calm when nothing has been answered or finished", () => {
    const stats = overview([]);
    expect(stats.answersLine).toBe("Верных ответов пока нет — это нормально.");
    expect(stats.lessonsLine).toBe("Уроков по календарю пока нет — это нормально.");
    expect(stats.lastLessonLine).toBeNull();
  });

  it("reports the share of fully right answers and уроки across calendar dates", () => {
    const stats = overview([
      row({
        taskKey: "budget_what",
        correctAnswers: 2,
        scoredAnswers: 3,
        firstCompletedAt: yesterday,
        completedAt: now,
      }),
      row({ taskKey: "savings_what", correctAnswers: 1, scoredAnswers: 1, firstCompletedAt: now, completedAt: now }),
      row({ taskKey: "payments_sale_trap", correctAnswers: 4, scoredAnswers: 4 }),
      row({ taskKey: "budget_fix_backpack", correctAnswers: 0, scoredAnswers: 2 }),
    ]);

    expect(stats.percent).toBe(70);
    expect(stats.correct).toBe(7);
    expect(stats.scored).toBe(10);
    expect(stats.answersLine).toBe("Верных ответов: 70%, 7 из 10");
    expect(stats.lessonsLine).toBe("Уроки по календарю: 2 за 2 дня");
    expect(stats.lastLessonLine).toBe("Последний урок: сегодня");
  });

  it("counts two уроки on one calendar day as one day, and a replay as the latest moment", () => {
    const sameDay = overview([
      row({ taskKey: "budget_what", firstCompletedAt: now }),
      row({ taskKey: "savings_what", firstCompletedAt: now }),
    ]);
    expect(sameDay.lessonsLine).toBe("Уроки по календарю: 2 за 1 день");

    const replayed = overview([
      row({ taskKey: "budget_what", firstCompletedAt: yesterday, completedAt: now }),
    ]);
    expect(replayed.lessonsLine).toBe("Уроки по календарю: 1 за 1 день");
    expect(replayed.lastLessonLine).toBe("Последний урок: сегодня");

    const quiet = overview([row({ taskKey: "budget_what", firstCompletedAt: yesterday, completedAt: yesterday })]);
    expect(quiet.lastLessonLine).toBe("Последний урок: вчера");
  });
});
