import {
  DAYS_BILLS_PAID,
  DAYS_CLOSED,
  DAYS_WITHIN_PLAN,
  LESSONS_COMPLETED,
  PERFECT_DAYS,
  PLANS_CONFIRMED,
  SAVINGS_DAYS,
  achievementFactsFrom,
  earnedAchievementIds,
  emptyAchievementFacts,
} from "../achievements";

describe("достижения", () => {
  it("starts with nothing earned", () => {
    expect(earnedAchievementIds(emptyAchievementFacts())).toEqual([]);
  });

  it("gives nothing for the first shop buy, the first Задание, or the first Цель", () => {
    expect(
      earnedAchievementIds(
        emptyAchievementFacts({
          savingsDays: 1,
          plansConfirmed: 1,
          daysClosed: 1,
          lessonsCompleted: 1,
          daysWithinPlan: 1,
          daysBillsPaid: 1,
          perfectDays: 1,
          stage: "pro",
        }),
      ),
    ).toEqual([]);
  });

  it("earns Два вкуса only once both Желаемые are bought, and a Цель does not count", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ bothTreats: true }))).toEqual(["sweets"]);
    expect(
      achievementFactsFrom({
        purchases: [
          { dayId: "d1", itemId: "candy", boughtAsActiveGoal: false },
          { dayId: "d1", itemId: "skateboard", boughtAsActiveGoal: true },
        ],
        savingsInDayIds: [],
        plansConfirmed: 0,
        daysClosed: 0,
        scores: [],
        lessonsCompleted: 0,
        bankPaid: 0,
        stage: "novice",
      }).bothTreats,
    ).toBe(false);
    expect(
      achievementFactsFrom({
        purchases: [
          { dayId: "d1", itemId: "candy", boughtAsActiveGoal: false },
          { dayId: "d2", itemId: "ice-cream", boughtAsActiveGoal: false },
        ],
        savingsInDayIds: [],
        plansConfirmed: 0,
        daysClosed: 0,
        scores: [],
        lessonsCompleted: 0,
        bankPaid: 0,
        stage: "novice",
      }).bothTreats,
    ).toBe(true);
  });

  it("counts a sick day only when Обед, Проезд, and Лекарство share one day", () => {
    const split = achievementFactsFrom({
      purchases: [
        { dayId: "d1", itemId: "lunch", boughtAsActiveGoal: false },
        { dayId: "d1", itemId: "transport", boughtAsActiveGoal: false },
        { dayId: "d2", itemId: "medicine", boughtAsActiveGoal: false },
      ],
      savingsInDayIds: ["d1", "d1"],
      plansConfirmed: 0,
      daysClosed: 0,
      scores: [],
      lessonsCompleted: 0,
      bankPaid: 0,
      stage: "novice",
    });
    expect(split.sickDays).toBe(0);
    expect(split.savingsDays).toBe(1);

    const together = achievementFactsFrom({
      purchases: [
        { dayId: "d1", itemId: "lunch", boughtAsActiveGoal: false },
        { dayId: "d1", itemId: "transport", boughtAsActiveGoal: false },
        { dayId: "d1", itemId: "medicine", boughtAsActiveGoal: false },
      ],
      savingsInDayIds: [],
      plansConfirmed: 0,
      daysClosed: 0,
      scores: [],
      lessonsCompleted: 0,
      bankPaid: 0,
      stage: "novice",
    });
    expect(together.sickDays).toBe(1);
    expect(earnedAchievementIds(together)).toEqual(["sick_day"]);
  });

  it("waits for a habit, and keeps Про off the list until Миллионер", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ savingsDays: SAVINGS_DAYS - 1 }))).toEqual([]);
    expect(earnedAchievementIds(emptyAchievementFacts({ savingsDays: SAVINGS_DAYS }))).toEqual(["piggy"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ plansConfirmed: PLANS_CONFIRMED }))).toEqual(["plans"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ daysClosed: DAYS_CLOSED - 1 }))).toEqual([]);
    expect(earnedAchievementIds(emptyAchievementFacts({ daysClosed: DAYS_CLOSED }))).toEqual(["ten_days"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ lessonsCompleted: LESSONS_COMPLETED }))).toEqual(["lessons"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ bankPaid: 1 }))).toEqual(["interest"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ stage: "pro" }))).toEqual([]);
    expect(earnedAchievementIds(emptyAchievementFacts({ stage: "millionaire" }))).toEqual(["millionaire"]);
  });

  it("staggers the day rewards so one close finishes only the next one", () => {
    const day = { withinPlan: true, mandatoryCovered: true, deposited: true };
    const facts = achievementFactsFrom({
      purchases: [],
      savingsInDayIds: [],
      plansConfirmed: 0,
      daysClosed: PERFECT_DAYS,
      scores: Array.from({ length: PERFECT_DAYS }, () => day),
      lessonsCompleted: 0,
      bankPaid: 0,
      stage: "novice",
    });
    expect(earnedAchievementIds(facts)).toEqual(["steady"]);

    expect(earnedAchievementIds(emptyAchievementFacts({ daysWithinPlan: DAYS_WITHIN_PLAN }))).toEqual(["kept_word"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ daysBillsPaid: DAYS_BILLS_PAID - 1 }))).toEqual([]);
    expect(earnedAchievementIds(emptyAchievementFacts({ daysBillsPaid: DAYS_BILLS_PAID }))).toEqual(["bills_week"]);
  });
});
