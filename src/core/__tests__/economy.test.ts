import {
  applyMeterDelta,
  billsCovered,
  billsForDay,
  billsTotal,
  planKept,
  planMandatoryFloor,
  checkPurchase,
  dayCloseMeterDeltas,
  planOpenAtClose,
  validatePlan,
} from "../economy";

describe("validatePlan", () => {
  it("accepts buckets that sum to the available amount", () => {
    const result = validatePlan({ mandatory: 12, optional: 8, savings: 10 }, 30);

    expect(result).toEqual({ ok: true, total: 30, remainder: 0 });
  });

  it("accepts buckets under the available amount and reports remainder", () => {
    const result = validatePlan({ mandatory: 12, optional: 5, savings: 10 }, 30);

    expect(result).toEqual({ ok: true, total: 27, remainder: 3 });
  });

  it("blocks confirmation when the buckets exceed the available amount", () => {
    const result = validatePlan({ mandatory: 12, optional: 8, savings: 10 }, 20);

    expect(result).toEqual({ ok: false, total: 30, remainder: -10 });
  });
});

describe("checkPurchase", () => {
  it("allows a purchase that exactly matches the balance", () => {
    expect(checkPurchase(25, 25)).toEqual({ status: "ok" });
  });

  it("rejects an over-balance purchase and reports how many coins are missing", () => {
    expect(checkPurchase(20, 25)).toEqual({ status: "blocked", missing: 5 });
  });
});

describe("day-close meters", () => {
  it("drops both meters by 15 whether or not a purchase fed them", () => {
    expect(
      dayCloseMeterDeltas({
        optionalSpend: 0,
        optionalPlan: 10,
        planMissing: false,
      }),
    ).toEqual({
      care: -15,
      mood: -15,
      dailyMood: -15,
      overspend: 0,
      noPlan: 0,
    });
  });

  it("stacks the daily Счастье drop with Желаемые overspend", () => {
    expect(
      dayCloseMeterDeltas({
        optionalSpend: 12,
        optionalPlan: 7,
        planMissing: false,
      }),
    ).toEqual({
      care: -15,
      mood: -20,
      dailyMood: -15,
      overspend: -5,
      noPlan: 0,
    });
  });

  it("does not punish optional spend when the day had no confirmed plan", () => {
    expect(
      dayCloseMeterDeltas({
        optionalSpend: 12,
        optionalPlan: null,
        planMissing: false,
      }),
    ).toEqual({
      care: -15,
      mood: -15,
      dailyMood: -15,
      overspend: 0,
      noPlan: 0,
    });
  });

  it("drops Счастье again when an open План was never confirmed", () => {
    expect(
      dayCloseMeterDeltas({
        optionalSpend: 0,
        optionalPlan: null,
        planMissing: true,
      }),
    ).toEqual({
      care: -15,
      mood: -25,
      dailyMood: -15,
      overspend: 0,
      noPlan: -10,
    });
  });

  it("treats План as open in Демо-режим and after the lesson, not on the day that lesson ends", () => {
    expect(planOpenAtClose({ isDemo: false, planLessonCompleted: false, planLessonEndsThisDay: false })).toBe(false);
    expect(planOpenAtClose({ isDemo: false, planLessonCompleted: true, planLessonEndsThisDay: true })).toBe(false);
    expect(planOpenAtClose({ isDemo: false, planLessonCompleted: true, planLessonEndsThisDay: false })).toBe(true);
    expect(planOpenAtClose({ isDemo: true, planLessonCompleted: false, planLessonEndsThisDay: false })).toBe(true);
  });

  it("clamps meters to 0–100", () => {
    expect(applyMeterDelta(10, -15)).toBe(0);
    expect(applyMeterDelta(95, 12)).toBe(100);
  });
});

describe("Счета and the План floor", () => {
  const cycle = [{ min: 20 }, { min: 25, note: "Сегодня питомец очень голодный" }];

  it("repeats the Счета cycle by Игровой день", () => {
    expect(billsForDay(1, cycle).min).toBe(20);
    expect(billsForDay(2, cycle).note).toBe("Сегодня питомец очень голодный");
    expect(billsForDay(3, cycle).min).toBe(20);
    expect(billsForDay(1, [])).toEqual({ min: 0 });
  });

  it("counts any Обязательные spend toward today's minimum", () => {
    expect(billsTotal(billsForDay(2, cycle))).toBe(25);
    expect(billsCovered(billsForDay(1, cycle), 19)).toBe(false);
    expect(billsCovered(billsForDay(1, cycle), 20)).toBe(true);
    expect(billsCovered(billsForDay(1, []), 0)).toBe(true);
  });

  it("clamps the floor to what the child has", () => {
    expect(planMandatoryFloor(25, 100)).toBe(25);
    expect(planMandatoryFloor(25, 10)).toBe(10);
  });

  it("rejects a План whose Обязательные are under the floor", () => {
    expect(validatePlan({ mandatory: 5, optional: 0, savings: 0 }, 100, 12).ok).toBe(false);
    expect(validatePlan({ mandatory: 12, optional: 0, savings: 0 }, 100, 12).ok).toBe(true);
  });
});

describe("planKept", () => {
  const plan = { mandatory: 20, optional: 10, savings: 15 };

  it("holds when every bucket is followed", () => {
    expect(planKept({ plan, actual: { mandatory: 20, optional: 10, savings: 15 } })).toBe(true);
  });

  it("breaks on Желаемые overspend, a skipped Копилка, or no confirmed План", () => {
    expect(planKept({ plan, actual: { mandatory: 20, optional: 11, savings: 15 } })).toBe(false);
    expect(planKept({ plan, actual: { mandatory: 20, optional: 0, savings: 5 } })).toBe(false);
    expect(planKept({ plan: null, actual: { mandatory: 0, optional: 0, savings: 0 } })).toBe(false);
  });

  it("lets a Копилка-0 plan be kept — its cost shows in the Цель forecast, not as a penalty", () => {
    const greedy = { mandatory: 20, optional: 100, savings: 0 };
    expect(planKept({ plan: greedy, actual: { mandatory: 20, optional: 45, savings: 0 } })).toBe(true);
  });
});
