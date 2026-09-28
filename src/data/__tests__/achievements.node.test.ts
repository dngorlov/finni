import type { CatalogItem } from "../../core/economy";
import { openMemoryGame } from "../testSupport/memoryDb";

const lunch: CatalogItem = {
  id: "lunch",
  kind: "mandatory",
  price: 12,
  effect: { meter: "care", delta: 10 },
};

const candy: CatalogItem = {
  id: "candy",
  kind: "optional",
  price: 5,
  effect: { meter: "mood", delta: 5 },
};

describe("достижения", () => {
  it("records a shop buy on that Игровой день and dismisses one reward at a time", () => {
    const { game } = openMemoryGame();
    const profileId = game.createProfile({
      name: "Миша",
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      contentVersion: 1,
      goals: [{ key: "skateboard", cost: 90 }],
      activeGoalKey: "skateboard",
    });
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("День не открылся");

    expect(game.listAchievements(profileId)).toEqual([]);
    game.purchase(profileId, opened.dayId, lunch);

    // Обед no longer earns its own reward on top of «Первая покупка».
    expect(game.listAchievements(profileId)).toEqual([{ id: "first_buy", dayN: 1, celebrated: false }]);

    game.purchase(profileId, opened.dayId, candy);
    expect(game.listAchievements(profileId)).toEqual([
      { id: "first_buy", dayN: 1, celebrated: false },
      { id: "treat", dayN: 1, celebrated: false },
    ]);

    game.celebrateAchievement(profileId, "first_buy");
    expect(game.listAchievements(profileId)).toEqual([
      { id: "first_buy", dayN: 1, celebrated: true },
      { id: "treat", dayN: 1, celebrated: false },
    ]);
  });

  it("keeps a retired Достижение stored by an older version out of the list", () => {
    const { game, sqlite } = openMemoryGame();
    const profileId = game.createProfile({
      name: "Миша",
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      contentVersion: 1,
      goals: [{ key: "skateboard", cost: 90 }],
      activeGoalKey: "skateboard",
    });
    sqlite
      .prepare(
        "INSERT INTO achievements (id, profileId, key, dayN, earnedAt, celebrated) VALUES ('old', ?, 'day_done', 1, 0, 0)",
      )
      .run(profileId);

    expect(game.listAchievements(profileId)).toEqual([]);
  });
});
