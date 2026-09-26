import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { planMandatoryFloor, validatePlan, type PlanBuckets } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState } from "../../data/repositories/gameRepository";
import { AmountStepper } from "../components/AmountStepper";
import { CoinText } from "../components/CoinText";
import { CHART_COLORS } from "../components/DonutChart";
import { ScreenTitle } from "../components/ScreenTitle";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import { usePlayChrome } from "../navigation/playChrome";
import { activeGoalLabel } from "../goalLabel";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { dayStrings } from "../stringsDay";
import { moneyStrings } from "../stringsMoney";
import { colors, spacing, type } from "../theme";
import { bucketSpendOnDay, itemLookup } from "./journalStats";
import { Amount, HeroCard, MoneyCard, moneyColors, ProgressBar } from "./moneyParts";
import { daysToGoalAt, incomeToday, todayBills, wantsThatFit } from "./planDraft";

const EMPTY: PlanBuckets = { mandatory: 0, optional: 0, savings: 0 };

export default function PlanScreen() {
  const { game, meta, content } = useSession();
  const { touchChrome, focus } = usePlayChrome();
  const [day, setDay] = useState<DayState | null>(null);
  const [buckets, setBuckets] = useState<PlanBuckets>(EMPTY);
  const [yesterday, setYesterday] = useState<PlanBuckets | null>(null);
  const [askingConfirm, setAskingConfirm] = useState(false);
  const [income, setIncome] = useState(0);
  const [goal, setGoal] = useState<{ name: string; remaining: number } | null>(null);

  const load = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const next = game.dayState(profileId);
    setDay(next);
    const floor = planMandatoryFloor(todayBills(next.n, content.bills, content.catalog).total, next.available);
    // A fresh draft starts with today's Счета already in Обязательные.
    setBuckets(next.plan.status === "none" ? { ...EMPTY, mandatory: floor } : next.plan.buckets);
    const journal = game.listJournal(profileId);
    setIncome(incomeToday(journal, next.n));
    // Day 1 has no yesterday to compare with.
    setYesterday(
      next.n > 1 ? bucketSpendOnDay(journal, next.n - 1, itemLookup(content.catalog, content.goals)) : null,
    );
    const savings = game.savingsState(profileId);
    const active = savings.activeGoal;
    const name = active ? activeGoalLabel(active, content.goals)?.name : undefined;
    setGoal(active && name && !active.achieved ? { name, remaining: active.remaining } : null);
    setAskingConfirm(false);
    touchChrome();
  }, [game, meta, content, touchChrome]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!day) {
    return (
      <Screen>
        <CoinText text={strings.appName} style={styles.body} />
      </Screen>
    );
  }

  if (!day.open) {
    return (
      <Screen>
        <ScreenTitle style={styles.title}>{strings.navPlan}</ScreenTitle>
        <CoinText text={strings.waitingEconomyHint} style={styles.body} />
      </Screen>
    );
  }

  const confirmed = day.plan.status === "confirmed";
  const bills = todayBills(day.n, content.bills, content.catalog);
  const floor = planMandatoryFloor(bills.total, day.available);
  const billsShort = bills.total - floor;
  const check = validatePlan(buckets, day.available, floor);
  const goalDays = goal ? daysToGoalAt(goal.remaining, buckets.savings) : null;
  const persist = (next: PlanBuckets) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || confirmed) return;
    setBuckets(next);
    game.saveDraftPlan(profileId, day.dayId, next);
  };

  const askConfirm = () => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || !check.ok || confirmed) return;
    game.saveDraftPlan(profileId, day.dayId, buckets);
    setAskingConfirm(true);
  };

  const confirm = () => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const result = game.confirmPlan(profileId, day.dayId, floor);
    if (!result.ok) {
      setAskingConfirm(false);
      load();
      return;
    }
    load();
  };

  const shown = confirmed ? day.plan.buckets : buckets;
  const free = Math.max(0, day.available - shown.mandatory - shown.optional - shown.savings);
  const slices = [
    { id: "mandatory", label: strings.bucketMandatory, color: CHART_COLORS.mandatory, amount: shown.mandatory },
    { id: "savings", label: strings.bucketSavings, color: CHART_COLORS.savings, amount: shown.savings },
    { id: "optional", label: strings.bucketOptional, color: CHART_COLORS.optional, amount: shown.optional },
    { id: "free", label: moneyStrings.planFree, color: moneyColors.free, amount: free },
  ];
  const chartParts = slices.filter((row) => row.amount > 0);

  return (
    <Screen
      footer={
        confirmed ? null : askingConfirm ? (
          <>
            <TextButton label={strings.close} onPress={() => setAskingConfirm(false)} />
            <PrimaryButton highlighted={focus?.kind === "plan"} label={strings.confirmPlan} onPress={confirm} />
          </>
        ) : (
          <PrimaryButton highlighted={focus?.kind === "plan"} label={strings.confirmPlan} disabled={!check.ok} onPress={askConfirm} />
        )
      }
    >
      <ScreenTitle style={styles.title}>{strings.navPlan}</ScreenTitle>
      <HeroCard caption={moneyStrings.planCaption} value={day.available} label={strings.planAvailable(day.available)}>
        {confirmed || income <= 0 ? null : <Text style={styles.income}>{strings.planIncomeToday(income)}</Text>}
      </HeroCard>
      <MoneyCard>
        <Text style={styles.section}>{confirmed ? moneyStrings.planSplit : moneyStrings.planHow}</Text>
        <SplitBar
          slices={slices.map((row) => ({ id: row.id, value: row.amount, color: row.color }))}
          label={moneyStrings.planChartA11y(chartParts.map((row) => ({ label: row.label, amount: row.amount, percent: 0 })))}
        />
        {confirmed ? null : <Leftover remainder={check.remainder} />}
        {confirmed ? (
          <>
            <BucketActual
              label={strings.bucketMandatory}
              color={CHART_COLORS.mandatory}
              plan={day.plan.buckets.mandatory}
              actual={day.actual.mandatory}
              yesterday={yesterday?.mandatory}
            />
            <BucketActual
              divided
              label={strings.bucketSavings}
              color={CHART_COLORS.savings}
              plan={day.plan.buckets.savings}
              actual={day.actual.savings}
              yesterday={yesterday?.savings}
            />
            <BucketActual
              divided
              label={strings.bucketOptional}
              color={CHART_COLORS.optional}
              plan={day.plan.buckets.optional}
              actual={day.actual.optional}
              yesterday={yesterday?.optional}
            />
          </>
        ) : (
          <>
            {/* Order = order of decisions: Счета → себе на Цель → желаемое на остаток. */}
            <DraftBucket
              label={strings.bucketMandatory}
              pictogram={strings.navPlanPictogram}
              color={CHART_COLORS.mandatory}
              value={buckets.mandatory}
              min={floor}
              max={day.available}
              yesterday={yesterday?.mandatory}
              details={
                bills.parts.length === 0 ? null : (
                  <View style={styles.bills}>
                    <CoinText coin text={dayStrings.planBillsMin(bills.total)} style={styles.billTitle} />
                    {bills.note ? <CoinText text={bills.note} style={styles.small} /> : null}
                    <CoinText coin text={strings.planBillsLine(bills.parts, bills.total)} style={styles.small} />
                    {billsShort > 0 ? <CoinText text={strings.planBillsShort(billsShort)} style={styles.small} /> : null}
                  </View>
                )
              }
              onChange={(mandatory) => persist({ ...buckets, mandatory: Math.max(floor, mandatory) })}
            />
            <DraftBucket
              divided
              label={strings.bucketSavings}
              pictogram={strings.navSavingsPictogram}
              color={CHART_COLORS.savings}
              value={buckets.savings}
              max={day.available}
              yesterday={yesterday?.savings}
              hint={
                goal
                  ? goalDays == null
                    ? strings.planGoalNoSavings(goal.name)
                    : strings.planGoalForecast(goal.name, goalDays)
                  : undefined
              }
              onChange={(savings) => persist({ ...buckets, savings })}
            />
            <DraftBucket
              divided
              label={strings.bucketOptional}
              pictogram={strings.navShopPictogram}
              color={CHART_COLORS.optional}
              value={buckets.optional}
              max={day.available}
              yesterday={yesterday?.optional}
              hint={strings.planWantsHint(wantsThatFit(content.catalog, buckets.optional))}
              onChange={(optional) => persist({ ...buckets, optional })}
            />
          </>
        )}
      </MoneyCard>
      {askingConfirm ? (
        <Card>
          <CoinText text={strings.confirmPlanTitle} style={styles.section} />
          <CoinText text={strings.confirmPlanBody} style={styles.body} />
        </Card>
      ) : null}
    </Screen>
  );
}

function compareLine(today: number, yesterday: number): string {
  if (today > yesterday) return moneyStrings.planCompareMore(today - yesterday);
  if (today < yesterday) return moneyStrings.planCompareLess(yesterday - today);
  return moneyStrings.planCompareSame;
}

/** «Вчера: N» chip and how today's number compares; nothing on day 1. */
function Yesterday({ today, yesterday }: { today: number; yesterday?: number }) {
  if (yesterday == null) return null;
  return (
    <View style={styles.yesterday}>
      <Text style={styles.yesterdayText}>{moneyStrings.planYesterday(yesterday)}</Text>
      <Text style={styles.compare}>{compareLine(today, yesterday)}</Text>
    </View>
  );
}

/** «Осталось разложить N» under the bar; red when the piles hold more than there is. */
function Leftover({ remainder }: { remainder: number }) {
  if (remainder < 0) {
    return <CoinText text={dayStrings.planTooMuch(-remainder)} style={[styles.remainder, styles.remainderOver]} />;
  }
  return (
    <CoinText
      coin={remainder > 0}
      text={remainder > 0 ? dayStrings.planLeft(remainder) : dayStrings.planAllPlaced}
      style={[styles.remainder, remainder === 0 ? styles.remainderDone : null]}
    />
  );
}

/** One pile: colored shares, and the unfilled track is «Свободно». */
function SplitBar({
  slices,
  label,
}: {
  slices: readonly { id: string; value: number; color: string }[];
  label: string;
}) {
  return (
    <View accessible role="img" aria-label={label} style={styles.bar}>
      {slices.map((slice) =>
        slice.value <= 0 ? null : slice.id === "free" ? (
          <View key={slice.id} style={{ flex: slice.value }} />
        ) : (
          <View key={slice.id} style={[styles.barSeg, { flex: slice.value, backgroundColor: slice.color }]} />
        ),
      )}
    </View>
  );
}

function BucketHeader({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.bucketHead}>
      <View style={[styles.bucketDot, { backgroundColor: color }]} />
      <Text style={styles.bucketLabel}>{label}</Text>
    </View>
  );
}

function DraftBucket({
  label,
  pictogram,
  color,
  value,
  max,
  yesterday,
  hint,
  details,
  min,
  divided,
  onChange,
}: {
  label: string;
  pictogram: string;
  color: string;
  value: number;
  max: number;
  yesterday?: number;
  hint?: string;
  details?: ReactNode;
  min?: number;
  divided?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <View style={[styles.bucket, { borderLeftColor: color }, divided ? styles.divided : null]}>
      <AmountStepper
        label={label}
        pictogram={pictogram}
        value={value}
        min={min}
        max={max}
        dense
        showTrack
        trackColor={color}
        amountLabel={moneyStrings.legendRow(label, value)}
        onChange={onChange}
      />
      <Yesterday today={value} yesterday={yesterday} />
      {details}
      {hint ? <CoinText text={hint} style={styles.small} /> : null}
    </View>
  );
}

function BucketActual({
  label,
  color,
  plan,
  actual,
  yesterday,
  divided,
}: {
  label: string;
  color: string;
  plan: number;
  actual: number;
  yesterday?: number;
  divided?: boolean;
}) {
  return (
    <View style={[styles.bucket, { borderLeftColor: color }, divided ? styles.divided : null]}>
      <View style={styles.bucketTop}>
        <BucketHeader label={label} color={color} />
        <Amount value={actual} size={14} />
      </View>
      <ProgressBar value={actual} max={plan} color={color} />
      <CoinText coin text={strings.planVsActual(plan, actual)} style={styles.small} />
      <Yesterday today={plan} yesterday={yesterday} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  section: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  income: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  small: {
    color: colors.subtle,
    fontSize: type.body,
    lineHeight: 20,
  },
  remainder: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  remainderOver: {
    color: moneyColors.minus,
  },
  remainderDone: {
    color: moneyColors.plus,
  },
  bar: {
    backgroundColor: colors.track,
    borderRadius: 10,
    flexDirection: "row",
    height: 24,
    overflow: "hidden",
  },
  barSeg: {
    height: 24,
  },
  bills: {
    gap: 0,
  },
  billTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  bucket: {
    borderLeftWidth: 4,
    gap: 4,
    paddingLeft: spacing.s,
    paddingVertical: 4,
  },
  divided: {
    borderTopColor: colors.track,
    borderTopWidth: 1,
  },
  bucketTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bucketHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  bucketDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  bucketLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  yesterday: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  yesterdayText: {
    color: colors.subtle,
    fontSize: type.body,
  },
  compare: {
    color: colors.subtle,
    flexShrink: 1,
    fontSize: type.body,
  },
});
