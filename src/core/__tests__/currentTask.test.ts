import { FEATURES } from "../config";
import { createLessonPin, currentTask, type CurrentTaskInput } from "../currentTask";

function input(overrides: Partial<CurrentTaskInput> = {}): CurrentTaskInput {
  return {
    savingsOpen: false,
    planOpen: false,
    hasGoal: false,
    goalReadyId: null,
    planConfirmed: false,
    billsCovered: false,
    balance: 100,
    unpaidBillCost: 20,
    pot: 0,
    savingsLessonPending: true,
    planLessonPending: true,
    lessonPool: ["budget_what", "payments_pay"],
    pickLesson: (pool) => pool[0] ?? "",
    ...overrides,
  };
}

describe("Текущая задача", () => {
  it("starts with today's Счета, then the Копилка lesson", () => {
    expect(currentTask(input())).toEqual({ kind: "buy-bills" });
    expect(currentTask(input({ billsCovered: true }))).toEqual({
      kind: "lesson",
      taskId: FEATURES.savingsTaskId,
    });
  });

  it("asks for the planning lesson once Копилка is open and the bills are bought", () => {
    expect(
      currentTask(input({ savingsOpen: true, hasGoal: true, billsCovered: true })),
    ).toEqual({ kind: "lesson", taskId: FEATURES.planTaskId });
  });

  it("asks to buy the Цель once Копилка covers it, ahead of the План and the shop", () => {
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          goalReadyId: "lego",
          billsCovered: false,
        }),
      ),
    ).toEqual({ kind: "buy-goal", goalId: "lego" });
  });

  it("puts choosing a Цель, then the План, ahead of the shop", () => {
    expect(currentTask(input({ savingsOpen: true, planOpen: true, billsCovered: false }))).toEqual({
      kind: "set-goal",
    });
    expect(
      currentTask(input({ savingsOpen: true, planOpen: true, hasGoal: true, billsCovered: false })),
    ).toEqual({ kind: "confirm-plan" });
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          planConfirmed: true,
          billsCovered: false,
        }),
      ),
    ).toEqual({ kind: "buy-bills" });
  });

  it("asks to take coins from Копилка when Баланс cannot cover the Счета and the pot has coins", () => {
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          planConfirmed: true,
          balance: 15,
          unpaidBillCost: 20,
          pot: 5,
        }),
      ),
    ).toEqual({ kind: "withdraw-savings" });
  });

  it("moves on to the Урок when Баланс cannot cover the Счета and Копилка is empty or closed", () => {
    expect(currentTask(input({ balance: 12, unpaidBillCost: 20, pot: 0 }))).toEqual({
      kind: "lesson",
      taskId: FEATURES.savingsTaskId,
    });
    expect(
      currentTask(
        input({
          savingsOpen: false,
          balance: 0,
          unpaidBillCost: 20,
          pot: 30,
        }),
      ),
    ).toEqual({ kind: "lesson", taskId: FEATURES.savingsTaskId });
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          planConfirmed: true,
          balance: 0,
          unpaidBillCost: 20,
          pot: 0,
          savingsLessonPending: false,
          planLessonPending: false,
          lessonPool: ["payments_pay"],
        }),
      ),
    ).toEqual({ kind: "lesson", taskId: "payments_pay" });
  });

  it("picks one open unfinished Урок after the chores, and hides the bar when none remain", () => {
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          planConfirmed: true,
          billsCovered: true,
          lessonPool: ["payments_pay"],
        }),
      ),
    ).toEqual({ kind: "lesson", taskId: "payments_pay" });
    expect(
      currentTask(
        input({
          savingsOpen: true,
          planOpen: true,
          hasGoal: true,
          planConfirmed: true,
          billsCovered: true,
          lessonPool: [],
        }),
      ),
    ).toBeNull();
  });

  it("keeps the same Урок until the pool changes", () => {
    const pick = createLessonPin(() => 0);
    expect(pick(["b", "a"])).toBe("b");
    expect(pick(["b", "a"])).toBe("b");
    expect(pick(["only"])).toBe("only");
    const later = createLessonPin(() => 0.99);
    expect(later(["a", "b"])).toBe("b");
  });
});
