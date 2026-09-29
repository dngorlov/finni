import type { CatalogItem } from "../../core/economy";
import { openMemoryGame } from "../testSupport/memoryDb";

const lunch: CatalogItem = {
  id: "lunch",
  kind: "mandatory",
  price: 12,
  effect: { meter: "care", delta: 10 },
};

const transport: CatalogItem = {
  id: "transport",
  kind: "mandatory",
  price: 8,
  effect: { meter: "mood", delta: 5 },
};

const medicine: CatalogItem = {
  id: "medicine",
  kind: "mandatory",
  price: 15,
  effect: { meter: "mood", delta: 20 },
};

const candy: CatalogItem = {
  id: "candy",
  kind: "optional",
  price: 5,
  effect: { meter: "mood", delta: 5 },
};

const iceCream: CatalogItem = {
  id: "ice-cream",
  kind: "optional",
  price: 8,
  effect: { meter: "mood", delta: 6 },
};

function openProfile() {
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
  const opened = game.openDay(profileId);
  if (opened.status !== "opened") throw new Error("День не открылся");
  return { game, sqlite, profileId, dayId: opened.dayId };
}

describe("достижения", () => {
  it("records nothing for one shop buy, then Два вкуса when both Желаемые are bought", () => {
    const { game, profileId, dayId } = openProfile();

    expect(game.listAchievements(profileId)).toEqual([]);
    game.purchase(profileId, dayId, lunch);
    game.purchase(profileId, dayId, candy);
    expect(game.listAchievements(profileId)).toEqual([]);

    game.purchase(profileId, dayId, iceCream);
    expect(game.listAchievements(profileId)).toEqual([{ id: "sweets", dayN: 1, celebrated: false }]);

    game.celebrateAchievement(profileId, "sweets");
    expect(game.listAchievements(profileId)).toEqual([{ id: "sweets", dayN: 1, celebrated: true }]);
  });

  it("records Питомец здоров only when Обед, Проезд, and Лекарство share the day", () => {
    const { game, profileId, dayId } = openProfile();
    game.purchase(profileId, dayId, lunch);
    game.purchase(profileId, dayId, transport);
    expect(game.listAchievements(profileId)).toEqual([]);

    game.purchase(profileId, dayId, medicine);
    expect(game.listAchievements(profileId)).toEqual([{ id: "sick_day", dayN: 1, celebrated: false }]);
  });

  it("earns Проценты пришли when the Вклад is paid, not when it is opened", () => {
    const { game, profileId, dayId } = openProfile();
    expect(game.openDeposit(profileId, dayId, "short", 10)).toMatchObject({ status: "ok", maturesDayN: 4 });
    expect(game.listAchievements(profileId)).toEqual([]);

    let current = dayId;
    for (let step = 0; step < 3; step += 1) {
      game.closeDay(profileId, [lunch]);
      const next = game.openDay(profileId);
      if (next.status !== "opened") throw new Error("День не открылся");
      current = next.dayId;
    }
    expect(game.listAchievements(profileId)).toEqual([]);

    expect(game.collectDeposits(profileId, current)).toMatchObject({ count: 1 });
    expect(game.listAchievements(profileId)).toEqual([{ id: "interest", dayN: 4, celebrated: false }]);
  });

  it("keeps a retired Достижение stored by an older version out of the list", () => {
    const { game, sqlite, profileId } = openProfile();
    sqlite
      .prepare(
        "INSERT INTO achievements (id, profileId, key, dayN, earnedAt, celebrated) VALUES ('old', ?, 'day_done', 1, 0, 0)",
      )
      .run(profileId);

    expect(game.listAchievements(profileId)).toEqual([]);
  });
});
