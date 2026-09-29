import type { ClaimDailyRewardResult, DailyRewardView } from "../../core/dailyReward";
import type { CatalogItem, DayBills, PlanBuckets } from "../../core/economy";
import type { AccessoryKey } from "../../core/accessories";
import type { Stage } from "../../core/stages";
import type { AnswerTally, TaskStepResult } from "../../core/tasks";
import type { GameContent } from "../../data/content";
import type {
  AppearanceInput,
  CollectDepositsResult,
  ConfirmPlanResult,
  DepositView,
  OpenDepositResult,
  CreateProfileInput,
  DayState,
  DaySummaryView,
  PinnedLessonClaim,
  GoalOption,
  EarnedAchievement,
  JournalEntry,
  OpenDayResult,
  ProfileView,
  PurchaseResult,
  SavingsView,
  TaskProgressView,
  TransferResult,
  WithdrawResult,
} from "../../data/repositories/gameRepository";

export type { CollectDepositsResult, DepositView, OpenDepositResult };
export type { DayState, DaySummaryView, EarnedAchievement, GoalOption, JournalEntry, ProfileView, SavingsView, TaskProgressView };

/** UI-facing slice of the game repository — the persistence seam tests fake. */
export type SessionGame = {
  createProfile(input: CreateProfileInput): string;
  getProfile(profileId: string): ProfileView;
  dailyRewardState(profileId: string): DailyRewardView;
  claimDailyReward(profileId: string): ClaimDailyRewardResult;
  /** Родительский бонус: any positive whole number of coins onto Баланс. */
  addParentBonus(profileId: string, amount: number): void;
  deleteProfile(profileId: string): void;
  /** Вид, Окрас, and an Аксессуар the current Этап has opened. Throws on a locked one. */
  setAppearance(profileId: string, input: AppearanceInput): void;
  /** The Аксессуар a new Этап opened that has not had its card yet. */
  accessoryUnlock(profileId: string): AccessoryKey | null;
  /** Card shown: remember it and put the new Аксессуар on. */
  celebrateAccessoryUnlock(profileId: string): void;
  /** The pet still owes the «ты дошёл до конца» card for Миллионер. */
  finalePending(profileId: string): boolean;
  /** That card was dismissed. */
  celebrateFinale(profileId: string): void;
  /** Item ids of every Цель bought, oldest first, each once. */
  boughtGoalIds(profileId: string): string[];
  openDay(profileId: string): OpenDayResult;
  savingsState(profileId: string): SavingsView;
  dayState(profileId: string): DayState;
  lastClosedDay(profileId: string): DaySummaryView | null;
  listTaskProgress(profileId: string): TaskProgressView[];
  /** Test fake only: mark a lesson done without ending the Игровой день. */
  noteTaskCompleted?(profileId: string, taskId: string): void;
  listDeposits(profileId: string): DepositView[];
  openDeposit(profileId: string, dayId: string, offerId: string, amount: number): OpenDepositResult;
  collectDeposits(profileId: string, dayId: string): CollectDepositsResult;
  saveDraftPlan(profileId: string, dayId: string, buckets: PlanBuckets): void;
  confirmPlan(profileId: string, dayId: string, minMandatory?: number): ConfirmPlanResult;
  purchase(profileId: string, dayId: string, item: CatalogItem): PurchaseResult;
  purchaseFromSavings(profileId: string, dayId: string, item: CatalogItem): PurchaseResult;
  transferToSavings(profileId: string, dayId: string, amount: number): TransferResult;
  withdrawFromSavings(profileId: string, dayId: string, amount: number): WithdrawResult;
  setActiveGoal(profileId: string, item: (CatalogItem & { stage?: Stage }) | string): void;
  setCustomGoal(
    profileId: string,
    input: { name: string; icon: string; price: number; presetPrices: readonly number[] },
  ): void;
  clearActiveGoal(profileId: string): void;
  listGoals(profileId: string): GoalOption[];
  listJournal(profileId: string): JournalEntry[];
  listAchievements(profileId: string): EarnedAchievement[];
  celebrateAchievement(profileId: string, id: string): void;
  subscribe(listener: () => void): () => void;
  purchasedItemIds(profileId: string, dayId: string): string[];
  boughtAsActiveGoalCount(profileId: string): number;
  applyTaskStep(profileId: string, dayId: string, result: TaskStepResult): void;
  claimTaskReward(
    profileId: string,
    dayId: string,
    taskId: string,
    earned: number,
    lesson?: PinnedLessonClaim,
    answers?: AnswerTally,
  ): number;
  closeDay(profileId: string, catalog: readonly CatalogItem[], bills?: readonly DayBills[]): DaySummaryView;
};

export type SessionMeta = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

export type SessionFirstRun = {
  complete(input: CreateProfileInput): string;
};

export type SessionPorts = {
  firstRun: SessionFirstRun;
  game: SessionGame;
  meta: SessionMeta;
  content: GameContent;
};
