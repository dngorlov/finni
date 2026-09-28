import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { planMandatoryFloor, validatePlan, type PlanBuckets } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState } from "../../data/repositories/gameRepository";
import { CoinText } from "../components/CoinText";
import { CHART_COLORS } from "../components/DonutChart";
import { Pictogram, PixelIcon } from "../components/Pictogram";
import { PileSlider } from "../components/PileSlider";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ScreenTitle } from "../components/ScreenTitle";
import { TextButton } from "../components/TextButton";
import { useBottomInset } from "../components/safeBottom";
import { activeGoalLabel } from "../goalLabel";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { dayStrings } from "../stringsDay";
import { moneyStrings } from "../stringsMoney";
import { colors, radius, spacing, type } from "../theme";
import { bucketSpendOnDay, itemLookup } from "./journalStats";
import { Amount, MoneyCard, moneyColors } from "./moneyParts";
import { bucketInk } from "./planFact";
import { daysToGoalAt, todayBills, wantsThatFit } from "./planDraft";

const EMPTY: PlanBuckets = { mandatory: 0, optional: 0, savings: 0 };

/** Wizard order: счета first, then the goal, then wants. One pile per step. */
const PILES: readonly {
  id: keyof PlanBuckets;
  label: string;
  color: string;
  pictogram: string;
}[] = [
  { id: "mandatory", label: strings.bucketMandatory, color: CHART_COLORS.mandatory, pictogram: strings.navPlanPictogram },
  { id: "savings", label: strings.bucketSavings, color: CHART_COLORS.savings, pictogram: strings.navSavingsPictogram },
  { id: "optional", label: strings.bucketOptional, color: CHART_COLORS.optional, pictogram: strings.navShopPictogram },
];
const LAST = PILES.length - 1;

const hidden = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no-hide-descendants" as const,
};

/** Give pile `index` its new amount; later piles shrink (last first) so the plan never tops Баланс. */
function withPile(buckets: PlanBuckets, index: number, value: number, available: number): PlanBuckets {
  const next = { ...buckets, [PILES[index]!.id]: value };
  let over = next.mandatory + next.optional + next.savings - Math.max(available, 0);
  for (let later = LAST; later > index && over > 0; later -= 1) {
    const id = PILES[later]!.id;
    const cut = Math.min(next[id], over);
    next[id] -= cut;
    over -= cut;
  }
  return next;
}

export default function PlanScreen() {
  const { game, meta, content } = useSession();
  const { touchChrome, focus } = usePlayChrome();
  const bottomInset = useBottomInset();
  const [day, setDay] = useState<DayState | null>(null);
  const [buckets, setBuckets] = useState<PlanBuckets>(EMPTY);
  const [yesterday, setYesterday] = useState<PlanBuckets | null>(null);
  const [askingConfirm, setAskingConfirm] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
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
    // Day 1 has no yesterday to compare with.
    setYesterday(
      next.n > 1 ? bucketSpendOnDay(journal, next.n - 1, itemLookup(content.catalog, content.goals)) : null,
    );
    const savings = game.savingsState(profileId);
    const active = savings.activeGoal;
    const name = active ? activeGoalLabel(active, content.goals)?.name : undefined;
    setGoal(active && name && !active.achieved ? { name, remaining: active.remaining } : null);
    setAskingConfirm(false);
    setEditing(false);
    setStep(0);
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
  const hasPurchases = profileId != null && game.purchasedItemIds(profileId, day.dayId).length > 0;
  // A confirmed promise stays editable until the first purchase of the day.
  const locked = confirmed && hasPurchases;

  if (confirmed && (locked || !editing)) {
    return (
      <Summary
        plan={day.plan.buckets}
        actual={day.actual}
        locked={locked}
        onEdit={() => {
          setStep(0);
          setEditing(true);
        }}
      />
    );
  }

  const available = day.available;
  const bills = todayBills(day.n, content.bills, content.catalog);
  const floor = planMandatoryFloor(bills.total, available);
  const billsShort = bills.total - floor;
  const check = validatePlan(buckets, available, floor);
  const pile = PILES[step]!;
  const value = buckets[pile.id];
  const earlier = PILES.slice(0, step).map((row) => ({ id: row.id, value: buckets[row.id], color: row.color }));
  const before = earlier.reduce((sum, row) => sum + row.value, 0);
  const min = pile.id === "mandatory" ? floor : 0;
  const max = Math.max(min, available - before);
  const billsMissing = Math.max(0, floor - buckets.mandatory);
  const goalDays = goal ? daysToGoalAt(goal.remaining, buckets.savings) : null;

  const persist = (next: PlanBuckets) => {
    if (!profileId || locked) return;
    setBuckets(next);
    if (confirmed && !validatePlan(next, available, floor).ok) return;
    game.saveDraftPlan(profileId, day.dayId, next);
  };

  const setPile = (amount: number) =>
    persist(withPile(buckets, step, pile.id === "mandatory" ? Math.max(floor, amount) : amount, available));

  const askConfirm = () => {
    if (!profileId || !check.ok || confirmed) return;
    game.saveDraftPlan(profileId, day.dayId, buckets);
    setAskingConfirm(true);
  };

  const confirm = () => {
    if (!profileId) return;
    game.confirmPlan(profileId, day.dayId, floor);
    load();
  };

  const goTo = (next: number) => {
    setAskingConfirm(false);
    setStep(next);
  };

  // One short line under the slider: what blocks «Далее», else what is still free.
  const status =
    step === 0 && billsMissing > 0
      ? { text: moneyStrings.planNeedMore(billsMissing), tone: styles.statusWarn }
      : check.remainder < 0
        ? { text: dayStrings.planTooMuch(-check.remainder), tone: styles.statusWarn }
        : step < LAST
          ? { text: moneyStrings.planFreeNow(check.remainder), tone: null }
          : check.remainder === 0
            ? { text: dayStrings.planAllPlaced, tone: styles.statusDone }
            : { text: strings.planRemainder(check.remainder), tone: null };

  const explain =
    pile.id === "mandatory"
      ? (bills.note ?? moneyStrings.planStepMandatory)
      : pile.id === "savings"
        ? moneyStrings.planStepSavings
        : moneyStrings.planJobOptional;
  const detail =
    pile.id === "mandatory"
      ? billsShort > 0
        ? strings.planBillsShort(billsShort)
        : bills.total > 0
          ? moneyStrings.planNeedMin(bills.parts.map((part) => part.name), bills.total)
          : null
      : pile.id === "savings"
        ? goal
          ? goalDays == null
            ? strings.planGoalNoSavings(goal.name)
            : strings.planGoalForecast(goal.name, goalDays)
          : null
        : strings.planWantsHint(wantsThatFit(content.catalog, buckets.optional));
  const past = yesterday?.[pile.id];

  const nextBlocked = step === 0 && billsMissing > 0;
  const primary =
    step < LAST ? (
      <PrimaryButton
        highlighted={focus?.kind === "plan"}
        label={moneyStrings.planNext}
        disabled={nextBlocked}
        onPress={() => goTo(step + 1)}
      />
    ) : confirmed ? (
      <PrimaryButton label={moneyStrings.planEditDone} onPress={load} />
    ) : (
      <PrimaryButton
        highlighted={focus?.kind === "plan"}
        label={strings.confirmPlan}
        disabled={!check.ok}
        onPress={askConfirm}
      />
    );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.stage}>
        <View style={styles.top}>
          <StepDots step={step} onBack={goTo} />
          <CoinText coin text={strings.planAvailable(available)} style={styles.small} />
        </View>
        <View style={styles.heading}>
          <View {...hidden} style={[styles.mark, { backgroundColor: pile.color }]}>
            <Pictogram glyph={pile.pictogram} size={20} color={bucketInk(pile.color)} />
          </View>
          <Text role="heading" style={styles.pileName} numberOfLines={1}>
            {pile.label}
          </Text>
          <View accessible aria-label={strings.bucketValue(pile.label, value)}>
            <Amount value={value} size={24} />
          </View>
        </View>
        <CoinText text={explain} style={styles.explain} />
        {detail ? <CoinText coin={pile.id === "mandatory"} text={detail} style={styles.small} /> : null}
        {past == null ? null : (
          <View style={styles.yesterday}>
            <Text style={styles.small}>{moneyStrings.planYesterday(past)}</Text>
            <Text style={styles.small}>{` · ${compareLine(value, past)}`}</Text>
          </View>
        )}
      </ScrollView>
      <View style={[styles.panel, bottomInset > 0 ? { paddingBottom: spacing.s + bottomInset } : null]}>
        {askingConfirm ? (
          <>
            <View style={styles.confirmSheet}>
              <CoinText text={strings.confirmPlanTitle} style={styles.section} />
              <CoinText text={strings.confirmPlanBody} style={styles.small} />
            </View>
            <View style={styles.actions}>
              <TextButton label={strings.close} onPress={() => setAskingConfirm(false)} />
              <View style={styles.grow}>
                <PrimaryButton highlighted={focus?.kind === "plan"} label={strings.confirmPlan} onPress={confirm} />
              </View>
            </View>
          </>
        ) : (
          <>
            <PileSlider
              label={pile.label}
              value={value}
              min={min}
              max={max}
              total={available}
              locked={earlier}
              color={pile.color}
              valueText={moneyStrings.legendRow(pile.label, value)}
              onChange={setPile}
            />
            <CoinText coin={status.tone == null} text={status.text} style={[styles.status, status.tone]} />
            <View style={styles.actions}>
              {step > 0 ? <TextButton label={moneyStrings.planBack} onPress={() => goTo(step - 1)} /> : null}
              <View style={styles.grow}>{primary}</View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function compareLine(today: number, yesterday: number): string {
  if (today > yesterday) return moneyStrings.planCompareMore(today - yesterday);
  if (today < yesterday) return moneyStrings.planCompareLess(yesterday - today);
  return moneyStrings.planCompareSame;
}

/** ● ○ ○ — done steps can be tapped to go back; the current one is read as «Шаг N из 3». */
function StepDots({ step, onBack }: { step: number; onBack: (step: number) => void }) {
  return (
    <View style={styles.dots}>
      {PILES.map((pile, index) =>
        index < step ? (
          <Pressable
            key={pile.id}
            role="button"
            aria-label={moneyStrings.planStepGo(index + 1, pile.label)}
            hitSlop={12}
            onPress={() => onBack(index)}
            style={styles.dotHit}
          >
            <View style={[styles.dot, styles.dotDone]} />
          </Pressable>
        ) : index === step ? (
          <View
            key={pile.id}
            accessible
            aria-label={moneyStrings.planStepOf(index + 1, PILES.length, pile.label)}
            style={styles.dotHit}
          >
            <View style={[styles.dot, styles.dotOn]} />
          </View>
        ) : (
          <View key={pile.id} {...hidden} style={styles.dotHit}>
            <View style={styles.dot} />
          </View>
        ),
      )}
    </View>
  );
}

/** After «Подтвердить»: one row per pile, plan / fact. */
function Summary({
  plan,
  actual,
  locked,
  onEdit,
}: {
  plan: PlanBuckets;
  actual: PlanBuckets;
  locked: boolean;
  onEdit: () => void;
}) {
  return (
    <Screen>
      <View style={styles.lockedRow}>
        {locked ? (
          <View {...hidden}>
            <PixelIcon name="lock" size={20} color={moneyColors.plus} />
          </View>
        ) : null}
        <Text style={styles.body}>{locked ? moneyStrings.planLocked : moneyStrings.planRevise}</Text>
      </View>
      <MoneyCard tight>
        <View {...hidden} style={styles.factHead}>
          <Text style={styles.factHeadText}>{`${strings.planColPlan} / ${strings.planColActual}`}</Text>
        </View>
        {PILES.map((pile, index) => (
          <View
            key={pile.id}
            accessible
            aria-label={moneyStrings.planFactA11y(pile.label, plan[pile.id], actual[pile.id])}
            style={[styles.factRow, index < LAST ? styles.factDivider : null]}
          >
            <View style={[styles.markSmall, { backgroundColor: pile.color }]}>
              <Pictogram glyph={pile.pictogram} size={16} color={bucketInk(pile.color)} />
            </View>
            <Text style={styles.factLabel} numberOfLines={1}>
              {pile.label}
            </Text>
            <CoinText
              coin
              labelled={false}
              text={`${plan[pile.id]} / ${actual[pile.id]}`}
              style={[styles.factValue, actual[pile.id] > plan[pile.id] && pile.id !== "savings" ? styles.over : null]}
            />
          </View>
        ))}
      </MoneyCard>
      {locked ? null : <TextButton label={moneyStrings.planEdit} onPress={onEdit} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  stage: {
    flexGrow: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
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
    flexShrink: 1,
    fontSize: type.body,
    lineHeight: 22,
  },
  small: {
    color: colors.subtle,
    fontSize: type.body,
    lineHeight: 20,
  },
  explain: {
    color: colors.text,
    fontSize: type.body,
    lineHeight: 20,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    justifyContent: "space-between",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dotHit: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  dot: {
    borderColor: colors.accentText,
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  dotOn: {
    backgroundColor: colors.accentText,
  },
  dotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: 36,
  },
  mark: {
    alignItems: "center",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  pileName: {
    color: colors.text,
    flex: 1,
    fontSize: type.section,
    fontWeight: "700",
  },
  yesterday: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    gap: 4,
    paddingBottom: spacing.s,
    paddingHorizontal: spacing.m,
    paddingTop: 4,
  },
  status: {
    alignSelf: "center",
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
    lineHeight: 20,
  },
  statusWarn: {
    color: moneyColors.minus,
  },
  statusDone: {
    color: moneyColors.plus,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  grow: {
    flex: 1,
  },
  confirmSheet: {
    backgroundColor: colors.highlight,
    borderRadius: radius.card,
    gap: 4,
    padding: spacing.m,
  },
  lockedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  factHead: {
    alignItems: "flex-end",
  },
  factHeadText: {
    color: colors.subtle,
    fontSize: type.body,
  },
  factRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: 44,
  },
  factDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  markSmall: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  factLabel: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  factValue: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  over: {
    color: moneyColors.minus,
  },
});
