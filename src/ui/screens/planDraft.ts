import { billsForDay, billsTotal, type DayBills } from "../../core/economy";
import type { CatalogItemContent } from "../../data/content";

export interface TodayBills {
  /** Least the Обязательные bucket should hold today. */
  total: number;
  note?: string;
}

/** Счета due on Игровой день `n`: the Обязательные minimum and its optional note. */
export function todayBills(n: number, cycle: readonly DayBills[]): TodayBills {
  const bills = billsForDay(n, cycle);
  return { total: billsTotal(bills), note: bills.note };
}

/** Cheapest-first Желаемые items that fit together into `budget`. */
export function wantsThatFit(catalog: readonly CatalogItemContent[], budget: number): string[] {
  const optional = catalog.filter((item) => item.kind === "optional").sort((a, b) => a.price - b.price);
  const names: string[] = [];
  let left = budget;
  for (const item of optional) {
    if (item.price > left) break;
    names.push(item.name);
    left -= item.price;
  }
  return names;
}

/** Days to the Цель if `perDay` goes to Копилка every day; null when nothing is saved. */
export function daysToGoalAt(remaining: number, perDay: number): number | null {
  if (perDay <= 0) return null;
  return Math.max(1, Math.ceil(remaining / perDay));
}
