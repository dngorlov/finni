import { loadContent } from "../../data/content";
import type { JournalEntry } from "../../data/repositories/gameRepository";
import {
  bucketSpendOnDay,
  classify,
  groupByDay,
  inPeriod,
  itemLookup,
  itemTitle,
  journalStats,
  percents,
  savingsOps,
  savingsStats,
} from "../screens/journalStats";

const lookup = itemLookup(
  [
    { id: "lunch", kind: "mandatory", price: 12 },
    { id: "candy", kind: "optional", price: 5 },
  ],
  [{ id: "skateboard", price: 90 }],
);

let seq = 0;
function entry(dayN: number, kind: string, amount: number, itemId: string | null = null): JournalEntry {
  seq += 1;
  return { id: `tx_${seq}`, dayN, createdAt: seq, amount, kind, labelKey: kind, itemId, goalId: null };
}

// Newest first, like listJournal.
const journal: JournalEntry[] = [
  entry(3, "purchase", 0, "skateboard"),
  entry(3, "savings_out", 4),
  entry(3, "bank_out", 22),
  entry(2, "bank_in", -20),
  entry(2, "purchase", -90, "skateboard"),
  entry(2, "savings_in", -10),
  entry(2, "task_reward", 10),
  entry(1, "savings_in", -6),
  entry(1, "purchase", -5, "candy"),
  entry(1, "purchase", -12, "lunch"),
  entry(1, "task_scene", 8),
  entry(0, "starting_grant", 100),
];

describe("Журнал periods", () => {
  it("counts the Стартовый бюджет as day 1", () => {
    expect(inPeriod({ dayN: 0 }, "today", 1)).toBe(true);
    expect(inPeriod({ dayN: 0 }, "yesterday", 2)).toBe(true);
    expect(inPeriod({ dayN: 0 }, "today", 2)).toBe(false);
  });

  it("takes three days back including today", () => {
    expect([1, 2, 3, 4, 5].filter((n) => inPeriod({ dayN: n }, "three", 5))).toEqual([3, 4, 5]);
    expect([1, 2].filter((n) => inPeriod({ dayN: n }, "three", 2))).toEqual([1, 2]);
    expect(inPeriod({ dayN: 1 }, "all", 9)).toBe(true);
  });
});

describe("classify", () => {
  it("sorts spending by bucket and income by source", () => {
    expect(classify(entry(1, "purchase", -12, "lunch"), lookup)).toEqual({ flow: "spend", category: "mandatory", amount: 12 });
    expect(classify(entry(1, "purchase", -5, "candy"), lookup)).toMatchObject({ category: "optional" });
    expect(classify(entry(1, "purchase", -90, "skateboard"), lookup)).toMatchObject({ category: "goal" });
    expect(classify(entry(1, "savings_in", -3), lookup)).toMatchObject({ flow: "spend", category: "savings" });
    expect(classify(entry(1, "bank_in", -20), lookup)).toMatchObject({ flow: "spend", category: "bank" });
    expect(classify(entry(1, "task_scene", 8), lookup)).toMatchObject({ flow: "income", category: "tasks" });
    expect(classify(entry(1, "bank_out", 22), lookup)).toMatchObject({ flow: "income", category: "bank" });
    expect(classify(entry(1, "savings_out", 4), lookup)).toMatchObject({ flow: "income", category: "fromSavings" });
  });

  it("skips a Цель bought from Копилка — Баланс did not move", () => {
    expect(classify(entry(1, "purchase", 0, "skateboard"), lookup)).toBeNull();
  });
});

describe("journalStats", () => {
  it("totals spending and income for the chosen period", () => {
    const stats = journalStats(journal, "yesterday", 3, lookup);
    expect(stats.entries).toHaveLength(4);
    expect(stats.spend).toEqual([
      { category: "goal", amount: 90, percent: 75 },
      { category: "savings", amount: 10, percent: 8 },
      { category: "bank", amount: 20, percent: 17 },
    ]);
    expect(stats.income).toEqual([{ category: "tasks", amount: 10, percent: 100 }]);
    expect(stats.cameIn).toBe(10);
    expect(stats.wentOut).toBe(120);
    expect(stats.net).toBe(-110);
  });

  it("counts day 1 with the Стартовый бюджет over all time", () => {
    const stats = journalStats(journal, "all", 3, lookup);
    expect(stats.cameIn).toBe(100 + 8 + 10 + 22 + 4);
    expect(stats.wentOut).toBe(12 + 5 + 6 + 10 + 90 + 20);
    expect(stats.income.map((row) => row.category)).toEqual(["tasks", "start", "bank", "fromSavings"]);
    expect(stats.income.reduce((sum, row) => sum + row.percent, 0)).toBe(100);
  });

  it("is empty for a period with no rows", () => {
    const stats = journalStats(journal, "today", 4, lookup);
    expect(stats).toMatchObject({ entries: [], spend: [], income: [], cameIn: 0, wentOut: 0, net: 0 });
  });
});

describe("percents", () => {
  it("adds up to 100", () => {
    expect(percents([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percents([0, 0])).toEqual([0, 0]);
  });
});

describe("groupByDay", () => {
  it("puts the newest day first and keeps Старт as day 0", () => {
    expect(groupByDay(journal).map(([day, rows]) => [day, rows.length])).toEqual([
      [3, 3],
      [2, 4],
      [1, 4],
      [0, 1],
    ]);
  });
});

describe("bucketSpendOnDay", () => {
  it("reads what went to each План bucket that day", () => {
    expect(bucketSpendOnDay(journal, 1, lookup)).toEqual({ mandatory: 12, optional: 5, savings: 6 });
    expect(bucketSpendOnDay(journal, 2, lookup)).toEqual({ mandatory: 0, optional: 90, savings: 10 });
    expect(bucketSpendOnDay(journal, 3, lookup)).toEqual({ mandatory: 0, optional: 0, savings: 0 });
  });
});

describe("Копилка", () => {
  it("signs moves from the Копилка's side", () => {
    expect(savingsOps(journal, lookup).map((op) => [op.dayN, op.kind, op.amount])).toEqual([
      [3, "goal", -90],
      [3, "out", -4],
      [2, "in", 10],
      [1, "in", 6],
    ]);
  });

  it("sums deposits", () => {
    expect(savingsStats(journal)).toEqual({ total: 16, count: 2, average: 8 });
    expect(savingsStats([])).toEqual({ total: 0, count: 0, average: 0 });
  });
});

describe("items retired from Магазин", () => {
  const content = loadContent();
  const current = itemLookup(content.catalog, content.goals);

  it("keeps old Журнал rows named and in their bucket after the catalogue changed", () => {
    expect(content.catalog.some((item) => item.id === "lunch")).toBe(false);
    expect(itemTitle("lunch", content.catalog, content.goals)).toBe("Обед");
    expect(itemTitle("medicine", content.catalog, content.goals)).toBe("Лекарство");
    expect(classify(entry(1, "purchase", -12, "lunch"), current)).toMatchObject({ category: "mandatory" });
    expect(classify(entry(1, "purchase", -5, "candy"), current)).toMatchObject({ category: "optional" });
  });

  it("shows an unknown id as it is and counts it as other, without throwing", () => {
    expect(itemTitle("gone", content.catalog, content.goals)).toBe("gone");
    expect(classify(entry(1, "purchase", -3, "gone"), current)).toMatchObject({ category: "other" });
  });
});
