import { localDate } from "../../core/clock";
import { ECONOMY, FEATURES, METERS } from "../../core/config";
import { dailyRewardCalendar, dailyRewardReady, nextDailyRewardCoins } from "../../core/dailyReward";
import {
  applyMeterDelta,
  billsCovered,
  billsForDay,
  checkPurchase,
  dayCloseMeterDeltas,
  itemMeterEffects,
  planKept,
  planOpenAtClose,
  validatePlan,
  type CatalogItem,
  type PlanBuckets,
} from "../../core/economy";
import { checkDeposit, depositInterest, depositPayout, findOffer, maturesOnDay } from "../../core/bank";
import { habitStreak, purchaseDaysOf, withHabit } from "../../core/habits";
import { customGoalItemId, parseCustomGoalDraft } from "../../core/customGoal";
import { applyGoalProgress, checkWithdrawal, estimateDaysToGoal, potFromTransfers } from "../../core/savings";
import {
  accessoryUnlocked,
  clampAccessory,
  isAccessoryKey,
  newestAccessory,
  pendingAccessoryUnlock,
} from "../../core/accessories";
import {
  applyStageStep,
  dayScore,
  explainStageChange,
  showStageThreshold,
  STAGE_CODES,
  stageGoalFloor,
  type Stage,
} from "../../core/stages";
import { achievementFactsFrom, earnedAchievementIds, orderEarned, type AchievementDay } from "../../core/achievements";
import { createLocalId } from "../../data/localId";
import { checkedTally, endsGameDay, rewardTopUp, type AnswerTally, type TaskStepResult } from "../../core/tasks";
import { loadContent } from "../../data/content";
import { META_KEYS } from "../../data/metaKeys";
import type {
  CreateProfileInput,
  DayState,
  DaySummaryView,
  EarnedAchievement,
  GoalOption,
  JournalEntry,
  ProfileView,
  TaskProgressView,
} from "../../data/repositories/gameRepository";
import type { SessionPorts } from "../session/types";

type TransferRow = { dayId: string; amount: number; kind: "in" | "out" };
type PurchaseRow = {
  dayId: string;
  itemId: string;
  price: number;
  kind: "mandatory" | "optional";
  paidFrom: "balance" | "savings";
  boughtAsActiveGoal: boolean;
};
type StoredGoal = GoalOption & {
  fundedCelebrated: boolean;
  custom: boolean;
  name: string | null;
  icon: string | null;
  threshold: number | null;
};

type StoredProfile = ProfileView & {
  dayOpen: boolean;
  dayId: string;
  dayN: number;
  goals: StoredGoal[];
  planStatus: DayState["plan"]["status"];
  buckets: PlanBuckets;
  journal: JournalEntry[];
  purchases: PurchaseRow[];
  transfers: TransferRow[];
  scores: number[];
  lastClosed: DaySummaryView | null;
  tasks: TaskProgressView[];
  deposits: StoredDeposit[];
  stageCredit: number;
  /** Mirrors the `accessorySeen:<id>` meta row of the SQLite repository. */
  accessorySeen: number;
  /** Mirrors the `finaleSeen:<id>` meta row. */
  finaleSeen: boolean;
  achievements: EarnedAchievement[];
  dailyRewardClaimed: number;
  dailyRewardClaimedOn: string | null;
  confirmedPlans: number;
  dayMarks: AchievementDay[];
};

function storedTask(
  partial: Pick<TaskProgressView, "taskKey" | "status" | "rewardPaid" | "bestReward"> &
    Partial<Pick<TaskProgressView, "correctAnswers" | "scoredAnswers" | "firstCompletedAt" | "completedAt">>,
): TaskProgressView {
  return {
    correctAnswers: 0,
    scoredAnswers: 0,
    firstCompletedAt: null,
    completedAt: null,
    ...partial,
  };
}

type StoredDeposit = {
  id: string;
  amount: number;
  ratePercent: number;
  days: number;
  maturesDayN: number;
  status: "open" | "paid";
};

function viewOf(row: StoredProfile): ProfileView {
  const {
    dayOpen: _dayOpen,
    dayId: _dayId,
    dayN: _dayN,
    goals: _goals,
    planStatus: _planStatus,
    buckets: _buckets,
    journal: _journal,
    purchases: _purchases,
    transfers: _transfers,
    scores: _scores,
    lastClosed: _lastClosed,
    tasks: _tasks,
    deposits: _deposits,
    stageCredit: _stageCredit,
    accessorySeen: _accessorySeen,
    finaleSeen: _finaleSeen,
    achievements: _achievements,
    dailyRewardClaimed: _dailyRewardClaimed,
    dailyRewardClaimedOn: _dailyRewardClaimedOn,
    confirmedPlans: _confirmedPlans,
    dayMarks: _dayMarks,
    ...view
  } = row;
  return { ...view, accessory: clampAccessory(view.accessory, view.stage) };
}

function requireRow(profiles: Map<string, StoredProfile>, profileId: string): StoredProfile {
  const row = profiles.get(profileId);
  if (!row) throw new Error(`Профиль ${profileId} не найден`);
  return row;
}

function requireOpen(row: StoredProfile, dayId: string): void {
  if (!row.dayOpen || row.dayId !== dayId) throw new Error("Игровой день не найден");
}

function requireDayForTask(row: StoredProfile, dayId: string): void {
  if (row.dayId !== dayId) throw new Error("Игровой день не найден");
}

function appendJournal(
  row: StoredProfile,
  input: {
    amount: number;
    kind: string;
    labelKey: string;
    itemId?: string | null;
    goalId?: string | null;
    dayN?: number;
  },
): void {
  row.journal.unshift({
    id: `tx_${row.journal.length + 1}`,
    dayN: input.dayN ?? (row.dayOpen ? row.dayN : 0),
    createdAt: row.journal.length + 1,
    amount: input.amount,
    kind: input.kind,
    labelKey: input.labelKey,
    itemId: input.itemId ?? null,
    goalId: input.goalId ?? null,
  });
}

/** Same rule as the repository: a habit item's streak comes from earlier days' purchases. */
function purchaseEffects(row: StoredProfile, item: CatalogItem) {
  if (!item.habit) return itemMeterEffects(item);
  return itemMeterEffects(withHabit(item, habitStreak(purchaseDaysOf(row.journal, item.id), row.dayN)));
}

function emptyBuckets(): PlanBuckets {
  return { mandatory: 0, optional: 0, savings: 0 };
}

function actuals(row: StoredProfile): PlanBuckets {
  const today = row.purchases.filter((item) => item.dayId === row.dayId);
  const balancePaid = today.filter((item) => item.paidFrom !== "savings");
  return {
    mandatory: balancePaid.filter((item) => item.kind === "mandatory").reduce((sum, item) => sum + item.price, 0),
    optional: balancePaid.filter((item) => item.kind === "optional").reduce((sum, item) => sum + item.price, 0),
    savings: row.transfers
      .filter((item) => item.dayId === row.dayId && item.kind === "in")
      .reduce((sum, item) => sum + item.amount, 0),
  };
}

function ownsItem(row: StoredProfile, itemId: string): boolean {
  return row.purchases.some((item) => item.itemId === itemId);
}

function dayStateOf(row: StoredProfile): DayState {
  if (!row.dayOpen && !row.lastClosed) throw new Error("Нет открытого игрового дня");
  return {
    dayId: row.dayId,
    n: row.dayN,
    open: row.dayOpen,
    plan: { status: row.planStatus, buckets: { ...row.buckets } },
    available: row.balance,
    actual: actuals(row),
  };
}

/** In-memory game + meta adapters for jest-expo (no SQLite). */
export function createFakePorts(): SessionPorts {
  const meta = new Map<string, string>();
  const profiles = new Map<string, StoredProfile>();
  const listeners = new Set<() => void>();
  let planLessonEndsThisDay = false;

  function publish() {
    for (const listener of listeners) listener();
  }

  function achievementFacts(row: StoredProfile) {
    return achievementFactsFrom({
      purchases: row.purchases.map((item) => ({
        dayId: item.dayId,
        itemId: item.itemId,
        boughtAsActiveGoal: item.boughtAsActiveGoal,
      })),
      savingsInDayIds: row.transfers.filter((item) => item.kind === "in").map((item) => item.dayId),
      plansConfirmed: row.confirmedPlans,
      daysClosed: row.scores.length,
      scores: row.dayMarks,
      lessonsCompleted: row.tasks.filter((task) => task.status === "completed").length,
      bankPaid: row.deposits.filter((dep) => dep.status === "paid").length,
      stage: row.stage,
    });
  }

  function record(row: StoredProfile) {
    const have = new Set(row.achievements.map((item) => item.id));
    for (const id of earnedAchievementIds(achievementFacts(row))) {
      if (have.has(id)) continue;
      row.achievements.push({ id, dayN: row.dayN, celebrated: false });
    }
  }

  const createProfile = (input: CreateProfileInput) => {
    const id = input.id ?? `p_${profiles.size + 1}`;
    const row: StoredProfile = {
      id,
      name: input.name,
      petName: input.petName,
      species: input.species,
      color: input.color,
      accessory: input.accessory,
      balance: ECONOMY.startingBudget,
      isDemo: Boolean(input.isDemo),
      care: METERS.initialCare,
      mood: METERS.initialMood,
      stage: "novice",
      dayOpen: false,
      dayId: `${id}#1`,
      dayN: 1,
      goals: (() => {
        const seeded = input.activeGoalKey
          ? input.goals.find((goal) => goal.key === input.activeGoalKey)
          : undefined;
        return seeded
          ? [
              {
                key: seeded.key,
                cost: seeded.cost,
                status: "active" as const,
                isActive: true,
                fundedCelebrated: false,
                custom: false,
                name: null,
                icon: null,
                threshold: null,
              },
            ]
          : [];
      })(),
      planStatus: "none",
      buckets: emptyBuckets(),
      journal: [],
      purchases: [],
      transfers: [],
      scores: [],
      lastClosed: null,
      tasks: [],
      deposits: [],
      stageCredit: 0,
      accessorySeen: 0,
      finaleSeen: false,
      achievements: [],
      dailyRewardClaimed: 0,
      dailyRewardClaimedOn: null,
      confirmedPlans: 0,
      dayMarks: [],
    };
    appendJournal(row, {
      amount: ECONOMY.startingBudget,
      kind: "starting_grant",
      labelKey: "starting_grant",
      dayN: 0,
    });
    profiles.set(id, row);
    return id;
  };

  return {
    content: loadContent(),
    firstRun: {
      complete(input) {
        if (
          input.id &&
          profiles.has(input.id) &&
          meta.get(META_KEYS.activeProfileId) === input.id &&
          meta.get(META_KEYS.onboardingDone) === "1"
        ) {
          return input.id;
        }
        const id = createProfile(input);
        meta.set(META_KEYS.activeProfileId, id);
        meta.set(META_KEYS.onboardingDone, "1");
        return id;
      },
    },
    meta: {
      get(key) {
        return meta.get(key) ?? null;
      },
      set(key, value) {
        meta.set(key, value);
      },
      remove(key) {
        meta.delete(key);
      },
    },
    game: {
      createProfile,
      getProfile(profileId) {
        return viewOf(requireRow(profiles, profileId));
      },
      deleteProfile(profileId) {
        if (!profiles.has(profileId)) throw new Error(`Профиль ${profileId} не найден`);
        profiles.delete(profileId);
      },
      setAppearance(profileId, input) {
        const row = requireRow(profiles, profileId);
        if (!["sp1", "sp2", "sp3"].includes(input.species)) throw new Error(`Вид ${input.species} не найден`);
        if (!["c1", "c2", "c3"].includes(input.color)) throw new Error(`Окрас ${input.color} не найден`);
        if (!isAccessoryKey(input.accessory)) throw new Error(`Аксессуар ${input.accessory} не найден`);
        if (!accessoryUnlocked(input.accessory, row.stage)) throw new Error("Этот аксессуар ещё не открыт");
        row.species = input.species;
        row.color = input.color;
        row.accessory = input.accessory;
        publish();
      },
      accessoryUnlock(profileId) {
        const row = requireRow(profiles, profileId);
        return pendingAccessoryUnlock(row.stage, row.accessorySeen);
      },
      celebrateAccessoryUnlock(profileId) {
        const row = requireRow(profiles, profileId);
        const pending = pendingAccessoryUnlock(row.stage, row.accessorySeen);
        row.accessorySeen = STAGE_CODES[row.stage];
        if (pending) row.accessory = pending;
        publish();
      },
      finalePending(profileId) {
        const row = requireRow(profiles, profileId);
        return row.stage === "millionaire" && !row.finaleSeen;
      },
      celebrateFinale(profileId) {
        requireRow(profiles, profileId).finaleSeen = true;
        publish();
      },
      boughtGoalIds(profileId) {
        const row = requireRow(profiles, profileId);
        return [...new Set(row.purchases.filter((item) => item.boughtAsActiveGoal).map((item) => item.itemId))];
      },
      dailyRewardState(profileId) {
        const row = requireRow(profiles, profileId);
        const record = { claimed: row.dailyRewardClaimed, claimedOn: row.dailyRewardClaimedOn };
        const today = localDate(new Date());
        return { ready: dailyRewardReady(record, today), cells: dailyRewardCalendar(record, today) };
      },
      addParentBonus(profileId, amount) {
        if (!Number.isInteger(amount) || amount <= 0) throw new Error("Сумма должна быть больше нуля");
        const row = requireRow(profiles, profileId);
        row.balance += amount;
        appendJournal(row, { amount, kind: "parent_bonus", labelKey: "parent_bonus" });
        publish();
      },
      claimDailyReward(profileId) {
        const row = requireRow(profiles, profileId);
        const today = localDate(new Date());
        const record = { claimed: row.dailyRewardClaimed, claimedOn: row.dailyRewardClaimedOn };
        if (!dailyRewardReady(record, today)) return { status: "already" as const };
        const coins = nextDailyRewardCoins(row.dailyRewardClaimed);
        row.balance += coins;
        row.dailyRewardClaimed += 1;
        row.dailyRewardClaimedOn = today;
        appendJournal(row, { amount: coins, kind: "daily_reward", labelKey: "daily_reward" });
        publish();
        return { status: "ok" as const, coins };
      },
      openDay(profileId) {
        const row = requireRow(profiles, profileId);
        if (row.dayOpen) {
          return { status: "opened" as const, dayId: row.dayId, n: row.dayN };
        }
        if (row.lastClosed) {
          row.dayN += 1;
          row.planStatus = "none";
          row.buckets = emptyBuckets();
        }
        const dayId = `${profileId}#${row.dayN}`;
        row.dayOpen = true;
        row.dayId = dayId;
        return { status: "opened" as const, dayId, n: row.dayN };
      },
      savingsState(profileId) {
        const row = requireRow(profiles, profileId);
        const pot = potFromTransfers(row.transfers);
        const deposits = row.transfers.filter((t) => t.kind === "in").map((t) => t.amount);
        const active = row.goals.find((g) => g.isActive);
        if (!active) {
          return { pot, estimateDays: null, activeGoal: null, stageCredit: row.stageCredit };
        }
        const progress = applyGoalProgress(pot, active.cost);
        return {
          pot,
          estimateDays: estimateDaysToGoal(progress.remaining, deposits),
          stageCredit: row.stageCredit,
          activeGoal: {
            key: active.key,
            cost: active.cost,
            remaining: progress.remaining,
            achieved: progress.achieved,
            custom: active.custom,
            name: active.name,
            icon: active.icon,
            threshold: active.threshold,
          },
        };
      },
      dayState(profileId) {
        return dayStateOf(requireRow(profiles, profileId));
      },
      saveDraftPlan(profileId, dayId, buckets) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        if (buckets.mandatory < 0 || buckets.optional < 0 || buckets.savings < 0) {
          throw new Error("Суммы плана не могут быть отрицательными");
        }
        if (row.planStatus === "confirmed") {
          const bought = row.purchases.some((item) => item.dayId === dayId);
          if (bought) throw new Error("План уже подтверждён");
          const check = validatePlan(buckets, row.balance);
          if (!check.ok) throw new Error("В плане больше монет, чем есть");
        } else {
          row.planStatus = "draft";
        }
        row.buckets = { ...buckets };
      },
      confirmPlan(profileId, dayId, minMandatory = 0) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        if (row.planStatus === "none") throw new Error("Сначала составь план");
        if (row.planStatus === "confirmed") throw new Error("План уже подтверждён");
        const check = validatePlan(row.buckets, row.balance, Math.min(minMandatory, row.balance));
        if (!check.ok) return { ok: false as const, remainder: check.remainder };
        row.planStatus = "confirmed";
        row.confirmedPlans += 1;
        record(row);
        publish();
        return { ok: true as const };
      },
      purchase(profileId, dayId, item: CatalogItem) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        if (item.once && ownsItem(row, item.id)) return { status: "blocked" as const, missing: 0 };
        const check = checkPurchase(row.balance, item.price);
        if (check.status === "blocked") return check;
        const asActive = row.goals.some((goal) => goal.isActive && goal.key === item.id);
        row.balance -= item.price;
        row.purchases.push({
          dayId,
          itemId: item.id,
          price: item.price,
          kind: item.kind,
          paidFrom: "balance",
          boughtAsActiveGoal: asActive,
        });
        for (const effect of purchaseEffects(row, item)) {
          if (effect.meter === "care") row.care = applyMeterDelta(row.care, effect.delta);
          else row.mood = applyMeterDelta(row.mood, effect.delta);
        }
        appendJournal(row, {
          amount: -item.price,
          kind: "purchase",
          labelKey: `purchase:${item.id}`,
          itemId: item.id,
        });
        if (asActive) row.goals = [];
        record(row);
        publish();
        return { status: "ok" as const };
      },
      purchaseFromSavings(profileId, dayId, item: CatalogItem) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        const active = row.goals.find((goal) => goal.isActive);
        if (!active || active.key !== item.id) throw new Error("Купить из копилки можно только текущую Цель");
        if (item.once && ownsItem(row, item.id)) return { status: "blocked" as const, missing: 0 };
        const pot = potFromTransfers(row.transfers);
        if (pot < item.price) return { status: "blocked" as const, missing: item.price - pot };
        row.transfers.push({ dayId, amount: item.price, kind: "out" });
        row.purchases.push({
          dayId,
          itemId: item.id,
          price: item.price,
          kind: item.kind,
          paidFrom: "savings",
          boughtAsActiveGoal: true,
        });
        for (const effect of purchaseEffects(row, item)) {
          if (effect.meter === "care") row.care = applyMeterDelta(row.care, effect.delta);
          else row.mood = applyMeterDelta(row.mood, effect.delta);
        }
        appendJournal(row, {
          amount: 0,
          kind: "purchase",
          labelKey: `purchase:${item.id}`,
          itemId: item.id,
          goalId: item.id,
        });
        row.goals = [];
        const from = row.stage;
        const custom = Boolean(active.custom);
        const threshold = active.threshold ?? item.price;
        const step = applyStageStep({
          stage: from,
          custom,
          price: item.price,
          threshold,
          credit: row.stageCredit,
        });
        row.stage = step.stage;
        row.stageCredit = step.credit;
        if (step.stage !== from) row.accessory = newestAccessory(step.stage);
        const stageHeld =
          showStageThreshold({ stage: from, custom, price: item.price, threshold }) && step.stage === from;
        record(row);
        publish();
        return { status: "ok" as const, stageExplanation: explainStageChange(from, step.stage), stageHeld };
      },
      transferToSavings(profileId, dayId, amount) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
        const check = checkPurchase(row.balance, amount);
        if (check.status === "blocked") return check;
        const active = row.goals.find((g) => g.isActive);
        row.balance -= amount;
        row.transfers.push({ dayId, amount, kind: "in" });
        appendJournal(row, {
          amount: -amount,
          kind: "savings_in",
          labelKey: "savings_in",
          goalId: active?.key,
        });
        const pot = potFromTransfers(row.transfers);
        let achieved = false;
        if (active) {
          const progress = applyGoalProgress(pot, active.cost);
          if (progress.achieved && !active.fundedCelebrated) {
            achieved = true;
            active.fundedCelebrated = true;
          }
        }
        record(row);
        publish();
        return { status: "ok" as const, achieved };
      },
      withdrawFromSavings(profileId, dayId, amount) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        const pot = potFromTransfers(row.transfers);
        const check = checkWithdrawal(pot, amount);
        if (!check.ok) return { ok: false as const, potAfter: check.potAfter };
        row.balance += amount;
        row.transfers.push({ dayId, amount, kind: "out" });
        appendJournal(row, {
          amount,
          kind: "savings_out",
          labelKey: "savings_out",
        });
        return { ok: true as const, potAfter: check.potAfter };
      },
      setActiveGoal(profileId, item: (CatalogItem & { stage?: Stage }) | string) {
        const row = requireRow(profiles, profileId);
        const catalogItem = typeof item === "string" ? null : item;
        const key = typeof item === "string" ? item : item.id;
        if (catalogItem?.kind === "mandatory") throw new Error("Необходимое не может быть Целью");
        if (catalogItem?.stage && catalogItem.stage !== row.stage) throw new Error("Цель другого Этапа");
        if (catalogItem?.once && ownsItem(row, catalogItem.id)) throw new Error("Этот товар уже куплен");
        const existing = row.goals.find((goal) => goal.key === key);
        const cost = catalogItem?.price ?? existing?.cost;
        if (cost == null) throw new Error(`Цель ${key} не найдена`);
        row.goals = [
          {
            key,
            cost,
            status: "active",
            isActive: true,
            fundedCelebrated: false,
            custom: false,
            name: null,
            icon: null,
            threshold: null,
          },
        ];
      },
      setCustomGoal(profileId, input) {
        const row = requireRow(profiles, profileId);
        const draft = parseCustomGoalDraft(input);
        const threshold = stageGoalFloor(input.presetPrices);
        const key = customGoalItemId(createLocalId("cg"), draft.price, draft.name);
        row.goals = [
          {
            key,
            cost: draft.price,
            status: "active",
            isActive: true,
            fundedCelebrated: false,
            custom: true,
            name: draft.name,
            icon: draft.icon,
            threshold,
          },
        ];
      },
      clearActiveGoal(profileId) {
        const row = requireRow(profiles, profileId);
        row.goals = [];
      },
      noteTaskCompleted(profileId: string, taskId: string) {
        const row = requireRow(profiles, profileId);
        if (row.tasks.some((task) => task.taskKey === taskId)) return;
        const now = Date.now();
        row.tasks.push(
          storedTask({
            taskKey: taskId,
            status: "completed",
            rewardPaid: false,
            bestReward: 0,
            firstCompletedAt: now,
            completedAt: now,
          }),
        );
      },
      listGoals(profileId) {
        return requireRow(profiles, profileId).goals.map((g) => ({ ...g }));
      },
      listJournal(profileId) {
        return [...requireRow(profiles, profileId).journal];
      },
      purchasedItemIds(profileId, dayId) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        return [...new Set(row.purchases.filter((item) => item.dayId === dayId).map((item) => item.itemId))];
      },
      boughtAsActiveGoalCount(profileId) {
        return requireRow(profiles, profileId).purchases.filter((item) => item.boughtAsActiveGoal).length;
      },
      lastClosedDay(profileId) {
        return requireRow(profiles, profileId).lastClosed;
      },
      listDeposits(profileId) {
        const row = requireRow(profiles, profileId);
        return row.deposits
          .slice()
          .reverse()
          .map((dep) => ({
            id: dep.id,
            amount: dep.amount,
            ratePercent: dep.ratePercent,
            days: dep.days,
            payout: depositPayout(dep.amount, dep.ratePercent),
            maturesDayN: dep.maturesDayN,
            daysLeft: dep.status === "paid" ? 0 : Math.max(0, dep.maturesDayN - row.dayN),
            status: dep.status,
          }));
      },
      openDeposit(profileId, dayId, offerId, amount) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        const offer = findOffer(offerId);
        const check = checkDeposit(row.balance, amount);
        if (check.status !== "ok") return check;
        row.balance -= amount;
        appendJournal(row, { amount: -amount, kind: "bank_in", labelKey: "bank_in" });
        const maturesDayN = maturesOnDay(row.dayN, offer.days);
        row.deposits.push({
          id: `dep_${row.deposits.length + 1}`,
          amount,
          ratePercent: offer.ratePercent,
          days: offer.days,
          maturesDayN,
          status: "open",
        });
        record(row);
        publish();
        return { status: "ok" as const, payout: depositPayout(amount, offer.ratePercent), maturesDayN };
      },
      collectDeposits(profileId, dayId) {
        const row = requireRow(profiles, profileId);
        requireOpen(row, dayId);
        let paid = 0;
        let interest = 0;
        let count = 0;
        for (const dep of row.deposits) {
          if (dep.status !== "open" || dep.maturesDayN > row.dayN) continue;
          const payout = depositPayout(dep.amount, dep.ratePercent);
          row.balance += payout;
          appendJournal(row, { amount: payout, kind: "bank_out", labelKey: "bank_out" });
          dep.status = "paid";
          paid += payout;
          interest += depositInterest(dep.amount, dep.ratePercent);
          count += 1;
        }
        if (count > 0) {
          record(row);
          publish();
        }
        return { paid, interest, count };
      },
      listTaskProgress(profileId) {
        return requireRow(profiles, profileId).tasks.map((task) => ({ ...task }));
      },
      applyTaskStep(profileId, dayId, result: TaskStepResult) {
        const row = requireRow(profiles, profileId);
        requireDayForTask(row, dayId);
        for (const effect of result.effects) {
          if (effect.meter && effect.delta) {
            if (effect.meter === "care") {
              row.care = applyMeterDelta(row.care, effect.delta);
            } else {
              row.mood = applyMeterDelta(row.mood, effect.delta);
            }
          }
          if (effect.coins && effect.coins > 0) {
            row.balance += effect.coins;
            appendJournal(row, {
              amount: effect.coins,
              kind: "task_scene",
              labelKey: "task_scene",
            });
          }
        }
        if (result.spawnTask && !row.tasks.some((task) => task.taskKey === result.spawnTask)) {
          row.tasks.push(storedTask({ taskKey: result.spawnTask, status: "available", rewardPaid: false, bestReward: 0 }));
        }
      },
      claimTaskReward(profileId, dayId, taskId, earned, lesson, answers?: AnswerTally) {
        const row = requireRow(profiles, profileId);
        requireDayForTask(row, dayId);
        const tally = checkedTally(answers);
        const existing = row.tasks.find((task) => task.taskKey === taskId);
        const firstCompletion = existing?.status !== "completed";
        const best = existing?.bestReward ?? 0;
        const reward = rewardTopUp(best, earned);
        if (reward > 0) {
          row.balance += reward;
          appendJournal(row, {
            amount: reward,
            kind: "task_reward",
            labelKey: `task_reward:${taskId}`,
          });
        }
        const bestReward = Math.max(best, earned);
        const now = Date.now();
        if (existing) {
          existing.status = "completed";
          existing.rewardPaid = existing.rewardPaid || bestReward > 0;
          existing.bestReward = bestReward;
          existing.correctAnswers += tally.correct;
          existing.scoredAnswers += tally.scored;
          existing.firstCompletedAt = existing.firstCompletedAt ?? now;
          existing.completedAt = now;
        } else {
          row.tasks.push(
            storedTask({
              taskKey: taskId,
              status: "completed",
              rewardPaid: bestReward > 0,
              bestReward,
              correctAnswers: tally.correct,
              scoredAnswers: tally.scored,
              firstCompletedAt: now,
              completedAt: now,
            }),
          );
        }
        if (lesson && firstCompletion && endsGameDay(lesson.task)) {
          planLessonEndsThisDay = taskId === FEATURES.planTaskId;
          this.closeDay(profileId, lesson.catalog, lesson.bills ?? []);
        } else {
          record(row);
          publish();
        }
        return reward;
      },
      closeDay(profileId, catalog, bills = []) {
        const lessonEndsThisDay = planLessonEndsThisDay;
        planLessonEndsThisDay = false;
        const row = requireRow(profiles, profileId);
        if (!row.dayOpen) throw new Error("Нет открытого игрового дня");
        const bought = row.purchases.filter((item) => item.dayId === row.dayId);
        const boughtIds = new Set(bought.map((item) => item.itemId));
        const mandatoryCovered =
          bills.length > 0
            ? billsCovered(billsForDay(row.dayN, bills), actuals(row).mandatory)
            : catalog.filter((item) => item.kind === "mandatory").every((item) => boughtIds.has(item.id));
        const confirmed = row.planStatus === "confirmed" ? row.buckets : null;
        const withinPlan = planKept({ plan: confirmed, actual: actuals(row) });
        const deposited = row.transfers.some((item) => item.dayId === row.dayId && item.kind === "in");
        const score = dayScore({ mandatoryCovered, withinPlan, deposited });
        const optionalSpend = bought
          .filter((item) => item.kind === "optional" && item.paidFrom !== "savings")
          .reduce((sum, item) => sum + item.price, 0);
        const meterDeltas = dayCloseMeterDeltas({
          optionalSpend,
          optionalPlan: confirmed ? confirmed.optional : null,
          planMissing:
            confirmed === null &&
            planOpenAtClose({
              isDemo: row.isDemo,
              planLessonCompleted: row.tasks.some(
                (task) => task.taskKey === FEATURES.planTaskId && task.status === "completed",
              ),
              planLessonEndsThisDay: lessonEndsThisDay,
            }),
        });
        if (meterDeltas.care) row.care = applyMeterDelta(row.care, meterDeltas.care);
        if (meterDeltas.mood) row.mood = applyMeterDelta(row.mood, meterDeltas.mood);
        row.scores.push(score);
        row.dayMarks.push({ withinPlan, mandatoryCovered, deposited });
        row.dayOpen = false;
        const summary: DaySummaryView = {
          dayId: row.dayId,
          n: row.dayN,
          score,
          facts: { mandatoryCovered, withinPlan, deposited },
          plan: { ...row.buckets },
          planConfirmed: confirmed !== null,
          actual: actuals(row),
          meterDeltas,
          stage: row.stage,
          previousStage: row.stage,
          stageExplanation: null,
        };
        row.lastClosed = summary;
        record(row);
        publish();
        return summary;
      },
      listAchievements(profileId) {
        const row = requireRow(profiles, profileId);
        return orderEarned(row.achievements).map((item) => ({ ...item }));
      },
      celebrateAchievement(profileId, id) {
        const row = requireRow(profiles, profileId);
        const earned = row.achievements.find((item) => item.id === id);
        if (earned) earned.celebrated = true;
        publish();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
}

export function seedReturningChild(
  ports: SessionPorts,
  input?: Partial<CreateProfileInput> & { unlockMoney?: boolean },
): string {
  const content = ports.content;
  const skateboard = content.goals.find((goal) => goal.id === "skateboard");
  if (!skateboard) throw new Error("Нет целей в контенте");
  const { unlockMoney = false, ...profile } = input ?? {};
  const id = ports.game.createProfile({
    name: "Миша",
    petName: "Пух",
    species: "sp1",
    color: "c1",
    accessory: "a1",
    contentVersion: content.contentVersion,
    goals: [{ key: skateboard.id, cost: skateboard.price }],
    activeGoalKey: skateboard.id,
    ...profile,
  });
  ports.game.openDay(id);
  if (unlockMoney) {
    ports.game.noteTaskCompleted?.(id, "savings_what");
    ports.game.noteTaskCompleted?.(id, "budget_plan");
  }
  ports.meta.set(META_KEYS.activeProfileId, id);
  ports.meta.set(META_KEYS.onboardingDone, "1");
  return id;
}

/** Confirm the active open day so cadence tests can «Закончить день» without the Plan UI. */
export function confirmActiveDayPlan(
  ports: SessionPorts,
  buckets: PlanBuckets = { mandatory: 1, optional: 1, savings: 1 },
): void {
  const profileId = ports.meta.get(META_KEYS.activeProfileId);
  if (!profileId) throw new Error("Нет активного профиля");
  const day = ports.game.dayState(profileId);
  if (!day.open) throw new Error("Игровой день не найден");
  if (day.plan.status === "confirmed") return;
  if (day.plan.status === "none") {
    ports.game.saveDraftPlan(profileId, day.dayId, buckets);
  }
  const result = ports.game.confirmPlan(profileId, day.dayId);
  if (!result.ok) throw new Error("План не подтвердился");
}
