import { and, desc, eq, isNotNull, isNull, like } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { localDate, type Clock } from "../../core/clock";
import {
  dailyRewardCalendar,
  dailyRewardReady,
  nextDailyRewardCoins,
  type ClaimDailyRewardResult,
  type DailyRewardView,
} from "../../core/dailyReward";
import { ECONOMY, FEATURES, METERS } from "../../core/config";
import { dayId as makeDayId } from "../../core/days";
import {
  applyMeterDelta,
  billsForDay,
  checkPurchase,
  dayCloseMeterDeltas,
  itemMeterEffects,
  planKept,
  planOpenAtClose,
  validatePlan,
  type CatalogItem,
  type DayBills,
  type PlanBuckets,
} from "../../core/economy";
import { checkDeposit, depositInterest, depositPayout, findOffer, maturesOnDay } from "../../core/bank";
import { customGoalItemId, parseCustomGoalDraft } from "../../core/customGoal";
import { applyGoalProgress, checkWithdrawal, estimateDaysToGoal, potFromTransfers } from "../../core/savings";
import {
  applyStageStep,
  dayScore,
  explainStageChange,
  showStageThreshold,
  STAGE_CODES,
  stageFromCode,
  stageGoalFloor,
  type Stage,
} from "../../core/stages";
import { checkedTally, endsGameDay, rewardTopUp, type AnswerTally, type TaskContent, type TaskStepResult } from "../../core/tasks";
import { earnedAchievementIds, LUNCH_ITEM_ID, orderEarned, type AchievementFacts } from "../../core/achievements";
import { createLocalId } from "../localId";
import { META_KEYS } from "../metaKeys";
import * as tables from "../schema";
import type * as schema from "../schema";

export type GameDb = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

export interface CreateProfileInput {
  id?: string;
  name: string;
  species: string;
  color: string;
  accessory: string;
  petName: string;
  isDemo?: boolean;
  contentVersion: number;
  goals: readonly { key: string; cost: number }[];
  activeGoalKey?: string;
}

export type PurchaseResult =
  | { status: "ok"; stageExplanation?: string | null; stageHeld?: boolean }
  | { status: "blocked"; missing: number };
export type OpenDayResult =
  | { status: "opened"; dayId: string; n: number }
  | { status: "blocked" };
export type ConfirmPlanResult = { ok: true } | { ok: false; remainder: number };
export type WithdrawResult = { ok: true; potAfter: number } | { ok: false; potAfter: number };

export interface DaySummaryView {
  dayId: string;
  n: number;
  score: number;
  facts: { mandatoryCovered: boolean; withinPlan: boolean; deposited: boolean };
  plan: PlanBuckets;
  /** The day's План was confirmed; otherwise `plan` is a draft or empty. */
  planConfirmed: boolean;
  actual: PlanBuckets;
  meterDeltas: { care: number; mood: number; dailyMood: number; overspend: number; noPlan: number };
  stage: Stage;
  previousStage: Stage;
  stageExplanation: string | null;
}

export type CloseDayResult = DaySummaryView;

/** Passed with a reward claim so a pinned Урок can end the open Игровой день. */
export interface PinnedLessonClaim {
  task: Pick<TaskContent, "pin" | "correction" | "parent" | "comingSoon">;
  catalog: readonly CatalogItem[];
  bills?: readonly DayBills[];
}

export interface DepositView {
  id: string;
  amount: number;
  ratePercent: number;
  days: number;
  payout: number;
  maturesDayN: number;
  /** Игровые дни until the payout (0 once paid). */
  daysLeft: number;
  status: "open" | "paid";
}

export type OpenDepositResult =
  | { status: "ok"; payout: number; maturesDayN: number }
  | { status: "tooSmall"; min: number }
  | { status: "blocked"; missing: number };

export interface CollectDepositsResult {
  /** Coins credited to Баланс right now (principal + interest). */
  paid: number;
  interest: number;
  count: number;
}

export interface TaskProgressView {
  taskKey: string;
  status: "available" | "completed";
  rewardPaid: boolean;
  /** Best coins earned on this Задание so far (0 if never finished). */
  bestReward: number;
  /** Fully right first answers across every run of this Задание. */
  correctAnswers: number;
  /** Scored first answers across every run (right, «с ценой», or wrong). */
  scoredAnswers: number;
  /** First completion. Replays leave this where it was. */
  firstCompletedAt: number | null;
  /** Latest completion, including a replay. */
  completedAt: number | null;
}

/** Read model for the hub and PetView (appearance + meters + Баланс). */
export interface ProfileView {
  id: string;
  name: string;
  petName: string;
  species: string;
  color: string;
  accessory: string;
  balance: number;
  isDemo: boolean;
  care: number;
  mood: number;
  stage: Stage;
}

export interface ActiveGoalView {
  key: string;
  cost: number;
  remaining: number;
  achieved: boolean;
  custom: boolean;
  name: string | null;
  icon: string | null;
  /** Порог этапа stored with a Своя цель. Null for a preset. */
  threshold: number | null;
}

export interface SavingsView {
  pot: number;
  estimateDays: number | null;
  activeGoal: ActiveGoalView | null;
  /** Prices of cheaper Свои цели already bought on this Этап. */
  stageCredit: number;
}

export interface DayState {
  dayId: string;
  n: number;
  open: boolean;
  plan: {
    status: "none" | "draft" | "confirmed";
    buckets: PlanBuckets;
  };
  available: number;
  actual: PlanBuckets;
}

export interface JournalEntry {
  id: string;
  dayN: number;
  createdAt: number;
  amount: number;
  kind: string;
  labelKey: string;
  itemId: string | null;
  goalId: string | null;
}

/** A Достижение this profile has earned. `id` is the catalog key. */
export interface EarnedAchievement {
  id: string;
  dayN: number;
  celebrated: boolean;
}

export interface GoalOption {
  key: string;
  cost: number;
  status: "active" | "achieved";
  isActive: boolean;
}

export type TransferResult =
  | { status: "ok"; achieved: boolean }
  | { status: "blocked"; missing: number };

/**
 * Intent-level persistence seam: every coin movement writes its transaction
 * (and purchase/meter rows) atomically and keeps balance == Σ transactions.
 */
export function createGameRepository(db: GameDb, clock: Clock) {
  const nowMs = () => clock.now().getTime();
  const newId = (prefix: string) => createLocalId(prefix);
  const listeners = new Set<() => void>();
  const publish = () => {
    for (const listener of listeners) listener();
  };

  function profile(conn: GameDb, profileId: string) {
    const row = conn.select().from(tables.profiles).where(eq(tables.profiles.id, profileId)).get();
    if (!row) throw new Error(`Профиль ${profileId} не найден`);
    return row;
  }

  function pet(conn: GameDb, profileId: string) {
    const row = conn.select().from(tables.petState).where(eq(tables.petState.profileId, profileId)).get();
    if (!row) throw new Error(`Питомца профиля ${profileId} нет`);
    return row;
  }

  function writeTx(
    conn: GameDb,
    input: {
      profileId: string;
      dayId: string | null;
      kind: string;
      amount: number;
      labelKey: string;
      itemId?: string | null;
      goalId?: string | null;
    },
  ) {
    conn
      .insert(tables.transactions)
      .values({
        id: newId("tx"),
        profileId: input.profileId,
        dayId: input.dayId,
        kind: input.kind,
        amount: input.amount,
        itemId: input.itemId ?? null,
        goalId: input.goalId ?? null,
        labelKey: input.labelKey,
        createdAt: nowMs(),
      })
      .run();
  }

  function setBalance(conn: GameDb, profileId: string, balance: number) {
    if (balance < 0) throw new Error("Баланс не может быть отрицательным");
    conn.update(tables.profiles).set({ balance }).where(eq(tables.profiles.id, profileId)).run();
  }

  function credit(
    conn: GameDb,
    profileId: string,
    dayId: string | null,
    amount: number,
    kind: string,
    labelKey: string,
  ) {
    const row = profile(conn, profileId);
    setBalance(conn, profileId, row.balance + amount);
    writeTx(conn, { profileId, dayId, kind, amount, labelKey });
  }

  function debit(
    conn: GameDb,
    profileId: string,
    dayId: string | null,
    amount: number,
    kind: string,
    labelKey: string,
    extra: { itemId?: string; goalId?: string } = {},
  ): PurchaseResult {
    const row = profile(conn, profileId);
    const check = checkPurchase(row.balance, amount);
    if (check.status === "blocked") return check;
    setBalance(conn, profileId, row.balance - amount);
    writeTx(conn, {
      profileId,
      dayId,
      kind,
      amount: -amount,
      labelKey,
      itemId: extra.itemId,
      goalId: extra.goalId,
    });
    return { status: "ok" };
  }

  function applyMeter(
    conn: GameDb,
    profileId: string,
    dayId: string | null,
    meter: "care" | "mood",
    delta: number,
    source: string,
  ) {
    if (delta === 0) return;
    const row = pet(conn, profileId);
    const current = meter === "care" ? row.care : row.mood;
    const next = applyMeterDelta(current, delta);
    conn
      .update(tables.petState)
      .set(meter === "care" ? { care: next } : { mood: next })
      .where(eq(tables.petState.profileId, profileId))
      .run();
    conn
      .insert(tables.meterEvents)
      .values({
        id: newId("me"),
        profileId,
        dayId,
        meter,
        delta,
        source,
        createdAt: nowMs(),
      })
      .run();
  }

  function planForDay(conn: GameDb, dayId: string) {
    return conn.select().from(tables.plans).where(eq(tables.plans.dayId, dayId)).get();
  }

  function activeGoal(conn: GameDb, profileId: string) {
    return conn
      .select()
      .from(tables.goals)
      .where(and(eq(tables.goals.profileId, profileId), eq(tables.goals.isActive, 1)))
      .get();
  }

  function openDayRow(conn: GameDb, profileId: string) {
    return conn
      .select()
      .from(tables.days)
      .where(and(eq(tables.days.profileId, profileId), isNull(tables.days.closedAt)))
      .get();
  }

  /** Highest Игровой день number so far (0 before the first day). */
  function latestDayN(conn: GameDb, profileId: string): number {
    const last = conn
      .select()
      .from(tables.days)
      .where(eq(tables.days.profileId, profileId))
      .orderBy(desc(tables.days.n))
      .get();
    return last?.n ?? 0;
  }

  function achievementFacts(conn: GameDb, profileId: string): AchievementFacts {
    const purchases = conn.select().from(tables.purchases).where(eq(tables.purchases.profileId, profileId)).all();
    const transfers = conn
      .select()
      .from(tables.savingsTransfers)
      .where(eq(tables.savingsTransfers.profileId, profileId))
      .all();
    const plans = conn.select().from(tables.plans).where(eq(tables.plans.profileId, profileId)).all();
    const closedDays = conn
      .select()
      .from(tables.days)
      .where(and(eq(tables.days.profileId, profileId), isNotNull(tables.days.closedAt)))
      .all();
    const scores = conn.select().from(tables.dayScores).where(eq(tables.dayScores.profileId, profileId)).all();
    const tasks = conn.select().from(tables.taskProgress).where(eq(tables.taskProgress.profileId, profileId)).all();
    const deposits = conn.select().from(tables.deposits).where(eq(tables.deposits.profileId, profileId)).all();
    const savedIn = transfers.filter((row) => row.kind === "in");
    const shelf = purchases.filter((row) => row.boughtAsActiveGoal !== 1);
    return {
      shopBuys: purchases.length,
      lunchBuys: purchases.filter((row) => row.itemId === LUNCH_ITEM_ID).length,
      optionalBuys: shelf.filter((row) => row.kind === "optional").length,
      savingsIns: savedIn.length,
      savedTotal: savedIn.reduce((sum, row) => sum + row.amount, 0),
      goalsBought: purchases.filter((row) => row.boughtAsActiveGoal === 1).length,
      customGoalsBought: purchases.filter((row) => row.boughtAsActiveGoal === 1 && row.itemId.startsWith("custom:")).length,
      plansConfirmed: plans.filter((row) => row.status === "confirmed").length,
      daysClosed: closedDays.length,
      lessonsCompleted: tasks.filter((row) => row.status === "completed").length,
      bankOpens: deposits.length,
      stage: stageFromCode(pet(conn, profileId).stage),
      daysWithinPlan: scores.filter((row) => row.withinPlan === 1).length,
      daysBillsPaid: scores.filter((row) => row.mandatoryCovered === 1).length,
    };
  }

  /** Inserts any Достижения the facts now meet. Already stored ones stay. */
  function recordAchievements(conn: GameDb, profileId: string): void {
    const have = new Set(
      conn
        .select()
        .from(tables.achievements)
        .where(eq(tables.achievements.profileId, profileId))
        .all()
        .map((row) => row.key),
    );
    const dayN = latestDayN(conn, profileId);
    const earnedAt = nowMs();
    for (const key of earnedAchievementIds(achievementFacts(conn, profileId))) {
      if (have.has(key)) continue;
      conn
        .insert(tables.achievements)
        .values({
          id: newId("ach"),
          profileId,
          key,
          dayN,
          earnedAt,
          celebrated: 0,
        })
        .run();
    }
  }

  function requireOpenDay(conn: GameDb, profileId: string, dayId: string) {
    const day = conn.select().from(tables.days).where(eq(tables.days.id, dayId)).get();
    if (!day || day.profileId !== profileId) throw new Error("Игровой день не найден");
    if (day.closedAt !== null) throw new Error("Игровой день уже закрыт");
    return day;
  }

  function requireDayForTask(conn: GameDb, profileId: string, dayId: string) {
    const day = conn.select().from(tables.days).where(eq(tables.days.id, dayId)).get();
    if (!day || day.profileId !== profileId) throw new Error("Игровой день не найден");
    if (day.closedAt === null) return day;
    if (openDayRow(conn, profileId)) throw new Error("Игровой день уже закрыт");
    const last = latestClosedDay(conn, profileId);
    if (!last || last.id !== dayId) throw new Error("Игровой день уже закрыт");
    return day;
  }

  function latestClosedDay(conn: GameDb, profileId: string) {
    return conn
      .select()
      .from(tables.days)
      .where(and(eq(tables.days.profileId, profileId), isNotNull(tables.days.closedAt)))
      .orderBy(desc(tables.days.n))
      .get();
  }

  function emptyBuckets(): PlanBuckets {
    return { mandatory: 0, optional: 0, savings: 0 };
  }

  function planBuckets(plan: { mandatory: number; optional: number; savings: number } | undefined): PlanBuckets {
    return plan
      ? { mandatory: plan.mandatory, optional: plan.optional, savings: plan.savings }
      : emptyBuckets();
  }

  function actualForDay(conn: GameDb, dayId: string): PlanBuckets {
    const bought = conn.select().from(tables.purchases).where(eq(tables.purchases.dayId, dayId)).all();
    const deposits = conn
      .select()
      .from(tables.savingsTransfers)
      .where(and(eq(tables.savingsTransfers.dayId, dayId), eq(tables.savingsTransfers.kind, "in")))
      .all();
    return {
      mandatory: bought.filter((row) => row.kind === "mandatory").reduce((sum, row) => sum + row.price, 0),
      optional: bought
        .filter((row) => row.kind === "optional" && row.paidFrom !== "savings")
        .reduce((sum, row) => sum + row.price, 0),
      savings: deposits.reduce((sum, row) => sum + row.amount, 0),
    };
  }

  function itemPurchased(conn: GameDb, profileId: string, itemId: string): boolean {
    return (
      conn
        .select()
        .from(tables.purchases)
        .where(and(eq(tables.purchases.profileId, profileId), eq(tables.purchases.itemId, itemId)))
        .get() != null
    );
  }

  function clearGoals(conn: GameDb, profileId: string) {
    conn.delete(tables.goals).where(eq(tables.goals.profileId, profileId)).run();
  }

  function writeActiveGoal(
    conn: GameDb,
    profileId: string,
    key: string,
    cost: number,
    custom?: { name: string; icon: string; threshold: number },
  ) {
    clearGoals(conn, profileId);
    conn
      .insert(tables.goals)
      .values({
        id: newId("goal"),
        profileId,
        key,
        cost,
        status: "active",
        isActive: 1,
        achievedAt: null,
        fundedCelebrated: 0,
        name: custom?.name ?? null,
        icon: custom?.icon ?? null,
        custom: custom ? 1 : 0,
        threshold: custom?.threshold ?? null,
      })
      .run();
  }

  function dayStateFrom(
    conn: GameDb,
    profileId: string,
    day: { id: string; n: number },
    open: boolean,
  ): DayState {
    const plan = planForDay(conn, day.id);
    return {
      dayId: day.id,
      n: day.n,
      open,
      plan: {
        status: plan?.status ?? "none",
        buckets: planBuckets(plan),
      },
      available: profile(conn, profileId).balance,
      actual: actualForDay(conn, day.id),
    };
  }

  function readDaySummary(conn: GameDb, profileId: string, dayId: string): DaySummaryView | null {
    const day = conn.select().from(tables.days).where(eq(tables.days.id, dayId)).get();
    const scoreRow = conn.select().from(tables.dayScores).where(eq(tables.dayScores.dayId, dayId)).get();
    if (!day || !scoreRow) return null;
    const stage = stageFromCode(pet(conn, profileId).stage);
    const events = conn
      .select()
      .from(tables.meterEvents)
      .where(and(eq(tables.meterEvents.dayId, dayId), like(tables.meterEvents.source, "day_close%")))
      .all();
    const sum = (meter: "care" | "mood", source?: string) =>
      events
        .filter((event) => event.meter === meter && (source == null || event.source === source))
        .reduce((total, event) => total + event.delta, 0);
    return {
      dayId: day.id,
      n: day.n,
      score: scoreRow.score,
      facts: {
        mandatoryCovered: scoreRow.mandatoryCovered === 1,
        withinPlan: scoreRow.withinPlan === 1,
        deposited: scoreRow.deposited === 1,
      },
      plan: planBuckets(planForDay(conn, dayId)),
      planConfirmed: planForDay(conn, dayId)?.status === "confirmed",
      actual: actualForDay(conn, dayId),
      meterDeltas: {
        care: sum("care"),
        mood: sum("mood"),
        dailyMood: sum("mood", "day_close_need"),
        overspend: sum("mood", "day_close_overspend"),
        noPlan: sum("mood", "day_close_no_plan"),
      },
      stage,
      previousStage: stage,
      stageExplanation: null,
    };
  }

  function insertProfile(conn: GameDb, input: CreateProfileInput, id: string) {
    conn
      .insert(tables.profiles)
      .values({
        id,
        name: input.name,
        species: input.species,
        color: input.color,
        accessory: input.accessory,
        petName: input.petName,
        balance: 0,
        isDemo: input.isDemo ? 1 : 0,
        contentVersion: input.contentVersion,
        createdAt: nowMs(),
      })
      .run();
    conn
      .insert(tables.petState)
      .values({
        profileId: id,
        care: METERS.initialCare,
        mood: METERS.initialMood,
        stage: STAGE_CODES.novice,
        stageCredit: 0,
      })
      .run();
    const seeded = input.activeGoalKey
      ? input.goals.find((goal) => goal.key === input.activeGoalKey)
      : undefined;
    if (seeded) {
      writeActiveGoal(conn, id, seeded.key, seeded.cost);
    }
    credit(conn, id, null, ECONOMY.startingBudget, "starting_grant", "starting_grant");
  }

  function setMeta(conn: GameDb, key: string, value: string) {
    conn
      .insert(tables.meta)
      .values({ key, value })
      .onConflictDoUpdate({ target: tables.meta.key, set: { value } })
      .run();
  }

  function planLessonCompleted(conn: GameDb, profileId: string): boolean {
    const row = conn
      .select()
      .from(tables.taskProgress)
      .where(
        and(eq(tables.taskProgress.profileId, profileId), eq(tables.taskProgress.taskKey, FEATURES.planTaskId)),
      )
      .get();
    return row?.status === "completed";
  }

  function closeOpenDay(
    tx: GameDb,
    profileId: string,
    catalog: readonly CatalogItem[],
    bills: readonly DayBills[],
    options?: { planLessonEndsThisDay?: boolean },
  ): DaySummaryView {
    const day = openDayRow(tx, profileId);
    if (!day) throw new Error("Нет открытого игрового дня");
    const bought = tx.select().from(tables.purchases).where(eq(tables.purchases.dayId, day.id)).all();
    const plan = planForDay(tx, day.id);
    const deposits = tx
      .select()
      .from(tables.savingsTransfers)
      .where(and(eq(tables.savingsTransfers.dayId, day.id), eq(tables.savingsTransfers.kind, "in")))
      .all();
    const mandatoryIds =
      bills.length > 0
        ? billsForDay(day.n, bills).items
        : catalog.filter((item) => item.kind === "mandatory").map((item) => item.id);
    const boughtIds = new Set(bought.map((row) => row.itemId));
    const mandatoryCovered = mandatoryIds.every((id) => boughtIds.has(id));
    const confirmed = plan?.status === "confirmed" ? plan : null;
    const withinPlan = planKept({
      plan: confirmed
        ? { mandatory: confirmed.mandatory, optional: confirmed.optional, savings: confirmed.savings }
        : null,
      actual: actualForDay(tx, day.id),
    });
    const deposited = deposits.length > 0;
    const score = dayScore({ mandatoryCovered, withinPlan, deposited });
    const optionalSpend = bought
      .filter((row) => row.kind === "optional" && row.paidFrom !== "savings")
      .reduce((sum, row) => sum + row.price, 0);
    const deltas = dayCloseMeterDeltas({
      optionalSpend,
      optionalPlan: confirmed ? confirmed.optional : null,
      planMissing:
        confirmed === null &&
        planOpenAtClose({
          isDemo: profile(tx, profileId).isDemo === 1,
          planLessonCompleted: planLessonCompleted(tx, profileId),
          planLessonEndsThisDay: options?.planLessonEndsThisDay === true,
        }),
    });
    if (deltas.care) applyMeter(tx, profileId, day.id, "care", deltas.care, "day_close_food");
    if (deltas.dailyMood) applyMeter(tx, profileId, day.id, "mood", deltas.dailyMood, "day_close_need");
    if (deltas.overspend) applyMeter(tx, profileId, day.id, "mood", deltas.overspend, "day_close_overspend");
    if (deltas.noPlan) applyMeter(tx, profileId, day.id, "mood", deltas.noPlan, "day_close_no_plan");
    tx.insert(tables.dayScores)
      .values({
        id: newId("score"),
        profileId,
        dayId: day.id,
        mandatoryCovered: mandatoryCovered ? 1 : 0,
        withinPlan: withinPlan ? 1 : 0,
        deposited: deposited ? 1 : 0,
        score,
      })
      .run();
    tx.update(tables.days).set({ closedAt: nowMs() }).where(eq(tables.days.id, day.id)).run();
    const summary = readDaySummary(tx, profileId, day.id);
    if (!summary) throw new Error("Нет итогов закрытого дня");
    recordAchievements(tx, profileId);
    return summary;
  }

  return {
    createProfile(input: CreateProfileInput): string {
      const id = input.id ?? createLocalId("profile");
      db.transaction((tx) => {
        insertProfile(tx, input, id);
      });
      return id;
    },

    completeFirstRun(input: CreateProfileInput): string {
      const id = input.id ?? createLocalId("profile");
      const existing = db.select().from(tables.profiles).where(eq(tables.profiles.id, id)).get();
      if (existing) {
        const active = db
          .select()
          .from(tables.meta)
          .where(eq(tables.meta.key, META_KEYS.activeProfileId))
          .get();
        const done = db
          .select()
          .from(tables.meta)
          .where(eq(tables.meta.key, META_KEYS.onboardingDone))
          .get();
        if (active?.value === id && done?.value === "1") return id;
        throw new Error(`Профиль ${id} уже существует`);
      }
      db.transaction((tx) => {
        insertProfile(tx, input, id);
        setMeta(tx, META_KEYS.activeProfileId, id);
        setMeta(tx, META_KEYS.onboardingDone, "1");
      });
      return id;
    },

    getProfile(profileId: string): ProfileView {
      const row = profile(db, profileId);
      const petRow = pet(db, profileId);
      return {
        id: row.id,
        name: row.name,
        petName: row.petName,
        species: row.species,
        color: row.color,
        accessory: row.accessory,
        balance: row.balance,
        isDemo: row.isDemo === 1,
        care: petRow.care,
        mood: petRow.mood,
        stage: stageFromCode(petRow.stage),
      };
    },

    dailyRewardState(profileId: string): DailyRewardView {
      const row = profile(db, profileId);
      const record = { claimed: row.dailyRewardClaimed, claimedOn: row.dailyRewardClaimedOn };
      const today = localDate(clock.now());
      return { ready: dailyRewardReady(record, today), cells: dailyRewardCalendar(record, today) };
    },

    claimDailyReward(profileId: string): ClaimDailyRewardResult {
      const result = db.transaction((tx) => {
        const row = profile(tx, profileId);
        const today = localDate(clock.now());
        if (row.dailyRewardClaimedOn === today) return { status: "already" as const };
        const coins = nextDailyRewardCoins(row.dailyRewardClaimed);
        const open = openDayRow(tx, profileId);
        credit(tx, profileId, open?.id ?? null, coins, "daily_reward", "daily_reward");
        tx.update(tables.profiles)
          .set({
            dailyRewardClaimed: row.dailyRewardClaimed + 1,
            dailyRewardClaimedOn: today,
          })
          .where(eq(tables.profiles.id, profileId))
          .run();
        return { status: "ok" as const, coins };
      });
      publish();
      return result;
    },

    deleteProfile(profileId: string): void {
      db.transaction((tx) => {
        profile(tx, profileId);
        tx.delete(tables.meterEvents).where(eq(tables.meterEvents.profileId, profileId)).run();
        tx.delete(tables.dayScores).where(eq(tables.dayScores.profileId, profileId)).run();
        tx.delete(tables.purchases).where(eq(tables.purchases.profileId, profileId)).run();
        tx.delete(tables.savingsTransfers).where(eq(tables.savingsTransfers.profileId, profileId)).run();
        tx.delete(tables.plans).where(eq(tables.plans.profileId, profileId)).run();
        tx.delete(tables.transactions).where(eq(tables.transactions.profileId, profileId)).run();
        tx.delete(tables.taskProgress).where(eq(tables.taskProgress.profileId, profileId)).run();
        tx.delete(tables.deposits).where(eq(tables.deposits.profileId, profileId)).run();
        tx.delete(tables.achievements).where(eq(tables.achievements.profileId, profileId)).run();
        tx.delete(tables.goals).where(eq(tables.goals.profileId, profileId)).run();
        tx.delete(tables.petState).where(eq(tables.petState.profileId, profileId)).run();
        tx.delete(tables.days).where(eq(tables.days.profileId, profileId)).run();
        tx.delete(tables.profiles).where(eq(tables.profiles.id, profileId)).run();
      });
    },

    openDay(profileId: string): OpenDayResult {
      return db.transaction((tx) => {
        const open = openDayRow(tx, profileId);
        if (open) {
          return { status: "opened" as const, dayId: open.id, n: open.n };
        }
        const last = tx
          .select()
          .from(tables.days)
          .where(eq(tables.days.profileId, profileId))
          .orderBy(desc(tables.days.n))
          .get();
        profile(tx, profileId);
        const n = last ? last.n + 1 : 1;
        const dayId = makeDayId(profileId, n);
        tx.insert(tables.days)
          .values({
            id: dayId,
            profileId,
            n,
            openedAt: nowMs(),
            closedAt: null,
          })
          .run();
        return { status: "opened" as const, dayId, n };
      });
    },

    saveDraftPlan(profileId: string, dayId: string, buckets: PlanBuckets): void {
      db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        if (buckets.mandatory < 0 || buckets.optional < 0 || buckets.savings < 0) {
          throw new Error("Суммы плана не могут быть отрицательными");
        }
        const existing = planForDay(tx, dayId);
        if (existing?.status === "confirmed") {
          throw new Error("План уже подтверждён");
        }
        if (existing) {
          tx.update(tables.plans)
            .set({
              mandatory: buckets.mandatory,
              optional: buckets.optional,
              savings: buckets.savings,
            })
            .where(eq(tables.plans.id, existing.id))
            .run();
          return;
        }
        tx.insert(tables.plans)
          .values({
            id: newId("plan"),
            profileId,
            dayId,
            mandatory: buckets.mandatory,
            optional: buckets.optional,
            savings: buckets.savings,
            status: "draft",
            confirmedAt: null,
          })
          .run();
      });
    },

    /** `minMandatory` — today's Счета floor (see `planMandatoryFloor`). */
    confirmPlan(profileId: string, dayId: string, minMandatory = 0): ConfirmPlanResult {
      const result = db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        const existing = planForDay(tx, dayId);
        if (!existing) throw new Error("Сначала составь план");
        if (existing.status === "confirmed") throw new Error("План уже подтверждён");
        const available = profile(tx, profileId).balance;
        const check = validatePlan(
          { mandatory: existing.mandatory, optional: existing.optional, savings: existing.savings },
          available,
          Math.min(minMandatory, available),
        );
        if (!check.ok) return { ok: false as const, remainder: check.remainder };
        tx.update(tables.plans)
          .set({ status: "confirmed", confirmedAt: nowMs() })
          .where(eq(tables.plans.id, existing.id))
          .run();
        recordAchievements(tx, profileId);
        return { ok: true as const };
      });
      publish();
      return result;
    },

    purchase(profileId: string, dayId: string, item: CatalogItem): PurchaseResult {
      const result = db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        if (item.once && itemPurchased(tx, profileId, item.id)) {
          return { status: "blocked" as const, missing: 0 };
        }
        const result = debit(tx, profileId, dayId, item.price, "purchase", `purchase:${item.id}`, {
          itemId: item.id,
        });
        if (result.status === "blocked") return result;
        const asActive = activeGoal(tx, profileId)?.key === item.id;
        tx.insert(tables.purchases)
          .values({
            id: newId("buy"),
            profileId,
            dayId,
            itemId: item.id,
            price: item.price,
            kind: item.kind,
            paidFrom: "balance",
            boughtAsActiveGoal: asActive ? 1 : 0,
            createdAt: nowMs(),
          })
          .run();
        for (const effect of itemMeterEffects(item)) {
          applyMeter(tx, profileId, dayId, effect.meter, effect.delta, `purchase:${item.id}`);
        }
        if (asActive) clearGoals(tx, profileId);
        recordAchievements(tx, profileId);
        return { status: "ok" as const };
      });
      publish();
      return result;
    },

    transferToSavings(profileId: string, dayId: string, amount: number): TransferResult {
      const result = db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
        const active = activeGoal(tx, profileId);
        const result = debit(tx, profileId, dayId, amount, "savings_in", "savings_in", {
          goalId: active?.key,
        });
        if (result.status === "blocked") return { status: "blocked" as const, missing: result.missing };
        tx.insert(tables.savingsTransfers)
          .values({
            id: newId("sav"),
            profileId,
            dayId,
            amount,
            kind: "in",
            createdAt: nowMs(),
          })
          .run();
        const transfers = tx
          .select()
          .from(tables.savingsTransfers)
          .where(eq(tables.savingsTransfers.profileId, profileId))
          .all();
        const pot = potFromTransfers(transfers);
        let achieved = false;
        if (active) {
          const progress = applyGoalProgress(pot, active.cost);
          if (progress.achieved && active.fundedCelebrated !== 1) {
            achieved = true;
            tx.update(tables.goals)
              .set({ fundedCelebrated: 1 })
              .where(eq(tables.goals.id, active.id))
              .run();
          }
        }
        recordAchievements(tx, profileId);
        return { status: "ok" as const, achieved };
      });
      publish();
      return result;
    },

    withdrawFromSavings(profileId: string, dayId: string, amount: number): WithdrawResult {
      return db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        const transfers = tx
          .select()
          .from(tables.savingsTransfers)
          .where(eq(tables.savingsTransfers.profileId, profileId))
          .all();
        const pot = potFromTransfers(transfers);
        const check = checkWithdrawal(pot, amount);
        if (!check.ok) return { ok: false as const, potAfter: check.potAfter };
        credit(tx, profileId, dayId, amount, "savings_out", "savings_out");
        tx.insert(tables.savingsTransfers)
          .values({
            id: newId("sav"),
            profileId,
            dayId,
            amount,
            kind: "out",
            createdAt: nowMs(),
          })
          .run();
        return { ok: true as const, potAfter: check.potAfter };
      });
    },

    setActiveGoal(profileId: string, item: (CatalogItem & { stage?: Stage }) | string): void {
      db.transaction((tx) => {
        profile(tx, profileId);
        const catalogItem = typeof item === "string" ? null : item;
        const key = typeof item === "string" ? item : item.id;
        if (catalogItem?.kind === "mandatory") {
          throw new Error("Необходимое не может быть Целью");
        }
        if (catalogItem?.stage && catalogItem.stage !== stageFromCode(pet(tx, profileId).stage)) {
          throw new Error("Цель другого Этапа");
        }
        if (catalogItem?.once && itemPurchased(tx, profileId, catalogItem.id)) {
          throw new Error("Этот товар уже куплен");
        }
        const existing = tx
          .select()
          .from(tables.goals)
          .where(and(eq(tables.goals.profileId, profileId), eq(tables.goals.key, key)))
          .get();
        const cost = catalogItem?.price ?? existing?.cost;
        if (cost == null) throw new Error(`Цель ${key} не найдена`);
        writeActiveGoal(tx, profileId, key, cost);
      });
    },

    clearActiveGoal(profileId: string): void {
      db.transaction((tx) => {
        profile(tx, profileId);
        clearGoals(tx, profileId);
      });
    },

    setCustomGoal(
      profileId: string,
      input: { name: string; icon: string; price: number; presetPrices: readonly number[] },
    ): void {
      db.transaction((tx) => {
        profile(tx, profileId);
        const draft = parseCustomGoalDraft(input);
        const threshold = stageGoalFloor(input.presetPrices);
        const key = customGoalItemId(newId("cg"), draft.price, draft.name);
        writeActiveGoal(tx, profileId, key, draft.price, {
          name: draft.name,
          icon: draft.icon,
          threshold,
        });
      });
    },

    purchaseFromSavings(profileId: string, dayId: string, item: CatalogItem): PurchaseResult {
      const result = db.transaction((tx) => {
        requireOpenDay(tx, profileId, dayId);
        const active = activeGoal(tx, profileId);
        if (!active || active.key !== item.id) {
          throw new Error("Купить из копилки можно только текущую Цель");
        }
        if (item.once && itemPurchased(tx, profileId, item.id)) {
          return { status: "blocked" as const, missing: 0 };
        }
        const transfers = tx
          .select()
          .from(tables.savingsTransfers)
          .where(eq(tables.savingsTransfers.profileId, profileId))
          .all();
        const pot = potFromTransfers(transfers);
        if (pot < item.price) {
          return { status: "blocked" as const, missing: item.price - pot };
        }
        tx.insert(tables.savingsTransfers)
          .values({
            id: newId("sav"),
            profileId,
            dayId,
            amount: item.price,
            kind: "out",
            createdAt: nowMs(),
          })
          .run();
        writeTx(tx, {
          profileId,
          dayId,
          kind: "purchase",
          amount: 0,
          labelKey: `purchase:${item.id}`,
          itemId: item.id,
          goalId: item.id,
        });
        tx.insert(tables.purchases)
          .values({
            id: newId("buy"),
            profileId,
            dayId,
            itemId: item.id,
            price: item.price,
            kind: item.kind,
            paidFrom: "savings",
            boughtAsActiveGoal: 1,
            createdAt: nowMs(),
          })
          .run();
        for (const effect of itemMeterEffects(item)) {
          applyMeter(tx, profileId, dayId, effect.meter, effect.delta, `purchase:${item.id}`);
        }
        clearGoals(tx, profileId);
        const petRow = pet(tx, profileId);
        const current = stageFromCode(petRow.stage);
        const custom = active.custom === 1;
        const threshold = active.threshold ?? item.price;
        const step = applyStageStep({
          stage: current,
          custom,
          price: item.price,
          threshold,
          credit: petRow.stageCredit,
        });
        tx.update(tables.petState)
          .set({ stage: STAGE_CODES[step.stage], stageCredit: step.credit })
          .where(eq(tables.petState.profileId, profileId))
          .run();
        const stageHeld =
          showStageThreshold({ stage: current, custom, price: item.price, threshold }) && step.stage === current;
        recordAchievements(tx, profileId);
        return {
          status: "ok" as const,
          stageExplanation: explainStageChange(current, step.stage),
          stageHeld,
        };
      });
      publish();
      return result;
    },

    dayState(profileId: string): DayState {
      const open = openDayRow(db, profileId);
      if (open) return dayStateFrom(db, profileId, open, true);
      const closed = latestClosedDay(db, profileId);
      if (closed) return dayStateFrom(db, profileId, closed, false);
      throw new Error("Нет открытого игрового дня");
    },

    lastClosedDay(profileId: string): DaySummaryView | null {
      profile(db, profileId);
      const last = latestClosedDay(db, profileId);
      if (!last) return null;
      return readDaySummary(db, profileId, last.id);
    },

    /** Вклады of this profile, newest first, with days left against the current Игровой день. */
    listDeposits(profileId: string): DepositView[] {
      profile(db, profileId);
      const today = latestDayN(db, profileId);
      return db
        .select()
        .from(tables.deposits)
        .where(eq(tables.deposits.profileId, profileId))
        .orderBy(desc(tables.deposits.openedAt))
        .all()
        .map((row) => ({
          id: row.id,
          amount: row.amount,
          ratePercent: row.ratePercent,
          days: row.days,
          payout: depositPayout(row.amount, row.ratePercent),
          maturesDayN: row.maturesDayN,
          daysLeft: row.status === "paid" ? 0 : Math.max(0, row.maturesDayN - today),
          status: row.status === "paid" ? ("paid" as const) : ("open" as const),
        }));
    },

    /** Moves `amount` from Баланс into a вклад; it comes back with interest on maturesDayN. */
    openDeposit(profileId: string, dayId: string, offerId: string, amount: number): OpenDepositResult {
      const result = db.transaction((tx) => {
        const day = requireOpenDay(tx, profileId, dayId);
        const offer = findOffer(offerId);
        const check = checkDeposit(profile(tx, profileId).balance, amount);
        if (check.status !== "ok") return check;
        debit(tx, profileId, dayId, amount, "bank_in", "bank_in");
        const maturesDayN = maturesOnDay(day.n, offer.days);
        tx.insert(tables.deposits)
          .values({
            id: newId("dep"),
            profileId,
            amount,
            ratePercent: offer.ratePercent,
            days: offer.days,
            openedDayN: day.n,
            maturesDayN,
            status: "open",
            openedAt: nowMs(),
            paidAt: null,
          })
          .run();
        recordAchievements(tx, profileId);
        return { status: "ok" as const, payout: depositPayout(amount, offer.ratePercent), maturesDayN };
      });
      publish();
      return result;
    },

    /** Pays every вклад whose term ended by today's Игровой день — once, with a Журнал row. */
    collectDeposits(profileId: string, dayId: string): CollectDepositsResult {
      return db.transaction((tx) => {
        const day = requireOpenDay(tx, profileId, dayId);
        const due = tx
          .select()
          .from(tables.deposits)
          .where(and(eq(tables.deposits.profileId, profileId), eq(tables.deposits.status, "open")))
          .all()
          .filter((row) => row.maturesDayN <= day.n);
        let paid = 0;
        let interest = 0;
        for (const row of due) {
          const payout = depositPayout(row.amount, row.ratePercent);
          credit(tx, profileId, dayId, payout, "bank_out", "bank_out");
          tx.update(tables.deposits).set({ status: "paid", paidAt: nowMs() }).where(eq(tables.deposits.id, row.id)).run();
          paid += payout;
          interest += depositInterest(row.amount, row.ratePercent);
        }
        return { paid, interest, count: due.length };
      });
    },

    listTaskProgress(profileId: string): TaskProgressView[] {
      profile(db, profileId);
      return db
        .select()
        .from(tables.taskProgress)
        .where(eq(tables.taskProgress.profileId, profileId))
        .all()
        .map((row) => ({
          taskKey: row.taskKey,
          status: row.status === "completed" ? ("completed" as const) : ("available" as const),
          rewardPaid: row.rewardPaid === 1,
          bestReward: row.bestReward,
          correctAnswers: row.correctAnswers,
          scoredAnswers: row.scoredAnswers,
          firstCompletedAt: row.firstCompletedAt,
          completedAt: row.completedAt,
        }));
    },

    listJournal(profileId: string): JournalEntry[] {
      profile(db, profileId);
      const txs = db
        .select()
        .from(tables.transactions)
        .where(eq(tables.transactions.profileId, profileId))
        .orderBy(desc(tables.transactions.createdAt))
        .all();
      const days = db.select().from(tables.days).where(eq(tables.days.profileId, profileId)).all();
      const nById = new Map(days.map((day) => [day.id, day.n]));
      return txs.map((tx) => ({
        id: tx.id,
        dayN: tx.dayId ? (nById.get(tx.dayId) ?? 0) : 0,
        createdAt: tx.createdAt,
        amount: tx.amount,
        kind: tx.kind,
        labelKey: tx.labelKey,
        itemId: tx.itemId,
        goalId: tx.goalId,
      }));
    },

    listAchievements(profileId: string): EarnedAchievement[] {
      profile(db, profileId);
      const rows = db
        .select()
        .from(tables.achievements)
        .where(eq(tables.achievements.profileId, profileId))
        .all();
      return orderEarned(
        rows.map((row) => ({
          id: row.key,
          dayN: row.dayN,
          celebrated: row.celebrated === 1,
        })),
      );
    },

    celebrateAchievement(profileId: string, id: string): void {
      profile(db, profileId);
      db.update(tables.achievements)
        .set({ celebrated: 1 })
        .where(and(eq(tables.achievements.profileId, profileId), eq(tables.achievements.key, id)))
        .run();
      publish();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    listGoals(profileId: string): GoalOption[] {
      profile(db, profileId);
      return db
        .select()
        .from(tables.goals)
        .where(eq(tables.goals.profileId, profileId))
        .all()
        .map((row) => ({
          key: row.key,
          cost: row.cost,
          status: row.status,
          isActive: row.isActive === 1,
        }));
    },

    purchasedItemIds(profileId: string, dayId: string): string[] {
      requireOpenDay(db, profileId, dayId);
      const bought = db.select().from(tables.purchases).where(eq(tables.purchases.dayId, dayId)).all();
      return [...new Set(bought.map((row) => row.itemId))];
    },

    boughtAsActiveGoalCount(profileId: string): number {
      profile(db, profileId);
      return db
        .select()
        .from(tables.purchases)
        .where(and(eq(tables.purchases.profileId, profileId), eq(tables.purchases.boughtAsActiveGoal, 1)))
        .all().length;
    },

    savingsState(profileId: string): SavingsView {
      const transfers = db
        .select()
        .from(tables.savingsTransfers)
        .where(eq(tables.savingsTransfers.profileId, profileId))
        .all();
      const pot = potFromTransfers(transfers);
      const deposits = transfers.filter((t) => t.kind === "in").map((t) => t.amount);
      const active = activeGoal(db, profileId);
      const stageCredit = pet(db, profileId).stageCredit;
      if (!active) {
        return { pot, estimateDays: null as number | null, activeGoal: null, stageCredit };
      }
      const progress = applyGoalProgress(pot, active.cost);
      return {
        pot,
        estimateDays: estimateDaysToGoal(progress.remaining, deposits),
        stageCredit,
        activeGoal: {
          key: active.key,
          cost: active.cost,
          remaining: progress.remaining,
          achieved: progress.achieved,
          custom: active.custom === 1,
          name: active.name,
          icon: active.icon,
          threshold: active.threshold,
        },
      };
    },

    /**
     * `bills` is the Счета cycle from content: only the items due on this
     * Игровой день count as «необходимое закрыто». An empty cycle falls back
     * to every mandatory catalog item.
     */
    closeDay(
      profileId: string,
      catalog: readonly CatalogItem[],
      bills: readonly DayBills[] = [],
    ): CloseDayResult {
      const result = db.transaction((tx) => closeOpenDay(tx, profileId, catalog, bills));
      publish();
      return result;
    },

    applyTaskStep(profileId: string, dayId: string, result: TaskStepResult): void {
      db.transaction((tx) => {
        requireDayForTask(tx, profileId, dayId);
        for (const effect of result.effects) {
          if (effect.meter && effect.delta) {
            applyMeter(tx, profileId, dayId, effect.meter, effect.delta, "task");
          }
          if (effect.coins && effect.coins > 0) {
            credit(tx, profileId, dayId, effect.coins, "task_scene", "task_scene");
          }
        }
        if (result.spawnTask) {
          const existing = tx
            .select()
            .from(tables.taskProgress)
            .where(
              and(
                eq(tables.taskProgress.profileId, profileId),
                eq(tables.taskProgress.taskKey, result.spawnTask),
              ),
            )
            .get();
          if (!existing) {
            tx.insert(tables.taskProgress)
              .values({
                id: newId("task"),
                profileId,
                taskKey: result.spawnTask,
                status: "available",
                rewardPaid: 0,
                completedAt: null,
              })
              .run();
          }
        }
      });
    },

    /**
     * Finishes a Задание with `earned` coins (score × max, computed by the
     * caller from core/tasks). Pays only the top-up over the best earlier run.
     */
    claimTaskReward(
      profileId: string,
      dayId: string,
      taskId: string,
      earned: number,
      lesson?: PinnedLessonClaim,
      answers?: AnswerTally,
    ): number {
      const paid = db.transaction((tx) => {
        requireDayForTask(tx, profileId, dayId);
        if (earned < 0) throw new Error("Награда не может быть отрицательной");
        const tally = checkedTally(answers);
        const existing = tx
          .select()
          .from(tables.taskProgress)
          .where(and(eq(tables.taskProgress.profileId, profileId), eq(tables.taskProgress.taskKey, taskId)))
          .get();
        const firstCompletion = existing?.status !== "completed";
        const best = existing?.bestReward ?? 0;
        const reward = rewardTopUp(best, earned);
        if (reward > 0) {
          credit(tx, profileId, dayId, reward, "task_reward", `task_reward:${taskId}`);
        }
        const bestReward = Math.max(best, earned);
        const now = nowMs();
        if (existing) {
          tx.update(tables.taskProgress)
            .set({
              status: "completed",
              rewardPaid: bestReward > 0 ? 1 : existing.rewardPaid,
              bestReward,
              correctAnswers: existing.correctAnswers + tally.correct,
              scoredAnswers: existing.scoredAnswers + tally.scored,
              completedAt: now,
              firstCompletedAt: existing.firstCompletedAt ?? now,
            })
            .where(eq(tables.taskProgress.id, existing.id))
            .run();
        } else {
          tx.insert(tables.taskProgress)
            .values({
              id: newId("task"),
              profileId,
              taskKey: taskId,
              status: "completed",
              rewardPaid: bestReward > 0 ? 1 : 0,
              bestReward,
              correctAnswers: tally.correct,
              scoredAnswers: tally.scored,
              completedAt: now,
              firstCompletedAt: now,
            })
            .run();
        }
        if (lesson && firstCompletion && endsGameDay(lesson.task)) {
          closeOpenDay(tx, profileId, lesson.catalog, lesson.bills ?? [], {
            planLessonEndsThisDay: taskId === FEATURES.planTaskId,
          });
        }
        recordAchievements(tx, profileId);
        return reward;
      });
      publish();
      return paid;
    },

  };
}
