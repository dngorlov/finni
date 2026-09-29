import { ManualClock, nextDayUnlocked } from "../../core/clock";
import type { Clock } from "../../core/clock";
import type { CatalogItem } from "../../core/economy";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { META_KEYS } from "../metaKeys";
import { MIGRATIONS } from "../migrations";
import { accessorySeenKey, createGameRepository, finaleSeenKey } from "../repositories/gameRepository";
import { runMigrations } from "../runMigrations";
import * as schema from "../schema";
import { openMemoryGame } from "../testSupport/memoryDb";

const GOALS = [
  { key: "skateboard", cost: 90 },
  { key: "telescope", cost: 160 },
  { key: "bike", cost: 240 },
] as const;

const lunch: CatalogItem = {
  id: "lunch",
  kind: "mandatory",
  price: 12,
  effect: { meter: "care", delta: 10 },
  also: { meter: "mood", delta: 5 },
};
const toy: CatalogItem = {
  id: "toy",
  kind: "optional",
  price: 25,
  effect: { meter: "mood", delta: 10 },
};
const candy: CatalogItem = {
  id: "candy",
  kind: "optional",
  price: 5,
  effect: { meter: "mood", delta: 5 },
};
const skateboard: CatalogItem = {
  id: "skateboard",
  kind: "optional",
  price: 90,
  effect: { meter: "mood", delta: 12 },
  once: true,
};

const tinyCatalog: CatalogItem[] = [lunch, toy, candy];

class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(next: Date): void {
    this.current = next;
  }
  isNextDayUnlocked(lastClosedAt: Date, isDemo: boolean): boolean {
    return nextDayUnlocked(this.now(), lastClosedAt, isDemo);
  }
}

function seed(clock?: Clock) {
  const env = openMemoryGame(clock);
  const profileId = env.game.createProfile({
    name: "Миша",
    species: "sp1",
    color: "c1",
    accessory: "a1",
    petName: "Пух",
    contentVersion: 1,
    goals: GOALS,
    activeGoalKey: "skateboard",
  });
  return { ...env, profileId };
}

function sums(sqlite: import("better-sqlite3").Database, profileId: string) {
  const balance = sqlite.prepare("SELECT balance FROM profiles WHERE id = ?").get(profileId) as {
    balance: number;
  };
  const tx = sqlite
    .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE profileId = ?")
    .get(profileId) as { total: number };
  const pot = sqlite
    .prepare(
      `SELECT COALESCE(SUM(CASE kind WHEN 'in' THEN amount ELSE -amount END), 0) AS pot
       FROM savingsTransfers WHERE profileId = ?`,
    )
    .get(profileId) as { pot: number };
  return { balance: balance.balance, txSum: tx.total, pot: pot.pot };
}

describe("grants and the balance invariant", () => {
  it("creates a Профиль ребёнка when the runtime has no global crypto", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
    try {
      const { game } = openMemoryGame();
      const profileId = game.createProfile({
        name: "Миша",
        species: "sp1",
        color: "c1",
        accessory: "a1",
        petName: "Пух",
        contentVersion: 1,
        goals: GOALS,
        activeGoalKey: "skateboard",
      });

      expect(game.getProfile(profileId).petName).toBe("Пух");
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "crypto", descriptor);
      } else {
        delete (globalThis as { crypto?: Crypto }).crypto;
      }
    }
  });

  it("completes Первый запуск atomically and is idempotent for the same profile id", () => {
    const { game, meta, sqlite } = openMemoryGame();
    const input = {
      id: "first-run-profile",
      name: "Миша",
      species: "sp2",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      contentVersion: 1,
      goals: GOALS,
      activeGoalKey: "skateboard",
    };

    expect(game.completeFirstRun(input)).toBe(input.id);
    expect(game.completeFirstRun(input)).toBe(input.id);
    expect(meta.get(META_KEYS.activeProfileId)).toBe(input.id);
    expect(meta.get(META_KEYS.onboardingDone)).toBe("1");
    expect(sums(sqlite, input.id)).toEqual({ balance: 100, txSum: 100, pot: 0 });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM profiles WHERE id = ?").get(input.id),
    ).toEqual({ count: 1 });
  });

  it("rolls back the profile and Стартовый бюджет when activation fails", () => {
    const { game, sqlite } = openMemoryGame();
    sqlite.exec(`
      CREATE TRIGGER fail_first_run_activation
      BEFORE INSERT ON meta
      WHEN NEW.key = 'activeProfileId'
      BEGIN
        SELECT RAISE(ABORT, 'activation failed');
      END;
    `);

    const input = {
      id: "rolled-back-profile",
      name: "Миша",
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      contentVersion: 1,
      goals: GOALS,
      activeGoalKey: "skateboard",
    };

    expect(() => game.completeFirstRun(input)).toThrow("activation failed");
    expect(
      sqlite.prepare("SELECT COUNT(*) AS count FROM profiles WHERE id = ?").get("rolled-back-profile"),
    ).toEqual({ count: 0 });
    expect(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM transactions WHERE profileId = ?")
        .get("rolled-back-profile"),
    ).toEqual({ count: 0 });

    sqlite.exec("DROP TRIGGER fail_first_run_activation");
    expect(game.completeFirstRun(input)).toBe(input.id);
    expect(sums(sqlite, input.id)).toEqual({ balance: 100, txSum: 100, pot: 0 });
  });

  it("grants 100 at profile creation and does not add coins when a day opens", () => {
    const { game, sqlite, profileId } = seed();

    expect(game.getProfile(profileId)).toMatchObject({
      balance: 100,
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      name: "Миша",
    });
    expect(sums(sqlite, profileId)).toEqual({ balance: 100, txSum: 100, pot: 0 });

    const day = game.openDay(profileId);
    expect(day).toMatchObject({ status: "opened", n: 1 });
    expect(game.getProfile(profileId).balance).toBe(100);
    expect(sums(sqlite, profileId).txSum).toBe(100);

    const again = game.openDay(profileId);
    expect(again).toMatchObject({ status: "opened", n: 1 });
    expect(game.getProfile(profileId).balance).toBe(100);
  });
});

describe("plan validation", () => {
  it("lets a draft change, keeps a confirmed plan editable until a purchase, and blocks an over-budget confirm", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    const { dayId } = opened;

    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 5, savings: 10 });
    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 8, savings: 10 });

    const over = game.saveDraftPlan(profileId, dayId, { mandatory: 80, optional: 80, savings: 80 });
    expect(over).toBeUndefined();
    expect(game.confirmPlan(profileId, dayId)).toEqual({ ok: false, remainder: -140 });

    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 8, savings: 10 });
    expect(game.confirmPlan(profileId, dayId)).toEqual({ ok: true });

    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 0, savings: 0 });
    expect(game.transferToSavings(profileId, dayId, 10)).toMatchObject({ status: "ok" });
    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 4, savings: 10 });
    expect(() => game.saveDraftPlan(profileId, dayId, { mandatory: 80, optional: 80, savings: 80 })).toThrow(
      /больше монет/,
    );

    expect(game.purchase(profileId, dayId, lunch)).toEqual({ status: "ok" });
    expect(() => game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 1, savings: 0 })).toThrow(
      /подтверждён/,
    );

    const plan = sqlite.prepare("SELECT status, mandatory, optional, savings FROM plans WHERE dayId = ?").get(dayId) as {
      status: string;
      mandatory: number;
      optional: number;
      savings: number;
    };
    expect(plan).toEqual({ status: "confirmed", mandatory: 12, optional: 4, savings: 10 });
  });
});

describe("debit", () => {
  it("writes the purchase and history, raises Сытость, and refuses an over-balance buy", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(game.purchase(profileId, opened.dayId, lunch)).toEqual({ status: "ok" });
    expect(game.getProfile(profileId)).toMatchObject({ balance: 88, care: 60, mood: 55 });
    expect(sums(sqlite, profileId)).toMatchObject({ balance: 88, txSum: 88 });

    const purchase = sqlite
      .prepare("SELECT itemId, price FROM purchases WHERE profileId = ?")
      .get(profileId) as { itemId: string; price: number };
    expect(purchase).toEqual({ itemId: "lunch", price: 12 });

    const events = sqlite
      .prepare("SELECT meter, delta, source FROM meterEvents WHERE profileId = ? ORDER BY meter")
      .all(profileId) as { meter: string; delta: number; source: string }[];
    expect(events).toEqual([
      { meter: "care", delta: 10, source: "purchase:lunch" },
      { meter: "mood", delta: 5, source: "purchase:lunch" },
    ]);

    const cheap: CatalogItem = { ...toy, price: 200 };
    expect(game.purchase(profileId, opened.dayId, cheap)).toEqual({ status: "blocked", missing: 112 });
    expect(game.getProfile(profileId).balance).toBe(88);
    expect(game.getProfile(profileId).balance).toBeGreaterThanOrEqual(0);
  });
});

describe("savings", () => {
  it("deposits and withdrawals keep the pot ≥ 0, fund a Цель without spending it or moving mood, and show «—» before the first transfer", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    const { dayId } = opened;

    expect(game.savingsState(profileId).estimateDays).toBeNull();

    expect(game.transferToSavings(profileId, dayId, 15)).toEqual({ status: "ok", achieved: false });
    expect(game.savingsState(profileId)).toMatchObject({
      pot: 15,
      estimateDays: 5,
      activeGoal: { key: "skateboard", remaining: 75, achieved: false },
    });

    expect(game.withdrawFromSavings(profileId, dayId, 5)).toEqual({ ok: true, potAfter: 10 });
    expect(game.withdrawFromSavings(profileId, dayId, 40)).toEqual({ ok: false, potAfter: -30 });
    expect(sums(sqlite, profileId).pot).toBe(10);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);

    const attributed = sqlite
      .prepare("SELECT goalId FROM transactions WHERE kind = 'savings_in' AND profileId = ?")
      .get(profileId) as { goalId: string };
    expect(attributed.goalId).toBe("skateboard");

    expect(game.transferToSavings(profileId, dayId, 80)).toMatchObject({ status: "ok", achieved: true });
    const state = game.savingsState(profileId);
    expect(state.pot).toBe(90);
    expect(state.activeGoal).toMatchObject({
      key: "skateboard",
      cost: 90,
      remaining: 0,
      achieved: true,
    });
    expect(game.getProfile(profileId).mood).toBe(50);
    const journalKinds = game.listJournal(profileId).filter((row) => row.kind === "savings_out");
    expect(journalKinds).toHaveLength(1);
    expect(journalKinds[0]).toMatchObject({ amount: 5, kind: "savings_out" });
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);

    expect(game.withdrawFromSavings(profileId, dayId, 1)).toEqual({ ok: true, potAfter: 89 });
    expect(game.transferToSavings(profileId, dayId, 1)).toMatchObject({ status: "ok", achieved: false });
    expect(game.savingsState(profileId)).toMatchObject({
      pot: 90,
      activeGoal: { key: "skateboard", remaining: 0, achieved: true },
    });
    expect(game.getProfile(profileId).mood).toBe(50);
  });
});

function playScoredDay(game: ReturnType<typeof seed>["game"], profileId: string) {
  const opened = game.openDay(profileId);
  if (opened.status !== "opened") throw new Error("expected opened");
  game.saveDraftPlan(profileId, opened.dayId, { mandatory: 12, optional: 5, savings: 15 });
  game.confirmPlan(profileId, opened.dayId);
  game.purchase(profileId, opened.dayId, lunch);
  game.purchase(profileId, opened.dayId, candy);
  game.transferToSavings(profileId, opened.dayId, 15);
  return game.closeDay(profileId, tinyCatalog);
}

describe("stages", () => {
  it("does not move Этап when a day closes", () => {
    const { game, profileId } = seed();
    const close1 = playScoredDay(game, profileId);
    expect(close1.score).toBe(4);
    expect(close1.stage).toBe("novice");
    expect(close1.stageExplanation).toBeNull();
    expect(game.getProfile(profileId).stage).toBe("novice");
  });

  it("moves Этап one step when the Цель is bought from Копилка", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.transferToSavings(profileId, opened.dayId, 90);
    const bought = game.purchaseFromSavings(profileId, opened.dayId, {
      id: "skateboard",
      kind: "optional",
      price: 90,
      effect: { meter: "mood", delta: 12 },
      once: true,
    });
    expect(bought).toMatchObject({ status: "ok", stageExplanation: "Теперь ты Про!" });
    expect(game.getProfile(profileId).stage).toBe("pro");
    expect(game.savingsState(profileId).activeGoal).toBeNull();
  });

  it("holds Этап until cheaper Свои цели add up to the Порог, and hides that rule from a preset", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    const { dayId } = opened;
    const prices = [60, 75, 90];

    const buy = (name: string, price: number) => {
      game.setCustomGoal(profileId, { name, icon: "🎈", price, presetPrices: prices });
      const active = game.savingsState(profileId).activeGoal;
      if (!active) throw new Error("expected goal");
      game.transferToSavings(profileId, dayId, price);
      return game.purchaseFromSavings(profileId, dayId, {
        id: active.key,
        kind: "optional",
        price,
        effect: { meter: "mood", delta: 10 },
        once: true,
      });
    };

    expect(game.savingsState(profileId).activeGoal).toMatchObject({ custom: false, threshold: null });
    expect(buy("Наклейки", 20)).toMatchObject({ status: "ok", stageExplanation: null, stageHeld: true });
    expect(game.getProfile(profileId).stage).toBe("novice");
    expect(game.savingsState(profileId).stageCredit).toBe(20);

    game.setCustomGoal(profileId, { name: "Рюкзак", icon: "🎒", price: 60, presetPrices: prices });
    expect(game.savingsState(profileId).activeGoal).toMatchObject({
      custom: true,
      name: "Рюкзак",
      icon: "🎒",
      cost: 60,
      threshold: 60,
    });

    expect(buy("Мяч", 20)).toMatchObject({ stageHeld: true });
    expect(game.savingsState(profileId).stageCredit).toBe(40);
    expect(buy("Корм", 20)).toMatchObject({ stageExplanation: "Теперь ты Про!" });
    expect(game.getProfile(profileId).stage).toBe("pro");
    expect(game.savingsState(profileId)).toMatchObject({ stageCredit: 0, activeGoal: null });
  });
});

describe("day gating", () => {
  it("opens the next Игровой день as soon as the previous one is closed, without waiting for the clock", () => {
    const clock = new FakeClock(new Date(2026, 8, 19, 18, 0, 0));
    const { game, profileId } = seed(clock);

    const first = game.openDay(profileId);
    if (first.status !== "opened") throw new Error("expected opened");
    game.closeDay(profileId, tinyCatalog);

    expect(game.openDay(profileId)).toMatchObject({ status: "opened", n: 2 });
    expect(game.getProfile(profileId).balance).toBe(100);
    expect(game.openDay(profileId)).toMatchObject({ status: "opened", n: 2 });
  });

  it("opens days back-to-back under a ManualClock", () => {
    const clock = new ManualClock(new Date(2026, 8, 19, 12, 0, 0));
    const { game, profileId } = seed(clock);

    const ids = [];
    for (let n = 1; n <= 5; n += 1) {
      const opened = game.openDay(profileId);
      if (opened.status !== "opened") throw new Error(`day ${n} blocked`);
      ids.push(opened.n);
      game.closeDay(profileId, tinyCatalog);
    }
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });
});

const pinnedLesson = {
  pin: { x: 0, y: 0, district: "центр" },
  correction: false,
  comingSoon: false,
};

describe("task reward", () => {
  it("closes the open Игровой день when a pinned Урок is first claimed, and keeps those coins on that day", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_what", 10, {
        task: pinnedLesson,
        catalog: tinyCatalog,
      }),
    ).toBe(10);

    expect(game.dayState(profileId)).toMatchObject({ open: false, n: 1, dayId: opened.dayId });
    expect(game.getProfile(profileId)).toMatchObject({ balance: 110, care: 35, mood: 35 });
    expect(game.lastClosedDay(profileId)?.meterDeltas.noPlan).toBe(0);
    expect(game.lastClosedDay(profileId)?.n).toBe(1);
  });

  it("drops Счастье once an open План is left unconfirmed, including a draft", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.claimTaskReward(profileId, opened.dayId, "budget_plan", 10, {
      task: pinnedLesson,
      catalog: tinyCatalog,
    });
    expect(game.getProfile(profileId).mood).toBe(35);

    const next = game.openDay(profileId);
    if (next.status !== "opened") throw new Error("expected opened");
    game.saveDraftPlan(profileId, next.dayId, { mandatory: 12, optional: 0, savings: 0 });
    const closed = game.closeDay(profileId, tinyCatalog);
    expect(closed.meterDeltas).toMatchObject({ dailyMood: -15, overspend: 0, noPlan: -10, mood: -25 });
    expect(closed.planConfirmed).toBe(false);
    expect(game.getProfile(profileId).mood).toBe(10);
  });

  it("drops Счастье when Демо-режим ends a day with no План", () => {
    const { game } = seed();
    const profileId = game.createProfile({
      name: "Демо",
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Демо",
      contentVersion: 1,
      goals: GOALS,
      activeGoalKey: "skateboard",
      isDemo: true,
    });
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    const closed = game.closeDay(profileId, tinyCatalog);
    expect(closed.meterDeltas.noPlan).toBe(-10);
    expect(game.getProfile(profileId).mood).toBe(25);
  });

  it("leaves the Игровой день open for a replay, a mini-game, and a correction", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(game.claimTaskReward(profileId, opened.dayId, "budget_what", 10)).toBe(10);
    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_what", 10, {
        task: pinnedLesson,
        catalog: tinyCatalog,
      }),
    ).toBe(0);
    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_game", 10, {
        task: { parent: "budget_what" },
        catalog: tinyCatalog,
      }),
    ).toBe(10);
    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_fix_backpack", 10, {
        task: { correction: true },
        catalog: tinyCatalog,
      }),
    ).toBe(10);

    expect(game.dayState(profileId).open).toBe(true);
    expect(game.getProfile(profileId)).toMatchObject({ balance: 130, care: 50 });
  });

  it("pays only the improvement over the best run, so replays cannot farm coins", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 0)).toBe(0);
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 6)).toBe(6);
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 4)).toBe(0);
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 10)).toBe(4);
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 10)).toBe(0);
    expect(game.listTaskProgress(profileId)).toEqual([
      expect.objectContaining({
        taskKey: "budget_first_plan",
        status: "completed",
        rewardPaid: true,
        bestReward: 10,
        correctAnswers: 0,
        scoredAnswers: 0,
      }),
    ]);
    expect(game.getProfile(profileId).balance).toBe(110);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
  });

  it("applies option effects, scene coins, and spawned correction tasks", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    game.applyTaskStep(profileId, opened.dayId, {
      next: "exit",
      verdict: "bad",
      explanation: "исправить",
      effects: [
        { meter: "mood", delta: 5 },
        { meter: "care", delta: -15 },
        { coins: 2 },
      ],
      spawnTask: "budget_fix_backpack",
    });

    expect(game.getProfile(profileId)).toMatchObject({ mood: 55, care: 35, balance: 102 });
    const spawned = sqlite
      .prepare("SELECT status FROM taskProgress WHERE taskKey = 'budget_fix_backpack'")
      .get() as { status: string };
    expect(spawned.status).toBe("available");
  });

  it("lets task step and reward write against the last closed day while waiting", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.closeDay(profileId, tinyCatalog);
    expect(game.dayState(profileId)).toMatchObject({ open: false, dayId: opened.dayId });

    expect(() => game.purchase(profileId, opened.dayId, lunch)).toThrow(/уже закрыт/);

    game.applyTaskStep(profileId, opened.dayId, {
      next: "exit",
      verdict: "good",
      explanation: "replay",
      effects: [],
      spawnTask: "budget_fix_backpack",
    });
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 10)).toBe(10);
    expect(game.listTaskProgress(profileId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskKey: "budget_fix_backpack",
          status: "available",
          rewardPaid: false,
          bestReward: 0,
          correctAnswers: 0,
          scoredAnswers: 0,
          firstCompletedAt: null,
        }),
        expect.objectContaining({ taskKey: "budget_first_plan", status: "completed", rewardPaid: true, bestReward: 10 }),
      ]),
    );
  });

  it("sums first answers and keeps the day of the first completion", () => {
    const clock = new FakeClock(new Date(2026, 8, 25, 15, 0, 0));
    const { game, profileId } = seed(clock);
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_what", 6, undefined, { correct: 1, scored: 2 }),
    ).toBe(6);
    const first = game.listTaskProgress(profileId)[0];
    expect(first).toMatchObject({
      correctAnswers: 1,
      scoredAnswers: 2,
      firstCompletedAt: clock.now().getTime(),
      completedAt: clock.now().getTime(),
    });

    clock.set(new Date(2026, 8, 26, 15, 0, 0));
    expect(
      game.claimTaskReward(profileId, opened.dayId, "budget_what", 10, undefined, { correct: 2, scored: 2 }),
    ).toBe(4);
    expect(game.listTaskProgress(profileId)).toEqual([
      expect.objectContaining({
        taskKey: "budget_what",
        correctAnswers: 3,
        scoredAnswers: 4,
        bestReward: 10,
        firstCompletedAt: first?.firstCompletedAt,
        completedAt: clock.now().getTime(),
      }),
    ]);
    expect(() =>
      game.claimTaskReward(profileId, opened.dayId, "budget_what", 10, undefined, { correct: 3, scored: 2 }),
    ).toThrow(/статистика ответов/);
    expect(game.listTaskProgress(profileId)[0]).toMatchObject({ correctAnswers: 3, scoredAnswers: 4 });
  });
});

describe("schema roundtrip", () => {
  it("stores profile, purchases, savings, goal and task progress as real SQL rows", () => {
    const { game, sqlite, profileId, meta } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.purchase(profileId, opened.dayId, lunch);
    game.transferToSavings(profileId, opened.dayId, 15);
    game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 10);
    meta.set("activeProfileId", profileId);

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "profiles",
        "days",
        "plans",
        "transactions",
        "purchases",
        "savingsTransfers",
        "goals",
        "petState",
        "meterEvents",
        "dayScores",
        "taskProgress",
        "meta",
      ]),
    );
    expect(meta.get("activeProfileId")).toBe(profileId);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
  });
});

describe("Удалить профиль", () => {
  it("removes that Профиль ребёнка and leaves a Демо-режим profile", () => {
    const { game } = openMemoryGame();
    const childId = game.createProfile({
      name: "Миша",
      species: "sp1",
      color: "c1",
      accessory: "a1",
      petName: "Пух",
      contentVersion: 1,
      goals: GOALS,
      activeGoalKey: "skateboard",
    });
    const opened = game.openDay(childId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.purchase(childId, opened.dayId, lunch);
    game.transferToSavings(childId, opened.dayId, 15);
    game.claimTaskReward(childId, opened.dayId, "budget_first_plan", 10);

    const demoId = game.createProfile({
      name: "Демо",
      species: "sp2",
      color: "c2",
      accessory: "a2",
      petName: "Демо",
      isDemo: true,
      contentVersion: 1,
      goals: GOALS,
      activeGoalKey: "skateboard",
    });
    game.openDay(demoId);

    game.deleteProfile(childId);

    expect(() => game.getProfile(childId)).toThrow(/не найден/);
    expect(game.getProfile(demoId)).toMatchObject({ name: "Демо", isDemo: true, petName: "Демо" });
  });
});

describe("day and journal reads", () => {
  it("returns dayState, journal, goals, and today's purchased ids", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(game.dayState(profileId)).toMatchObject({
      dayId: opened.dayId,
      n: 1,
      open: true,
      plan: { status: "none", buckets: { mandatory: 0, optional: 0, savings: 0 } },
      available: 100,
      actual: { mandatory: 0, optional: 0, savings: 0 },
    });

    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 12, optional: 5, savings: 10 });
    expect(game.confirmPlan(profileId, opened.dayId)).toEqual({ ok: true });
    expect(game.purchase(profileId, opened.dayId, lunch)).toEqual({ status: "ok" });
    expect(game.transferToSavings(profileId, opened.dayId, 15)).toEqual({ status: "ok", achieved: false });

    expect(game.dayState(profileId)).toMatchObject({
      plan: { status: "confirmed", buckets: { mandatory: 12, optional: 5, savings: 10 } },
      available: 73,
      actual: { mandatory: 12, optional: 0, savings: 15 },
    });
    expect(game.purchasedItemIds(profileId, opened.dayId)).toEqual(["lunch"]);
    expect(game.listGoals(profileId)).toEqual([
      { key: "skateboard", cost: 90, status: "active", isActive: true },
    ]);

    const journal = game.listJournal(profileId);
    expect(journal).toHaveLength(3);
    expect(journal.map((row) => row.labelKey)).toEqual(
      expect.arrayContaining(["savings_in", "purchase:lunch", "starting_grant"]),
    );
    expect(journal.find((row) => row.labelKey === "savings_in")).toMatchObject({
      dayN: 1,
      amount: -15,
      kind: "savings_in",
    });
    expect(journal.find((row) => row.labelKey === "starting_grant")).toMatchObject({
      dayN: 0,
      amount: 100,
    });
  });

  it("returns an expanded day summary from closeDay and lastClosedDay", () => {
    const { game, profileId } = seed();

    expect(game.lastClosedDay(profileId)).toBeNull();
    expect(game.listTaskProgress(profileId)).toEqual([]);

    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    const closed = playScoredDay(game, profileId);

    expect(closed).toMatchObject({
      dayId: opened.dayId,
      n: 1,
      score: 4,
      facts: { mandatoryCovered: true, withinPlan: true, deposited: true },
      plan: { mandatory: 12, optional: 5, savings: 15 },
      planConfirmed: true,
      actual: { mandatory: 12, optional: 5, savings: 15 },
      meterDeltas: { care: -15, mood: -15 },
      stage: "novice",
      previousStage: "novice",
      stageExplanation: null,
    });
    expect(game.lastClosedDay(profileId)).toEqual(closed);
    expect(game.dayState(profileId)).toMatchObject({
      open: false,
      dayId: opened.dayId,
      n: 1,
      plan: { status: "confirmed", buckets: { mandatory: 12, optional: 5, savings: 15 } },
      actual: { mandatory: 12, optional: 5, savings: 15 },
    });
  });

  it("lists task progress after a spawn and a first reward", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    game.applyTaskStep(profileId, opened.dayId, {
      next: "exit",
      verdict: "bad",
      explanation: "исправить",
      effects: [],
      spawnTask: "budget_fix_backpack",
    });
    expect(game.claimTaskReward(profileId, opened.dayId, "budget_first_plan", 10)).toBe(10);

    expect(game.listTaskProgress(profileId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskKey: "budget_fix_backpack", status: "available", rewardPaid: false, bestReward: 0 }),
        expect.objectContaining({ taskKey: "budget_first_plan", status: "completed", rewardPaid: true, bestReward: 10 }),
      ]),
    );
  });
});

describe("Счета and a kept План", () => {
  const medicine: CatalogItem = { id: "medicine", kind: "mandatory", price: 15, effect: { meter: "mood", delta: 20 } };
  const catalogWithMedicine: CatalogItem[] = [...tinyCatalog, medicine];
  // Счета are a coin minimum for Обязательные; any mandatory items reach it.
  const bills = [{ min: 12 }, { min: 27, note: "Сегодня нужно больше" }];

  it("counts today's Счета as covered once Обязательные reach the minimum, without buying every item", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 12, optional: 0, savings: 0 });
    game.confirmPlan(profileId, opened.dayId, 12);
    game.purchase(profileId, opened.dayId, lunch);

    const summary = game.closeDay(profileId, catalogWithMedicine, bills);
    expect(summary.facts.mandatoryCovered).toBe(true);
    expect(summary.meterDeltas.care).toBe(-15);
  });

  it("asks for the higher minimum on its cycle day", () => {
    const { game, profileId } = seed();
    playScoredDay(game, profileId);
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 27, optional: 0, savings: 0 });
    game.confirmPlan(profileId, opened.dayId, 27);
    game.purchase(profileId, opened.dayId, lunch);

    const summary = game.closeDay(profileId, catalogWithMedicine, bills);
    expect(summary.facts.mandatoryCovered).toBe(false);
  });

  it("counts two Обязательные together toward the minimum", () => {
    const { game, profileId } = seed();
    playScoredDay(game, profileId);
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.purchase(profileId, opened.dayId, lunch);
    game.purchase(profileId, opened.dayId, medicine);

    const summary = game.closeDay(profileId, catalogWithMedicine, bills);
    expect(summary.facts.mandatoryCovered).toBe(true);
  });

  it("refuses a План whose Обязательные are below today's Счета", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 5, optional: 0, savings: 0 });
    expect(game.confirmPlan(profileId, opened.dayId, 12).ok).toBe(false);
    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 12, optional: 0, savings: 0 });
    expect(game.confirmPlan(profileId, opened.dayId, 12).ok).toBe(true);
  });

  it("does not call a day «по плану» when the promised Копилка was not put in", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.saveDraftPlan(profileId, opened.dayId, { mandatory: 12, optional: 5, savings: 15 });
    game.confirmPlan(profileId, opened.dayId, 12);
    game.purchase(profileId, opened.dayId, lunch);
    game.transferToSavings(profileId, opened.dayId, 5);

    const summary = game.closeDay(profileId, tinyCatalog, [{ min: 12 }]);
    expect(summary.facts.withinPlan).toBe(false);
  });
});

describe("shop-item Цели", () => {
  function openDay(game: ReturnType<typeof seed>["game"], profileId: string) {
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    return opened.dayId;
  }

  it("rejects Обязательные and owned once items as a Цель, and clearActiveGoal leaves the pot", () => {
    const { game, sqlite, profileId } = seed();
    const dayId = openDay(game, profileId);

    expect(() => game.setActiveGoal(profileId, lunch)).toThrow(/Необходимое/);

    expect(game.transferToSavings(profileId, dayId, 10)).toEqual({ status: "ok", achieved: false });
    game.clearActiveGoal(profileId);
    expect(game.savingsState(profileId)).toMatchObject({ pot: 10, activeGoal: null });
    expect(sums(sqlite, profileId).pot).toBe(10);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);

    game.setActiveGoal(profileId, candy);
    expect(game.savingsState(profileId).activeGoal).toMatchObject({
      key: "candy",
      cost: 5,
      remaining: 0,
      achieved: true,
    });

    expect(game.purchase(profileId, dayId, skateboard)).toEqual({ status: "ok" });
    expect(() => game.setActiveGoal(profileId, skateboard)).toThrow(/куплен/);
    game.setActiveGoal(profileId, candy);
    expect(game.savingsState(profileId).activeGoal).toMatchObject({ key: "candy" });
  });

  it("buys the Цель from Копилка without moving Баланс or writing Из копилки", () => {
    const { game, sqlite, profileId } = seed();
    const dayId = openDay(game, profileId);
    const moodBefore = game.getProfile(profileId).mood;
    const balanceBefore = game.getProfile(profileId).balance;

    expect(game.transferToSavings(profileId, dayId, 50)).toEqual({ status: "ok", achieved: false });
    expect(game.purchaseFromSavings(profileId, dayId, skateboard)).toEqual({
      status: "blocked",
      missing: 40,
    });
    expect(() => game.purchaseFromSavings(profileId, dayId, candy)).toThrow(/цел/i);
    expect(game.transferToSavings(profileId, dayId, 50)).toMatchObject({ status: "ok", achieved: true });
    expect(game.purchaseFromSavings(profileId, dayId, skateboard)).toMatchObject({ status: "ok" });

    expect(game.getProfile(profileId)).toMatchObject({
      balance: balanceBefore - 100,
      mood: moodBefore + 12,
    });
    expect(game.savingsState(profileId)).toMatchObject({ pot: 10, activeGoal: null });
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
    expect(sums(sqlite, profileId).pot).toBe(10);

    const journal = game.listJournal(profileId);
    expect(journal.filter((row) => row.kind === "savings_out")).toHaveLength(0);
    expect(journal.find((row) => row.labelKey === "purchase:skateboard")).toMatchObject({
      kind: "purchase",
      itemId: "skateboard",
    });
    expect(game.boughtAsActiveGoalCount(profileId)).toBe(1);
    expect(() => game.setActiveGoal(profileId, skateboard)).toThrow(/куплен/);
    expect(game.purchase(profileId, dayId, skateboard)).toEqual({ status: "blocked", missing: 0 });
  });

  it("clears the Цель when buying it from Баланс and leaves Копилка", () => {
    const { game, sqlite, profileId } = seed();
    const dayId = openDay(game, profileId);

    expect(game.transferToSavings(profileId, dayId, 10)).toEqual({ status: "ok", achieved: false });
    expect(game.purchase(profileId, dayId, skateboard)).toEqual({ status: "ok" });

    expect(game.savingsState(profileId)).toMatchObject({ pot: 10, activeGoal: null });
    expect(game.getProfile(profileId).mood).toBe(62);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
    expect(game.boughtAsActiveGoalCount(profileId)).toBe(1);
    expect(game.purchase(profileId, dayId, skateboard)).toEqual({ status: "blocked", missing: 0 });
  });

  it("does not count an impulse one-shot toward Целей: N, and candy as Цель still counts", () => {
    const { game, profileId } = seed();
    const dayId = openDay(game, profileId);

    game.clearActiveGoal(profileId);
    expect(game.purchase(profileId, dayId, skateboard)).toEqual({ status: "ok" });
    expect(game.boughtAsActiveGoalCount(profileId)).toBe(0);

    game.setActiveGoal(profileId, candy);
    expect(game.purchase(profileId, dayId, candy)).toEqual({ status: "ok" });
    expect(game.boughtAsActiveGoalCount(profileId)).toBe(1);
    game.setActiveGoal(profileId, candy);
    expect(game.savingsState(profileId).activeGoal).toMatchObject({ key: "candy", cost: 5 });
  });

  it("ignores Копилка-paid optionals in actual.optional, withinPlan, and overspend", () => {
    const { game, profileId } = seed();
    const dayId = openDay(game, profileId);

    game.saveDraftPlan(profileId, dayId, { mandatory: 12, optional: 5, savings: 83 });
    expect(game.confirmPlan(profileId, dayId)).toEqual({ ok: true });
    expect(game.purchase(profileId, dayId, lunch)).toEqual({ status: "ok" });
    expect(game.purchase(profileId, dayId, candy)).toEqual({ status: "ok" });
    expect(game.transferToSavings(profileId, dayId, 83)).toMatchObject({ status: "ok", achieved: false });
    expect(game.purchaseFromSavings(profileId, dayId, { ...skateboard, price: 83 })).toMatchObject({ status: "ok" });

    expect(game.dayState(profileId).actual).toEqual({ mandatory: 12, optional: 5, savings: 83 });

    const closed = game.closeDay(profileId, tinyCatalog.concat(skateboard));
    expect(closed).toMatchObject({
      facts: { mandatoryCovered: true, withinPlan: true, deposited: true },
      actual: { mandatory: 12, optional: 5, savings: 83 },
      meterDeltas: { care: -15, mood: -15 },
      score: 4,
    });
  });

  it("does not treat old status=achieved as ownership and does not refund auto-debits", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const driver = {
      execSync: (sql: string) => {
        sqlite.exec(sql);
      },
      getFirstSync: <T>(sql: string) => (sqlite.prepare(sql).get() as T | undefined) ?? null,
    };
    runMigrations(
      driver,
      MIGRATIONS.filter((migration) => migration.version <= 2),
    );
    sqlite.exec(`
      INSERT INTO profiles (id, name, species, color, accessory, petName, balance, isDemo, contentVersion, createdAt)
      VALUES ('p1', 'Миша', 'sp1', 'c1', 'a1', 'Пух', 10, 0, 1, 1);
      INSERT INTO petState (profileId, care, mood, stage) VALUES ('p1', 50, 50, 0);
      INSERT INTO days (id, profileId, n, openedAt, closedAt) VALUES ('p1#1', 'p1', 1, 1, NULL);
      INSERT INTO transactions (id, profileId, dayId, kind, amount, itemId, goalId, labelKey, createdAt)
      VALUES ('tx1', 'p1', NULL, 'starting_grant', 100, NULL, NULL, 'starting_grant', 1),
             ('tx2', 'p1', 'p1#1', 'savings_in', -90, NULL, 'skateboard', 'savings_in', 2);
      INSERT INTO savingsTransfers (id, profileId, dayId, amount, kind, createdAt)
      VALUES ('s1', 'p1', 'p1#1', 90, 'in', 2),
             ('s2', 'p1', 'p1#1', 90, 'out', 3);
      INSERT INTO goals (id, profileId, key, cost, status, isActive, achievedAt)
      VALUES ('g1', 'p1', 'skateboard', 90, 'achieved', 0, 3),
             ('g2', 'p1', 'telescope', 160, 'active', 1, NULL),
             ('g3', 'p1', 'bike', 240, 'active', 0, NULL);
    `);

    runMigrations(driver, MIGRATIONS);
    const game = createGameRepository(drizzle(sqlite, { schema }), new ManualClock(new Date(2026, 8, 19, 12, 0, 0)));

    expect(game.savingsState("p1")).toMatchObject({
      pot: 0,
      activeGoal: { key: "telescope", cost: 160, remaining: 160, achieved: false },
    });
    expect(game.listGoals("p1")).toEqual([
      { key: "telescope", cost: 160, status: "active", isActive: true },
    ]);
    expect(game.boughtAsActiveGoalCount("p1")).toBe(0);
    game.setActiveGoal("p1", skateboard);
    expect(game.savingsState("p1").activeGoal).toMatchObject({ key: "skateboard", cost: 90 });
    expect(sums(sqlite, "p1")).toEqual({ balance: 10, txSum: 10, pot: 0 });
  });
});

describe("Банк: вклад", () => {
  function nextDay(game: ReturnType<typeof seed>["game"], profileId: string) {
    game.closeDay(profileId, tinyCatalog);
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    return opened.dayId;
  }

  it("takes coins on open, keeps them locked, and pays principal + interest once on the due day", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");

    expect(game.openDeposit(profileId, opened.dayId, "short", 5)).toEqual({ status: "tooSmall", min: 10 });
    expect(game.openDeposit(profileId, opened.dayId, "short", 500)).toMatchObject({ status: "blocked" });
    expect(game.openDeposit(profileId, opened.dayId, "short", 100)).toEqual({
      status: "ok",
      payout: 110,
      maturesDayN: 4,
    });
    expect(game.getProfile(profileId).balance).toBe(0);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
    expect(game.listDeposits(profileId)).toMatchObject([{ amount: 100, payout: 110, daysLeft: 3, status: "open" }]);

    let dayId = nextDay(game, profileId);
    expect(game.collectDeposits(profileId, dayId)).toEqual({ paid: 0, interest: 0, count: 0 });
    dayId = nextDay(game, profileId);
    dayId = nextDay(game, profileId);
    const before = game.getProfile(profileId).balance;
    expect(game.collectDeposits(profileId, dayId)).toEqual({ paid: 110, interest: 10, count: 1 });
    expect(game.collectDeposits(profileId, dayId)).toEqual({ paid: 0, interest: 0, count: 0 });
    expect(game.getProfile(profileId).balance).toBe(before + 110);
    expect(game.listDeposits(profileId)).toMatchObject([{ status: "paid", daysLeft: 0 }]);
    expect(sums(sqlite, profileId).balance).toBe(sums(sqlite, profileId).txSum);
    expect(game.listJournal(profileId).map((row) => row.labelKey)).toEqual(
      expect.arrayContaining(["bank_in", "bank_out"]),
    );
  });

  it("deletes вклады with the profile", () => {
    const { game, sqlite, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    game.openDeposit(profileId, opened.dayId, "long", 20);
    game.deleteProfile(profileId);
    expect((sqlite.prepare("SELECT COUNT(*) AS n FROM deposits").get() as { n: number }).n).toBe(0);
  });
});

describe("Ежедневный подарок", () => {
  it("pays the next step once per calendar day and does not reset or skip a miss", () => {
    const clock = new ManualClock(new Date(2026, 8, 19, 12, 0, 0));
    const { game, sqlite, profileId } = seed(clock);
    game.openDay(profileId);

    expect(game.dailyRewardState(profileId).ready).toBe(true);
    expect(game.claimDailyReward(profileId)).toEqual({ status: "ok", coins: 5 });
    expect(game.claimDailyReward(profileId)).toEqual({ status: "already" });
    expect(game.dailyRewardState(profileId).ready).toBe(false);
    expect(sums(sqlite, profileId)).toEqual({ balance: 105, txSum: 105, pot: 0 });

    clock.advanceDay();
    clock.advanceDay();
    expect(game.dailyRewardState(profileId).cells.map((cell) => cell.status)).toEqual([
      "claimed",
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    expect(game.claimDailyReward(profileId)).toEqual({ status: "ok", coins: 5 });

    clock.advanceDay();
    expect(game.claimDailyReward(profileId)).toEqual({ status: "ok", coins: 10 });
    expect(game.listJournal(profileId).filter((row) => row.labelKey === "daily_reward")).toEqual([
      expect.objectContaining({ amount: 10, kind: "daily_reward" }),
      expect.objectContaining({ amount: 5, kind: "daily_reward" }),
      expect.objectContaining({ amount: 5, kind: "daily_reward" }),
    ]);
  });

  it("starts the track again after the last step", () => {
    const clock = new ManualClock(new Date(2026, 8, 19, 12, 0, 0));
    const { game, profileId } = seed(clock);
    const steps = [5, 5, 10, 10, 15, 15, 20];
    for (let i = 0; i < steps.length; i++) {
      if (i > 0) clock.advanceDay();
      expect(game.claimDailyReward(profileId)).toEqual({ status: "ok", coins: steps[i] });
    }
    clock.advanceDay();
    expect(game.dailyRewardState(profileId).cells[0]?.status).toBe("current");
    expect(game.claimDailyReward(profileId)).toEqual({ status: "ok", coins: 5 });
  });
});

describe("Аксессуар and Внешний вид", () => {
  function buyPreset(game: ReturnType<typeof seed>["game"], profileId: string, dayId: string, key: string, price: number) {
    game.applyTaskStep(profileId, dayId, {
      next: "exit",
      verdict: "good",
      explanation: "чек",
      effects: [{ coins: price }],
    });
    game.setActiveGoal(profileId, { id: key, kind: "optional", price, effect: { meter: "mood", delta: 12 }, once: true });
    const moved = game.transferToSavings(profileId, dayId, price);
    if (moved.status !== "ok") throw new Error("expected transfer");
    return game.purchaseFromSavings(profileId, dayId, { id: key, kind: "optional", price, effect: { meter: "mood", delta: 12 }, once: true });
  }

  it("puts on очки at Про and the шапочка at Миллионер, one card each", () => {
    const { game, profileId } = seed();
    const opened = game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("expected opened");
    expect(game.accessoryUnlock(profileId)).toBeNull();

    expect(buyPreset(game, profileId, opened.dayId, "skateboard", 90)).toMatchObject({ status: "ok" });
    expect(game.getProfile(profileId)).toMatchObject({ stage: "pro", accessory: "a2" });
    expect(game.accessoryUnlock(profileId)).toBe("a2");
    game.celebrateAccessoryUnlock(profileId);
    expect(game.accessoryUnlock(profileId)).toBeNull();

    expect(game.finalePending(profileId)).toBe(false);
    expect(buyPreset(game, profileId, opened.dayId, "telescope", 160)).toMatchObject({ status: "ok" });
    expect(game.getProfile(profileId)).toMatchObject({ stage: "millionaire", accessory: "a3" });
    expect(game.finalePending(profileId)).toBe(true);
    game.celebrateFinale(profileId);
    expect(game.finalePending(profileId)).toBe(false);
    expect(game.accessoryUnlock(profileId)).toBe("a3");
    game.celebrateAccessoryUnlock(profileId);
    expect(game.accessoryUnlock(profileId)).toBeNull();
    expect(game.boughtGoalIds(profileId)).toEqual(["skateboard", "telescope"]);
  });

  it("saves Вид, Окрас, and an opened Аксессуар, and refuses a closed one", () => {
    const { game, profileId } = seed();
    game.setAppearance(profileId, { species: "sp3", color: "c2", accessory: "a1" });
    expect(game.getProfile(profileId)).toMatchObject({ species: "sp3", color: "c2", accessory: "a1" });
    expect(() => game.setAppearance(profileId, { species: "sp3", color: "c2", accessory: "a2" })).toThrow(
      "Этот аксессуар ещё не открыт",
    );
    expect(() => game.setAppearance(profileId, { species: "sp9", color: "c2", accessory: "a1" })).toThrow();
    expect(game.getProfile(profileId).accessory).toBe("a1");
  });

  it("clamps an old a3 profile to what Новичок may wear and cleans the card record on delete", () => {
    const { game, meta, sqlite } = openMemoryGame();
    const profileId = game.createProfile({
      name: "Миша",
      species: "sp2",
      color: "c3",
      accessory: "a3",
      petName: "Пух",
      contentVersion: 1,
      goals: [],
    });
    expect(game.getProfile(profileId).accessory).toBe("a1");
    sqlite.prepare("UPDATE petState SET stage = 1 WHERE profileId = ?").run(profileId);
    expect(game.getProfile(profileId).accessory).toBe("a2");
    expect(game.accessoryUnlock(profileId)).toBe("a2");
    game.celebrateAccessoryUnlock(profileId);
    expect(meta.get(accessorySeenKey(profileId))).toBe("1");
    expect(game.finalePending(profileId)).toBe(false);
    sqlite.prepare("UPDATE petState SET stage = 2 WHERE profileId = ?").run(profileId);
    expect(game.finalePending(profileId)).toBe(true);
    game.celebrateFinale(profileId);
    expect(meta.get(finaleSeenKey(profileId))).toBe("1");
    expect(game.finalePending(profileId)).toBe(false);
    game.deleteProfile(profileId);
    expect(meta.get(accessorySeenKey(profileId))).toBeNull();
    expect(meta.get(finaleSeenKey(profileId))).toBeNull();
  });
});
