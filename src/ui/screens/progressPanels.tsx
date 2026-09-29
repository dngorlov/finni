import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { playableTasks } from "../../core/tasks";
import { META_KEYS } from "../../data/metaKeys";
import type { Insight } from "../../core/dayInsights";
import type { DaySummaryView, JournalEntry, TaskProgressView } from "../../data/repositories/gameRepository";
import { EarnedAchievements } from "../components/AchievementBoard";
import { PixelIcon } from "../components/Pictogram";
import { StageCardPlate } from "../components/StageCard";
import { goalFace } from "../goalLabel";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { CHART_COLORS, DonutChart } from "../components/DonutChart";
import type { PixelIconName } from "../pixelIconXml";
import { moneyStrings } from "../stringsMoney";
import { colors, font, spacing, type } from "../theme";
import {
  classify,
  groupByDay,
  itemLookup,
  itemTitle,
  journalStats,
  type JournalFlow,
  type JournalPeriod,
} from "./journalStats";
import {
  amountColor,
  Legend,
  MoneyCard,
  moneyColors,
  Dropdown,
  OpRow,
  PillRow,
  SectionTitle,
  StatTile,
  TileRow,
  type LegendRow,
} from "./moneyParts";
import { ClosedDayReport, readDayInsights, type PetLook } from "./dayReport";

function journalLabel(
  entry: JournalEntry,
  itemName: (id: string | null) => string,
  taskTitle: (id: string) => string | undefined,
): string {
  if (entry.labelKey === "starting_grant") return strings.journalStartingGrant;
  if (entry.labelKey === "daily_reward") return strings.journalDailyReward;
  if (entry.labelKey === "allowance") return strings.journalAllowance;
  if (entry.labelKey === "parent_bonus") return strings.journalParentBonus;
  if (entry.labelKey === "savings_in") return strings.journalSavingsIn;
  if (entry.labelKey === "savings_out") return strings.journalSavingsOut;
  if (entry.labelKey === "bank_in") return strings.journalBankIn;
  if (entry.labelKey === "bank_out") return strings.journalBankOut;
  if (entry.labelKey.startsWith("purchase:")) return strings.journalPurchase(itemName(entry.itemId));
  if (entry.labelKey === "task_scene") return strings.journalTaskScene;
  if (entry.labelKey.startsWith("task_reward:")) {
    const title = taskTitle(entry.labelKey.slice("task_reward:".length));
    return title ? strings.journalTaskReward(title) : strings.journalTaskScene;
  }
  return entry.labelKey;
}

function markInk(tint: string) {
  if (tint === CHART_COLORS.optional || tint === CHART_COLORS.tasks) return colors.onRaised;
  return moneyColors.heroText;
}

type CardFace = {
  petName: string;
  goalName: string;
  goalIcon: string;
  threshold: string | null;
  accumulated: number;
  cost: number;
};

function useRecord() {
  const { game, meta, content } = useSession();
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [lastClosed, setLastClosed] = useState<DaySummaryView | null>(null);
  const [tasks, setTasks] = useState<TaskProgressView[]>([]);
  const [goalCount, setGoalCount] = useState(0);
  const [today, setToday] = useState(1);
  const [card, setCard] = useState<CardFace | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pet, setPet] = useState<PetLook | null>(null);

  useFocusEffect(
    useCallback(() => {
      const profileId = meta.get(META_KEYS.activeProfileId);
      if (!profileId) return;
      const profile = game.getProfile(profileId);
      const savings = game.savingsState(profileId);
      const active = savings.activeGoal;
      const face = goalFace(savings, profile.stage, content.goals);
      const cost = active?.cost ?? 0;
      const closed = game.lastClosedDay(profileId);
      setRows(game.listJournal(profileId));
      setToday(game.dayState(profileId).n);
      setLastClosed(closed);
      setInsights(closed ? readDayInsights(game, content, profileId, closed) : []);
      setPet(profile);
      setTasks(game.listTaskProgress(profileId));
      setGoalCount(game.boughtAsActiveGoalCount(profileId));
      setCard({
        petName: profile.petName,
        goalName: face.name,
        goalIcon: face.icon,
        threshold: face.threshold,
        accumulated: cost - (active?.remaining ?? 0),
        cost,
      });
    }, [content, game, meta]),
  );

  return { content, rows, lastClosed, tasks, goalCount, today, card, insights, pet };
}

const PERIODS: { id: JournalPeriod; label: string }[] = [
  { id: "today", label: moneyStrings.periodToday },
  { id: "yesterday", label: moneyStrings.periodYesterday },
  { id: "three", label: moneyStrings.periodThree },
  { id: "all", label: moneyStrings.periodAll },
];

const FLOWS: { id: JournalFlow; label: string }[] = [
  { id: "spend", label: moneyStrings.flowSpend },
  { id: "income", label: moneyStrings.flowIncome },
];

const CATEGORY: Record<JournalFlow, Record<string, { label: string; color: string; icon: PixelIconName }>> = {
  spend: {
    mandatory: { label: moneyStrings.catMandatory, color: CHART_COLORS.mandatory, icon: "shopping-cart" },
    optional: { label: moneyStrings.catOptional, color: CHART_COLORS.optional, icon: "smile" },
    goal: { label: moneyStrings.catGoal, color: moneyColors.goal, icon: "star" },
    savings: { label: moneyStrings.catSavings, color: CHART_COLORS.savings, icon: "arrow-down" },
    bank: { label: moneyStrings.catBank, color: CHART_COLORS.bank, icon: "lock" },
    other: { label: moneyStrings.catOther, color: CHART_COLORS.other, icon: "coins" },
  },
  income: {
    tasks: { label: moneyStrings.incTasks, color: CHART_COLORS.tasks, icon: "map" },
    start: { label: moneyStrings.incStart, color: CHART_COLORS.mandatory, icon: "party-popper" },
    bank: { label: moneyStrings.incBank, color: CHART_COLORS.bank, icon: "coins" },
    fromSavings: { label: moneyStrings.incFromSavings, color: moneyColors.goal, icon: "arrow-up" },
    parent: { label: moneyStrings.incParent, color: moneyColors.plus, icon: "coins" },
    other: { label: moneyStrings.catOther, color: CHART_COLORS.other, icon: "coins" },
  },
};

export function JournalPanel() {
  const { content, rows, today } = useRecord();
  const [period, setPeriod] = useState<JournalPeriod>("all");
  const [flow, setFlow] = useState<JournalFlow>("spend");
  const lookup = useMemo(() => itemLookup(content.catalog, content.goals), [content]);
  const stats = useMemo(() => journalStats(rows, period, today, lookup), [rows, period, today, lookup]);
  const groups = useMemo(() => groupByDay(stats.entries), [stats.entries]);
  const itemName = (id: string | null) => itemTitle(id, content.catalog, content.goals);
  const journalAmount = (entry: JournalEntry) => {
    if (entry.kind === "purchase" && entry.amount === 0 && entry.itemId) {
      return -(lookup(entry.itemId)?.price ?? 0);
    }
    return entry.amount;
  };
  const taskTitle = (id: string) => content.tasks.find((task) => task.id === id)?.title;

  const totals = flow === "spend" ? stats.spend : stats.income;
  const legend: LegendRow[] = totals.map((row) => ({
    id: row.category,
    label: CATEGORY[flow][row.category].label,
    color: CATEGORY[flow][row.category].color,
    amount: row.amount,
    percent: row.percent,
  }));
  const flowLabel = flow === "spend" ? moneyStrings.flowSpend : moneyStrings.flowIncome;
  const periodLabel = PERIODS.find((option) => option.id === period)?.label ?? "";
  const flowTotal = flow === "spend" ? stats.wentOut : stats.cameIn;

  const describe = (entry: JournalEntry) => {
    const row = classify(entry, lookup);
    if (entry.kind === "purchase") {
      const kind = lookup(entry.itemId)?.kind;
      const meta = CATEGORY.spend[kind ?? "other"];
      return {
        title: itemName(entry.itemId),
        subtitle: entry.amount === 0 ? `${meta.label} · ${moneyStrings.journalFromSavings}` : meta.label,
        icon: meta.icon,
        tint: meta.color,
      };
    }
    const meta = row ? CATEGORY[row.flow][row.category] : CATEGORY.spend.other;
    const title = journalLabel(entry, itemName, taskTitle);
    return { title, subtitle: meta.label === title ? undefined : meta.label, icon: meta.icon, tint: meta.color };
  };

  return (
    <>
      <Dropdown label={moneyStrings.periodMenu} options={PERIODS} value={period} onChange={setPeriod} />
      <TileRow>
        <StatTile
          label={moneyStrings.tileIn}
          value={stats.cameIn}
          color={stats.cameIn > 0 ? moneyColors.plus : colors.subtle}
          spoken={moneyStrings.statA11y(moneyStrings.tileIn, stats.cameIn)}
        />
        <StatTile
          label={moneyStrings.tileOut}
          value={stats.wentOut}
          color={stats.wentOut > 0 ? moneyColors.minus : colors.subtle}
          spoken={moneyStrings.statA11y(moneyStrings.tileOut, stats.wentOut)}
        />
        <StatTile
          label={moneyStrings.tileNet}
          value={stats.net}
          color={amountColor(stats.net)}
          spoken={moneyStrings.statA11y(moneyStrings.tileNet, stats.net)}
        />
      </TileRow>
      <MoneyCard>
        <PillRow grow options={FLOWS} value={flow} onChange={setFlow} />
        <View style={styles.chart}>
          <DonutChart
            size={148}
            thickness={26}
            slices={legend.map((row) => ({ id: row.id, label: row.label, value: row.amount, color: row.color }))}
            centerValue={flowTotal}
            centerCaption={flowLabel.toLowerCase()}
            centerColor={flowTotal > 0 ? (flow === "spend" ? moneyColors.minus : moneyColors.plus) : colors.subtle}
            accessibilityLabel={moneyStrings.journalChartA11y(flowLabel, periodLabel, legend)}
          />
        </View>
        {legend.length === 0 ? (
          <Text style={styles.muted}>{moneyStrings.journalChartEmpty}</Text>
        ) : (
          <Legend rows={legend} />
        )}
      </MoneyCard>
      <SectionTitle>{moneyStrings.journalOps}</SectionTitle>
      {groups.length === 0 ? <Text style={styles.muted}>{moneyStrings.journalEmpty}</Text> : null}
      {groups.map(([dayN, entries]) => {
        const dayNet = entries.reduce((sum, entry) => sum + entry.amount, 0);
        return (
          <View key={dayN} style={styles.dayGroup}>
            <View style={styles.dayHead}>
              <Text role="heading" style={styles.dayTitle}>
                {dayN === 0 ? strings.journalStart : strings.journalDay(dayN)}
              </Text>
              <Text aria-hidden style={[styles.dayNet, { color: amountColor(dayNet) }]}>
                {moneyStrings.journalDayTotal(dayNet)}
              </Text>
            </View>
            <MoneyCard tight>
              {entries.map((entry, index) => {
                const amount = journalAmount(entry);
                const view = describe(entry);
                return (
                  <OpRow
                    key={entry.id}
                    icon={view.icon}
                    tint={view.tint}
                    title={view.title}
                    subtitle={view.subtitle}
                    amount={amount}
                    label={moneyStrings.journalRowA11y(
                      journalLabel(entry, itemName, taskTitle),
                      strings.journalAmount(amount),
                    )}
                    last={index === entries.length - 1}
                  />
                );
              })}
            </MoneyCard>
          </View>
        );
      })}
      <EarnedAchievements />
    </>
  );
}

export function ResultsBody() {
  const { content, lastClosed, tasks, goalCount, card, insights, pet } = useRecord();
  const topicTasks = playableTasks(content.tasks);
  const completedTopics = tasks.filter((row) => {
    if (row.status !== "completed") return false;
    return topicTasks.some((task) => task.id === row.taskKey);
  }).length;

  if (!lastClosed || !card) {
    return (
      <>
        <MoneyCard>
          <Text style={styles.body}>{strings.resultsEmpty}</Text>
        </MoneyCard>
        <EarnedAchievements collapseAfter={ACHIEVEMENTS_SHOWN} />
      </>
    );
  }

  return (
    <>
      <StageCardPlate
        stage={lastClosed.stage}
        petName={card.petName}
        goalName={card.goalName}
        goalIcon={card.goalIcon}
        threshold={card.threshold}
        accumulated={card.accumulated}
        cost={card.cost}
      />
      <ClosedDayReport summary={lastClosed} mode="record" insights={insights} pet={pet} />
      <SectionTitle>{strings.resultsOverall}</SectionTitle>
      <MoneyCard tight>
        <CountRow icon="clock" tint={CHART_COLORS.bank} text={strings.resultsDaysPlayed(lastClosed.n)} />
        <CountRow
          icon="map"
          tint={CHART_COLORS.tasks}
          text={strings.resultsTasksDone(completedTopics, topicTasks.length)}
        />
        <CountRow icon="star" tint={moneyColors.goal} text={strings.resultsGoalsAchieved(goalCount)} last />
      </MoneyCard>
      <EarnedAchievements collapseAfter={ACHIEVEMENTS_SHOWN} />
    </>
  );
}

/** Итоги lists this many Достижения before «Показать все». */
const ACHIEVEMENTS_SHOWN = 3;

function CountRow({
  icon,
  tint,
  text,
  last,
}: {
  icon: PixelIconName;
  text: string;
  tint: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.count, last ? null : styles.countDivider]}>
      <View style={[styles.mark, { backgroundColor: tint }]}>
        <PixelIcon name={icon} size={18} color={markInk(tint)} />
      </View>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  count: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: 44,
    paddingVertical: 4,
  },
  countDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  body: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
  },
  chart: {
    alignItems: "center",
    paddingVertical: spacing.s,
  },
  muted: {
    color: colors.subtle,
    fontSize: type.body,
  },
  dayGroup: {
    gap: spacing.s,
  },
  dayHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  dayTitle: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  dayNet: {
    fontFamily: font.pixel,
    fontSize: 12,
  },
});
