import { dayInsights, MAX_INSIGHTS, type DayInsightInput } from "../dayInsights";

function day(overrides: Partial<DayInsightInput> = {}): DayInsightInput {
  return {
    plan: null,
    actual: { mandatory: 0, optional: 0, savings: 0 },
    bills: { due: 20, paid: 20, missedFood: false },
    savingsOpen: true,
    noPlanPenalty: 0,
    lessonCoins: 0,
    goal: null,
    ...overrides,
  };
}

const ids = (input: DayInsightInput) => dayInsights(input).map((row) => row.id);

describe("dayInsights", () => {
  it("says the child could have covered Обязательное with the coins spent on Желаемое", () => {
    const insights = dayInsights(
      day({
        actual: { mandatory: 8, optional: 13, savings: 0 },
        bills: { due: 20, paid: 8, missedFood: true },
        savingsOpen: false,
      }),
    );
    expect(insights.at(-1)).toEqual({ kind: "tip", id: "wantsOverNeeds", amount: 12, missedFood: true });
  });

  it("caps «could have spent» at what actually went to Желаемое", () => {
    const [tip] = dayInsights(
      day({
        actual: { mandatory: 0, optional: 5, savings: 0 },
        bills: { due: 20, paid: 0, missedFood: true },
        savingsOpen: false,
      }),
    ).filter((row) => row.kind === "tip");
    expect(tip).toMatchObject({ id: "wantsOverNeeds", amount: 5 });
  });

  it("gives a plain Счета tip when nothing went to Желаемое", () => {
    expect(
      dayInsights(day({ bills: { due: 20, paid: 12, missedFood: false }, savingsOpen: false })).at(-1),
    ).toEqual({ kind: "tip", id: "billsMissed", missing: 8, missedFood: false });
  });

  it("praises paid Счета and a kept План, praise before the tip", () => {
    const insights = dayInsights(
      day({
        plan: { mandatory: 20, optional: 5, savings: 10 },
        actual: { mandatory: 20, optional: 5, savings: 10 },
        lessonCoins: 30,
      }),
    );
    expect(insights.map((row) => row.kind)).toEqual(["good", "good", "good"]);
    expect(insights.map((row) => row.id)).toEqual(["billsPaid", "planKept", "saved"]);
  });

  it("shows at most three insights and only one tip", () => {
    const insights = dayInsights(
      day({
        plan: { mandatory: 20, optional: 0, savings: 10 },
        actual: { mandatory: 8, optional: 13, savings: 0 },
        bills: { due: 20, paid: 8, missedFood: true },
        noPlanPenalty: 0,
        lessonCoins: 30,
      }),
    );
    expect(insights.length).toBeLessThanOrEqual(MAX_INSIGHTS);
    expect(insights.filter((row) => row.kind === "tip")).toHaveLength(1);
    expect(insights[0].kind).toBe("good");
  });

  it("points at overspent Желаемые when Счета were paid", () => {
    expect(
      dayInsights(
        day({
          plan: { mandatory: 20, optional: 5, savings: 0 },
          actual: { mandatory: 20, optional: 13, savings: 0 },
          savingsOpen: false,
        }),
      ).at(-1),
    ).toEqual({ kind: "tip", id: "overspentWants", over: 8 });
  });

  it("points at extra Обязательные over the План when Желаемые stayed in it", () => {
    expect(
      dayInsights(
        day({
          plan: { mandatory: 20, optional: 5, savings: 0 },
          actual: { mandatory: 30, optional: 0, savings: 0 },
          savingsOpen: false,
        }),
      ).at(-1),
    ).toEqual({ kind: "tip", id: "overPlan", over: 5 });
  });

  it("notes a Копилка short of the promise, and still praises what was saved", () => {
    const insights = dayInsights(
      day({
        plan: { mandatory: 20, optional: 0, savings: 15 },
        actual: { mandatory: 20, optional: 0, savings: 5 },
        goal: { remaining: 40 },
      }),
    );
    expect(insights.map((row) => row.id)).toEqual(["billsPaid", "saved", "savedLess"]);
    expect(insights[1]).toEqual({ kind: "good", id: "saved", amount: 5, goalRemaining: 40, goalDays: 8 });
    expect(insights[2]).toEqual({ kind: "tip", id: "savedLess", short: 10 });
  });

  it("nudges toward Копилка when nothing was saved, only once Копилка is open", () => {
    expect(ids(day({ goal: { remaining: 60 } }))).toContain("nothingSaved");
    expect(dayInsights(day({ goal: { remaining: 60 } })).at(-1)).toEqual({
      kind: "tip",
      id: "nothingSaved",
      hasGoal: true,
    });
    expect(ids(day({ savingsOpen: false }))).not.toContain("nothingSaved");
  });

  it("celebrates a Цель that Копилка already covers instead of nudging to save", () => {
    const insights = ids(day({ goal: { remaining: 0 } }));
    expect(insights).toContain("goalReady");
    expect(insights).not.toContain("nothingSaved");
  });

  it("asks to confirm the План when an open one was skipped", () => {
    expect(ids(day({ noPlanPenalty: -10, savingsOpen: false }))).toEqual(["billsPaid", "noPlan"]);
  });

  it("praises a finished lesson", () => {
    expect(dayInsights(day({ bills: { due: 0, paid: 0, missedFood: false }, savingsOpen: false, lessonCoins: 30 }))).toEqual([
      { kind: "good", id: "lesson", coins: 30 },
    ]);
  });

  it("always opens with a kind word, even with nothing to praise", () => {
    const insights = dayInsights(day({ bills: { due: 20, paid: 0, missedFood: true }, savingsOpen: false }));
    expect(insights).toEqual([
      { kind: "good", id: "dayDone" },
      { kind: "tip", id: "billsMissed", missing: 20, missedFood: true },
    ]);
  });

  it("is deterministic", () => {
    const input = day({
      plan: { mandatory: 20, optional: 5, savings: 10 },
      actual: { mandatory: 12, optional: 9, savings: 4 },
      bills: { due: 20, paid: 12, missedFood: false },
      lessonCoins: 30,
      goal: { remaining: 50 },
    });
    expect(dayInsights(input)).toEqual(dayInsights(structuredClone(input)));
  });
});
