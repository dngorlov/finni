import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { planMandatoryFloor, validatePlan, type PlanBuckets } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState } from "../../data/repositories/gameRepository";
import { AmountStepper } from "../components/AmountStepper";
import { CoinText } from "../components/CoinText";
import { CHART_COLORS } from "../components/DonutChart";
import { Pictogram, PixelIcon } from "../components/Pictogram";
import { ScreenTitle } from "../components/ScreenTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import { usePlayChrome } from "../navigation/playChrome";
import { activeGoalLabel } from "../goalLabel";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { dayStrings } from "../stringsDay";
import { moneyStrings } from "../stringsMoney";
import { colors, radius, spacing, type } from "../theme";
import { bucketSpendOnDay, itemLookup } from "./journalStats";
import { Amount, HeroCard, MoneyCard, moneyColors, ProgressBar } from "./moneyParts";
import { bucketInk } from "./planFact";
import { daysToGoalAt, incomeToday, todayBills, wantsThatFit } from "./planDraft";

const EMPTY: PlanBuckets = { mandatory: 0, optional: 0, savings: 0 };

/** Order of decisions: счета, then the goal, then wants. */
const PILES: readonly {
  id: keyof PlanBuckets;
  step: string;
  label: string;
  color: string;
  pictogram: string;
  job: string;
}[] = [
  {
    id: "mandatory",
    step: "1",
    label: strings.bucketMandatory,
    color: CHART_COLORS.mandatory,
    pictogram: strings.navPlanPictogram,
    job: moneyStrings.planJobMandatory,
  },
  {
    id: "savings",
    step: "2",
    label: strings.bucketSavings,
    color: CHART_COLORS.savings,
    pictogram: strings.navSavingsPictogram,
    job: strings.planSavingsExtra,
  },
  {
    id: "optional",
    step: "3",
    label: strings.bucketOptional,
    color: CHART_COLORS.optional,
    pictogram: strings.navShopPictogram,
    job: moneyStrings.planJobOptional,
  },
];

const hidden = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no-hide-descendants" as const,
};

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

  const profileId = meta.get(META_KEYS.activeProfileId);
  const confirmed = day.plan.status === "confirmed";
  const hasPurchases =
    profileId != null && game.purchasedItemIds(profileId, day.dayId).length > 0;
  // A confirmed promise stays editable until the first purchase of the day.
  const locked = confirmed && hasPurchases;
  const bills = todayBills(day.n, content.bills, content.catalog);
  const floor = planMandatoryFloor(bills.total, day.available);
  const billsShort = bills.total - floor;
  const check = validatePlan(buckets, day.available, floor);
  const goalDays = goal ? daysToGoalAt(goal.remaining, buckets.savings) : null;
  const persist = (next: PlanBuckets) => {
    if (!profileId || locked) return;
    setBuckets(next);
    if (confirmed && !validatePlan(next, day.available, floor).ok) return;
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

  const shown = locked ? day.plan.buckets : buckets;
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
        locked || confirmed ? null : askingConfirm ? (
          <>
            <View style={styles.confirmSheet}>
              <CoinText text={strings.confirmPlanTitle} style={styles.section} />
              <CoinText text={strings.confirmPlanBody} style={styles.body} />
              <View {...hidden} style={styles.confirmPiles}>
                {PILES.map((pile) => (
                  <View key={pile.id} style={styles.confirmPile}>
                    <View style={[styles.dot, { backgroundColor: pile.color }]} />
                    <Text style={styles.confirmPileLabel}>{pile.label}</Text>
                    <Amount value={shown[pile.id]} size={14} />
                  </View>
                ))}
              </View>
            </View>
            <TextButton label={strings.close} onPress={() => setAskingConfirm(false)} />
            <PrimaryButton highlighted={focus?.kind === "plan"} label={strings.confirmPlan} onPress={confirm} />
          </>
        ) : (
          <PrimaryButton
            highlighted={focus?.kind === "plan"}
            label={strings.confirmPlan}
            disabled={!check.ok}
            onPress={askConfirm}
          />
        )
      }
    >
      <ScreenTitle style={styles.title}>{strings.navPlan}</ScreenTitle>
      <HeroCard caption={moneyStrings.planCaption} value={day.available} label={strings.planAvailable(day.available)}>
        {locked || income <= 0 ? null : <Text style={styles.income}>{strings.planIncomeToday(income)}</Text>}
        {locked ? null : <Text style={styles.promise}>{strings.planPromise}</Text>}
      </HeroCard>
      <MoneyCard>
        <Text style={styles.section}>{locked ? moneyStrings.planSplit : moneyStrings.planHow}</Text>
        {locked ? (
          <View style={styles.lockedRow}>
            <PixelIcon name="lock" size={20} color={moneyColors.plus} />
            <Text style={styles.locked}>{moneyStrings.planLocked}</Text>
          </View>
        ) : confirmed ? (
          <Text style={styles.locked}>{moneyStrings.planRevise}</Text>
        ) : null}
        <SplitBar
          slices={slices.map((row) => ({ id: row.id, value: row.amount, color: row.color }))}
          label={moneyStrings.planChartA11y(chartParts.map((row) => ({ label: row.label, amount: row.amount, percent: 0 })))}
        />
        {locked ? null : <Leftover remainder={check.remainder} />}
      </MoneyCard>
      {locked
        ? PILES.map((pile) => (
            <FactPile
              key={pile.id}
              pile={pile}
              plan={day.plan.buckets[pile.id]}
              actual={day.actual[pile.id]}
            />
          ))
        : PILES.map((pile) => (
            <DraftPile
              key={pile.id}
              pile={pile}
              value={buckets[pile.id]}
              max={day.available}
              min={pile.id === "mandatory" ? floor : 0}
              yesterday={yesterday?.[pile.id]}
              hint={
                pile.id === "savings"
                  ? goal
                    ? goalDays == null
                      ? strings.planGoalNoSavings(goal.name)
                      : strings.planGoalForecast(goal.name, goalDays)
                    : undefined
                  : pile.id === "optional"
                    ? strings.planWantsHint(wantsThatFit(content.catalog, buckets.optional))
                    : undefined
              }
              details={
                pile.id === "mandatory" && bills.parts.length > 0 ? (
                  <View style={styles.bills}>
                    <CoinText coin text={dayStrings.planBillsMin(bills.total)} style={styles.billTitle} />
                    {bills.note ? <CoinText text={bills.note} style={styles.small} /> : null}
                    <CoinText coin text={strings.planBillsLine(bills.parts, bills.total)} style={styles.small} />
                    {billsShort > 0 ? <CoinText text={strings.planBillsShort(billsShort)} style={styles.small} /> : null}
                  </View>
                ) : null
              }
              onChange={(value) =>
                persist({
                  ...buckets,
                  [pile.id]: pile.id === "mandatory" ? Math.max(floor, value) : value,
                })
              }
            />
          ))}
    </Screen>
  );
}

function compareLine(today: number, yesterday: number): string {
  if (today > yesterday) return moneyStrings.planCompareMore(today - yesterday);
  if (today < yesterday) return moneyStrings.planCompareLess(yesterday - today);
  return moneyStrings.planCompareSame;
}

/** «Вчера: N» and how today's number compares; nothing on day 1. */
function Yesterday({ today, yesterday }: { today: number; yesterday?: number }) {
  if (yesterday == null) return null;
  return (
    <View style={styles.yesterday}>
      <Text style={styles.yesterdayText}>{moneyStrings.planYesterday(yesterday)}</Text>
      <Text style={styles.compare}>{compareLine(today, yesterday)}</Text>
    </View>
  );
}

/** How many coins are still not in a pile; red when the piles hold more than there is. */
function Leftover({ remainder }: { remainder: number }) {
  const over = remainder < 0;
  const done = remainder === 0;
  const text = over
    ? dayStrings.planTooMuch(-remainder)
    : remainder > 0
      ? dayStrings.planLeft(remainder)
      : dayStrings.planAllPlaced;
  return (
    <View style={[styles.status, over ? styles.statusOver : done ? styles.statusDone : styles.statusLeft]}>
      <View {...hidden}>
        <PixelIcon
          name={over ? "warning-diamond" : done ? "check" : "coins"}
          size={22}
          color={over ? moneyColors.minus : done ? moneyColors.plus : colors.accentText}
        />
      </View>
      <View style={styles.statusText}>
        <CoinText
          coin={!over && remainder > 0}
          text={text}
          style={[styles.remainder, over ? styles.remainderOver : done ? styles.remainderDone : null]}
        />
      </View>
    </View>
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

function PileShell({ color, children }: { color: string; children: ReactNode }) {
  return (
    <View style={styles.pile}>
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.pileBody}>{children}</View>
    </View>
  );
}

function DraftPile({
  pile,
  value,
  max,
  min,
  yesterday,
  hint,
  details,
  onChange,
}: {
  pile: (typeof PILES)[number];
  value: number;
  max: number;
  min: number;
  yesterday?: number;
  hint?: string;
  details?: ReactNode;
  onChange: (next: number) => void;
}) {
  return (
    <PileShell color={pile.color}>
      <View style={styles.jobRow}>
        <View {...hidden} style={[styles.badge, { backgroundColor: pile.color }]}>
          <Text style={[styles.badgeText, { color: bucketInk(pile.color) }]}>{pile.step}</Text>
        </View>
        <Text style={styles.job}>{pile.job}</Text>
      </View>
      <AmountStepper
        label={pile.label}
        pictogram={pile.pictogram}
        value={value}
        min={min}
        max={max}
        dense
        showTrack
        trackColor={pile.color}
        amountLabel={moneyStrings.legendRow(pile.label, value)}
        onChange={onChange}
      />
      {details}
      {hint ? <CoinText text={hint} style={styles.small} /> : null}
      <Yesterday today={value} yesterday={yesterday} />
    </PileShell>
  );
}

function FactPile({
  pile,
  plan,
  actual,
}: {
  pile: (typeof PILES)[number];
  plan: number;
  actual: number;
}) {
  return (
    <PileShell color={pile.color}>
      <View style={styles.factTop}>
        <View {...hidden} style={[styles.mark, { backgroundColor: pile.color }]}>
          <Pictogram glyph={pile.pictogram} size={22} color={bucketInk(pile.color)} />
        </View>
        <View style={styles.factText}>
          <Text style={styles.bucketLabel}>{pile.label}</Text>
          <CoinText coin text={strings.planVsActual(plan, actual)} style={styles.small} />
        </View>
        <Amount value={actual} size={16} />
      </View>
      <ProgressBar value={actual} max={Math.max(plan, actual, 1)} color={pile.color} />
    </PileShell>
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
    lineHeight: 22,
  },
  income: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  promise: {
    color: moneyColors.heroText,
    fontSize: type.body,
    lineHeight: 22,
  },
  lockedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  locked: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    lineHeight: 22,
  },
  small: {
    color: colors.subtle,
    fontSize: type.body,
    lineHeight: 22,
  },
  remainder: {
    color: colors.text,
    flexShrink: 1,
    fontSize: type.body,
    fontWeight: "700",
    lineHeight: 22,
  },
  remainderOver: {
    color: moneyColors.minus,
  },
  remainderDone: {
    color: moneyColors.plus,
  },
  status: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.s,
    padding: 12,
  },
  statusLeft: {
    backgroundColor: colors.highlight,
  },
  statusDone: {
    backgroundColor: colors.track,
  },
  statusOver: {
    backgroundColor: colors.card,
    borderColor: moneyColors.minus,
    borderWidth: 2,
  },
  statusText: {
    flex: 1,
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
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  bills: {
    backgroundColor: colors.highlight,
    borderRadius: 16,
    gap: 4,
    padding: spacing.s + 4,
  },
  billTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
    lineHeight: 22,
  },
  pile: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  stripe: {
    height: 8,
  },
  pileBody: {
    gap: spacing.s,
    padding: spacing.m,
  },
  jobRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  badge: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  badgeText: {
    fontSize: type.body,
    fontWeight: "700",
  },
  job: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
    lineHeight: 22,
  },
  yesterday: {
    backgroundColor: colors.track,
    borderRadius: 16,
    gap: 2,
    paddingHorizontal: spacing.s + 4,
    paddingVertical: spacing.s,
  },
  yesterdayText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  compare: {
    color: colors.subtle,
    fontSize: type.body,
    lineHeight: 22,
  },
  factTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  factText: {
    flex: 1,
    gap: 2,
  },
  mark: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  bucketLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  confirmSheet: {
    backgroundColor: colors.highlight,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  confirmPiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  confirmPile: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 28,
  },
  confirmPileLabel: {
    color: colors.text,
    fontSize: type.body,
  },
});
