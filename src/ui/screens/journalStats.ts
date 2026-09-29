import { readCustomGoalItem } from "../../core/customGoal";
import type { PlanBuckets } from "../../core/economy";
import { RETIRED_SHOP_ITEMS } from "../../data/content";
import type { JournalEntry } from "../../data/repositories/gameRepository";

/** Periods of the Журнал, counted in Игровые дни. */
export type JournalPeriod = "today" | "yesterday" | "three" | "all";
export type JournalFlow = "spend" | "income";

export type SpendCategory = "mandatory" | "optional" | "goal" | "savings" | "bank" | "other";
export type IncomeCategory = "tasks" | "start" | "bank" | "fromSavings" | "other";
export type JournalCategory = SpendCategory | IncomeCategory;

/** How a bought item counts: a catalog Необходимое / Желаемое or a Цель. */
export type ItemKind = "mandatory" | "optional" | "goal";
export type ItemLookup = (itemId: string | null) => { kind: ItemKind; price: number } | undefined;

export const SPEND_ORDER: readonly SpendCategory[] = ["mandatory", "optional", "goal", "savings", "bank", "other"];
export const INCOME_ORDER: readonly IncomeCategory[] = ["tasks", "start", "bank", "fromSavings", "other"];

/**
 * The Стартовый бюджет is logged before any Игровой день (dayN 0);
 * for periods it belongs to day 1, like «Сегодня пришло» in План.
 */
export function effectiveDay(entry: Pick<JournalEntry, "dayN">): number {
  return Math.max(1, entry.dayN);
}

export function inPeriod(entry: Pick<JournalEntry, "dayN">, period: JournalPeriod, today: number): boolean {
  const n = effectiveDay(entry);
  if (period === "today") return n === today;
  if (period === "yesterday") return n === today - 1;
  if (period === "three") return n > today - 3 && n <= today;
  return true;
}

export type Classified =
  | { flow: "spend"; category: SpendCategory; amount: number }
  | { flow: "income"; category: IncomeCategory; amount: number };

/**
 * Where a Баланс movement went (spend) or came from (income). Entries that
 * don't move Баланс — a Цель bought from Копилка logs 0 — are not counted.
 */
export function classify(entry: JournalEntry, lookup: ItemLookup): Classified | null {
  if (entry.amount === 0) return null;
  const amount = Math.abs(entry.amount);
  if (entry.amount < 0) {
    if (entry.kind === "purchase") {
      const kind = lookup(entry.itemId)?.kind;
      return { flow: "spend", category: kind ?? "other", amount };
    }
    if (entry.kind === "savings_in") return { flow: "spend", category: "savings", amount };
    if (entry.kind === "bank_in") return { flow: "spend", category: "bank", amount };
    return { flow: "spend", category: "other", amount };
  }
  if (entry.kind === "task_reward" || entry.kind === "task_scene") return { flow: "income", category: "tasks", amount };
  if (entry.kind === "starting_grant") return { flow: "income", category: "start", amount };
  if (entry.kind === "daily_reward") return { flow: "income", category: "other", amount };
  if (entry.kind === "bank_out") return { flow: "income", category: "bank", amount };
  if (entry.kind === "savings_out") return { flow: "income", category: "fromSavings", amount };
  return { flow: "income", category: "other", amount };
}

export type CategoryTotal<C extends string> = { category: C; amount: number; percent: number };

export interface JournalStats {
  entries: JournalEntry[];
  spend: CategoryTotal<SpendCategory>[];
  income: CategoryTotal<IncomeCategory>[];
  /** Coins that came into Баланс. */
  cameIn: number;
  /** Coins that left Баланс. */
  wentOut: number;
  /** cameIn − wentOut. */
  net: number;
}

/** Whole percents that add up to 100 (largest remainder). */
export function percents(values: readonly number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((sum, v) => sum + v, 0);
  const order = raw
    .map((v, index) => ({ index, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index] += 1;
    left -= 1;
  }
  return floors;
}

function totals<C extends string>(order: readonly C[], sums: Map<C, number>): CategoryTotal<C>[] {
  const present = order.filter((category) => (sums.get(category) ?? 0) > 0);
  const values = present.map((category) => sums.get(category) ?? 0);
  const shares = percents(values);
  return present.map((category, index) => ({ category, amount: values[index], percent: shares[index] }));
}

/** Totals for the Журнал chart and tiles; categories with nothing are left out. */
export function journalStats(
  journal: readonly JournalEntry[],
  period: JournalPeriod,
  today: number,
  lookup: ItemLookup,
): JournalStats {
  const entries = journal.filter((entry) => inPeriod(entry, period, today));
  const spend = new Map<SpendCategory, number>();
  const income = new Map<IncomeCategory, number>();
  let cameIn = 0;
  let wentOut = 0;
  for (const entry of entries) {
    const row = classify(entry, lookup);
    if (!row) continue;
    if (row.flow === "spend") {
      spend.set(row.category, (spend.get(row.category) ?? 0) + row.amount);
      wentOut += row.amount;
    } else {
      income.set(row.category, (income.get(row.category) ?? 0) + row.amount);
      cameIn += row.amount;
    }
  }
  return {
    entries,
    spend: totals(SPEND_ORDER, spend),
    income: totals(INCOME_ORDER, income),
    cameIn,
    wentOut,
    net: cameIn - wentOut,
  };
}

/** Журнал rows grouped by the day they were logged, newest day first (0 = Старт). */
export function groupByDay(entries: readonly JournalEntry[]): [number, JournalEntry[]][] {
  const map = new Map<number, JournalEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.dayN) ?? [];
    list.push(entry);
    map.set(entry.dayN, list);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

/**
 * What actually went to each План bucket on Игровой день `n`, read from the
 * Журнал: Обязательные and Желаемые bought from Баланс, coins put in Копилка.
 * A Цель bought from Баланс counts as Желаемое (as in the day's summary).
 */
export function bucketSpendOnDay(journal: readonly JournalEntry[], n: number, lookup: ItemLookup): PlanBuckets {
  const out: PlanBuckets = { mandatory: 0, optional: 0, savings: 0 };
  for (const entry of journal) {
    if (entry.dayN !== n || entry.amount >= 0) continue;
    const amount = -entry.amount;
    if (entry.kind === "savings_in") out.savings += amount;
    else if (entry.kind === "purchase") {
      const kind = lookup(entry.itemId)?.kind;
      if (kind === "mandatory") out.mandatory += amount;
      else if (kind === "optional" || kind === "goal") out.optional += amount;
    }
  }
  return out;
}

export type SavingsOp = { id: string; dayN: number; kind: "in" | "out" | "goal"; amount: number; itemId: string | null };

/**
 * Копилка movements, newest first, signed from the Копилка's side:
 * a deposit is +, a withdrawal and a Цель bought from Копилка are −.
 */
export function savingsOps(journal: readonly JournalEntry[], lookup: ItemLookup): SavingsOp[] {
  return journal.flatMap((entry): SavingsOp[] => {
    const base = { id: entry.id, dayN: entry.dayN, itemId: entry.itemId };
    if (entry.kind === "savings_in") return [{ ...base, kind: "in", amount: Math.abs(entry.amount) }];
    if (entry.kind === "savings_out") return [{ ...base, kind: "out", amount: -Math.abs(entry.amount) }];
    if (entry.kind === "purchase" && entry.amount === 0 && entry.itemId) {
      return [{ ...base, kind: "goal", amount: -(lookup(entry.itemId)?.price ?? 0) }];
    }
    return [];
  });
}

/**
 * Item lookup over the content catalog and Цели (a catalog item wins on a
 * shared id). Items retired from Магазин still resolve, so old Журнал rows
 * keep their bucket.
 */
export function itemLookup(
  catalog: readonly { id: string; kind: "mandatory" | "optional"; price: number }[],
  goals: readonly { id: string; price: number }[],
): ItemLookup {
  return (itemId) => {
    if (!itemId) return undefined;
    const custom = readCustomGoalItem(itemId);
    if (custom) return { kind: "goal" as const, price: custom.price };
    const item = catalog.find((entry) => entry.id === itemId) ?? RETIRED_SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (item) return { kind: item.kind, price: item.price };
    const goal = goals.find((entry) => entry.id === itemId);
    return goal ? { kind: "goal", price: goal.price } : undefined;
  };
}

export function itemTitle(
  itemId: string | null,
  catalog: readonly { id: string; name: string }[],
  goals: readonly { id: string; name: string }[],
): string {
  if (!itemId) return "";
  const custom = readCustomGoalItem(itemId);
  if (custom) return custom.name;
  return (
    catalog.find((item) => item.id === itemId)?.name ??
    goals.find((goal) => goal.id === itemId)?.name ??
    RETIRED_SHOP_ITEMS.find((item) => item.id === itemId)?.name ??
    itemId
  );
}

export interface SavingsStats {
  /** All coins ever put in Копилка. */
  total: number;
  count: number;
  /** Rounded average deposit; 0 before the first one. */
  average: number;
}

export function savingsStats(journal: readonly JournalEntry[]): SavingsStats {
  const deposits = journal.filter((entry) => entry.kind === "savings_in").map((entry) => Math.abs(entry.amount));
  const total = deposits.reduce((sum, v) => sum + v, 0);
  return {
    total,
    count: deposits.length,
    average: deposits.length === 0 ? 0 : Math.round(total / deposits.length),
  };
}
