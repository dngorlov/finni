import type { CatalogItem } from "../../core/economy";
import { openMemoryGame } from "../testSupport/memoryDb";

const soup: CatalogItem = {
  id: "soup",
  kind: "mandatory",
  price: 8,
  effect: { meter: "care", delta: 12 },
};

const tea: CatalogItem = {
  id: "tea",
  kind: "mandatory",
  price: 2,
  effect: { meter: "care", delta: 2 },
};

const vitamins: CatalogItem = {
  id: "vitamins",
  kind: "mandatory",
  price: 5,
  effect: { meter: "care", delta: 5 },
};

const pizza: CatalogItem = {
  id: "pizza",
  kind: "optional",
  price: 15,
  effect: { meter: "care", delta: 10 },
};

const iceCream: CatalogItem = {
  id: "ice-cream",
  kind: "optional",
  price: 4,
  effect: { meter: "mood", delta: 5 },
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
    game.purchase(profileId, dayId, soup);
    game.purchase(profileId, dayId, pizza);
    expect(game.listAchievements(profileId)).toEqual([]);

    game.purchase(profileId, dayId, iceCream);
    expect(game.listAchievements(profileId)).toEqual([{ id: "sweets", dayN: 1, celebrated: false }]);

    game.celebrateAchievement(profileId, "sweets");
    expect(game.listAchievements(profileId)).toEqual([{ id: "sweets", dayN: 1, celebrated: true }]);
  });

  it("records Питомец здоров only when Суп, Чай, and Витамины share the day", () => {
    const { game, profileId, dayId } = openProfile();
    game.purchase(profileId, dayId, soup);
    game.purchase(profileId, dayId, tea);
    expect(game.listAchievements(profileId)).toEqual([]);

    game.purchase(profileId, dayId, vitamins);
    expect(game.listAchievements(profileId)).toEqual([{ id: "sick_day", dayN: 1, celebrated: false }]);
  });

  it("earns Проценты пришли when the Вклад is paid, not when it is opened", () => {
    const { game, profileId, dayId } = openProfile();
    expect(game.openDeposit(profileId, dayId, "short", 10)).toMatchObject({ status: "ok", maturesDayN: 4 });
    expect(game.listAchievements(profileId)).toEqual([]);

    let current = dayId;
    for (let step = 0; step < 3; step += 1) {
      game.closeDay(profileId, [soup]);
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
