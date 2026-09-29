import { earnedAchievementIds, emptyAchievementFacts } from "../achievements";

describe("достижения", () => {
  it("starts with nothing earned", () => {
    expect(earnedAchievementIds(emptyAchievementFacts())).toEqual([]);
  });

  it("earns a first buy and a treat, and Обед adds nothing of its own", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ shopBuys: 1 }))).toEqual(["first_buy"]);
    expect(
      earnedAchievementIds(emptyAchievementFacts({ shopBuys: 2, optionalBuys: 1 })),
    ).toEqual(["first_buy", "treat"]);
  });

  it("gives the first finished Урок one reward, though it also closes day 1", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ lessonsCompleted: 1, daysClosed: 1 }))).toEqual(["lesson"]);
  });

  it("has no reward for a Своя цель, only for the Цель", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ goalsBought: 1, customGoalsBought: 1 }))).toEqual(["goal"]);
  });

  it("counts 50 coins put into Копилка, and keeps the first deposit before that", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ savingsIns: 1, savedTotal: 49 }))).toEqual(["first_save"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ savingsIns: 1, savedTotal: 50 }))).toEqual([
      "first_save",
      "save_50",
    ]);
  });

  it("earns the week only after seven closed days, and Про stays earned at Миллионер", () => {
    expect(earnedAchievementIds(emptyAchievementFacts({ daysClosed: 6 }))).toEqual([]);
    expect(earnedAchievementIds(emptyAchievementFacts({ daysClosed: 7 }))).toEqual(["week"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ stage: "pro" }))).toEqual(["pro"]);
    expect(earnedAchievementIds(emptyAchievementFacts({ stage: "millionaire" }))).toEqual(["pro", "millionaire"]);
  });
});
