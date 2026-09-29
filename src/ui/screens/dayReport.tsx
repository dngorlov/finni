import { StyleSheet, Text, View } from "react-native";
import { FEATURES } from "../../core/config";
import { dayInsights, type Insight } from "../../core/dayInsights";
import type { GameContent } from "../../data/content";
import type { DaySummaryView } from "../../data/repositories/gameRepository";
import { CoinText } from "../components/CoinText";
import { PixelIcon } from "../components/Pictogram";
import { PixelSprite, type SpriteName } from "../components/PixelSprite";
import { PetView } from "../pet/PetView";
import type { SessionGame } from "../session/types";
import { dayCloseLines, strings } from "../strings";
import { dayStrings, insightText } from "../stringsDay";
import { moneyStrings } from "../stringsMoney";
import { colors, font, radius, spacing, type } from "../theme";
import { dayInsightInput } from "./dayInsightInput";
import { Amount, amountColor, MoneyCard, moneyColors, SectionTitle } from "./moneyParts";
import { PlanFactCard } from "./planFact";

/**
 * One closed Игровой день, the same on Итоги дня and Итоги: a day strip,
 * «Разбор дня», plan versus fact, and what happened to the pet.
 */

export type PetLook = {
  species: string;
  color: string;
  accessory: string;
  petName: string;
};

/** «Разбор дня» for a closed day, read from the session. */
export function readDayInsights(
  game: SessionGame,
  content: Pick<GameContent, "catalog" | "bills">,
  profileId: string,
  summary: DaySummaryView,
): Insight[] {
  const profile = game.getProfile(profileId);
  const savingsLessonDone = game
    .listTaskProgress(profileId)
    .some((row) => row.taskKey === FEATURES.savingsTaskId && row.status === "completed");
  return dayInsights(
    dayInsightInput({
      summary,
      journal: game.listJournal(profileId),
      catalog: content.catalog,
      bills: content.bills,
      isDemo: profile.isDemo,
      savingsLessonDone,
      goal: game.savingsState(profileId).activeGoal,
    }),
  );
}

/** Day strip: which day, what went out, what the План promised. */
export function DayStrip({
  summary,
  mode,
}: {
  summary: DaySummaryView;
  /** `advance` shows «День N → День N+1» on Итоги дня; `record` names the day on Итоги. */
  mode: "advance" | "record";
}) {
  const spent = summary.actual.mandatory + summary.actual.optional + summary.actual.savings;
  const planned = summary.plan.mandatory + summary.plan.optional + summary.plan.savings;
  return (
    <View style={styles.strip}>
      {mode === "advance" ? (
        <View accessible aria-label={strings.dayAdvance(summary.n, summary.n + 1)} style={styles.advance}>
          <Text aria-hidden style={styles.dayLabel}>
            {strings.journalDay(summary.n)}
          </Text>
          <PixelIcon name="arrow-right" size={16} color={moneyColors.heroSubtle} />
          <View aria-hidden style={styles.dayNext}>
            <Text style={[styles.dayLabel, styles.dayNextLabel]}>{strings.journalDay(summary.n + 1)}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.dayLabel}>{strings.resultsLastDay(summary.n)}</Text>
      )}
      <View style={styles.stats}>
        <View accessible aria-label={moneyStrings.statA11y(strings.daySummarySpent, spent)} style={styles.stat}>
          <Text aria-hidden style={styles.statLabel}>
            {strings.daySummarySpent}
          </Text>
          <Amount value={spent} size={14} color={moneyColors.heroText} />
        </View>
        <View accessible aria-label={moneyStrings.statA11y(strings.daySummaryPlanned, planned)} style={styles.stat}>
          <Text aria-hidden style={styles.statLabel}>
            {strings.daySummaryPlanned}
          </Text>
          <Amount value={planned} size={14} color={moneyColors.heroText} />
        </View>
      </View>
    </View>
  );
}

/** The pet explains the day: praise first, then one clear tip. */
export function InsightsCard({ insights, pet }: { insights: readonly Insight[]; pet: PetLook | null }) {
  if (insights.length === 0) return null;
  const hasTip = insights.some((row) => row.kind === "tip");
  return (
    <View style={styles.insights}>
      <View style={styles.insightsHead}>
        {pet ? (
          <View style={styles.petFrame}>
            <PetView
              species={pet.species}
              color={pet.color}
              accessory={pet.accessory}
              pose={hasTip ? "idle" : "happy"}
              size={56}
              accessibilityHidden
            />
          </View>
        ) : null}
        <Text role="heading" style={styles.insightsTitle}>
          {dayStrings.insightsTitle}
        </Text>
      </View>
      {insights.map((insight) => {
        const text = insightText(insight);
        const good = insight.kind === "good";
        return (
          <View
            key={insight.id}
            accessible
            aria-label={dayStrings.insightA11y(insight.kind, text)}
            style={[styles.insight, good ? styles.insightGood : styles.insightTip]}
          >
            <View style={[styles.insightMark, { backgroundColor: good ? colors.fill : colors.accent }]}>
              <PixelIcon name={good ? "check" : "info-box"} size={18} color={colors.text} />
            </View>
            <CoinText coin labelled={false} text={text} style={styles.insightText} />
          </View>
        );
      })}
    </View>
  );
}

type PetLine = { key: string; text: string; sprite: SpriteName; tint: string };

function petLines(deltas: DaySummaryView["meterDeltas"]): PetLine[] {
  return dayCloseLines(deltas).map((text, index) => ({
    key: `extra${index}`,
    text,
    sprite: "mood-down",
    tint: colors.highlight,
  }));
}

/** Сытость and Счастье for the closed day, and every reason under them, in one card. */
export function PetDayCard({ deltas }: { deltas: DaySummaryView["meterDeltas"] }) {
  const meters = [
    { key: "care", sprite: "food" as const, label: strings.care, delta: deltas.care, spoken: strings.feedbackCare(deltas.care) },
    { key: "mood", sprite: deltas.mood < 0 ? ("mood-down" as const) : ("mood" as const), label: strings.mood, delta: deltas.mood, spoken: strings.feedbackMood(deltas.mood) },
  ];
  return (
    <MoneyCard tight>
      <View style={styles.meterRow}>
        {meters.map((meter) => (
          <View key={meter.key} accessible aria-label={meter.spoken} style={styles.meter}>
            <PixelSprite name={meter.sprite} size={22} />
            <Text aria-hidden style={[styles.meterLabel, { flex: 1 }]} numberOfLines={1}>
              {meter.label}
            </Text>
            <Text aria-hidden style={[styles.meterValue, { color: amountColor(meter.delta) }]}>
              {meter.delta > 0 ? `+${meter.delta}` : String(meter.delta)}
            </Text>
          </View>
        ))}
      </View>
      {petLines(deltas).map((line) => (
        <View key={line.key} style={styles.petLine}>
          <View style={[styles.petMark, { backgroundColor: line.tint }]}>
            <PixelSprite name={line.sprite} size={16} />
          </View>
          <Text style={styles.body}>{line.text}</Text>
        </View>
      ))}
    </MoneyCard>
  );
}

/** Everything a closed day shows, in one order for Итоги дня and Итоги. */
export function ClosedDayReport({
  summary,
  mode,
  insights,
  pet,
}: {
  summary: DaySummaryView;
  mode: "advance" | "record";
  insights: readonly Insight[];
  pet: PetLook | null;
}) {
  return (
    <>
      <DayStrip summary={summary} mode={mode} />
      <InsightsCard insights={insights} pet={pet} />
      <SectionTitle>{strings.daySummaryPlan}</SectionTitle>
      <PlanFactCard plan={summary.plan} actual={summary.actual} />
      <SectionTitle>{dayStrings.petTitle}</SectionTitle>
      <PetDayCard deltas={summary.meterDeltas} />
    </>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: "center",
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    justifyContent: "space-between",
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
  },
  advance: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  dayNext: {
    backgroundColor: colors.highlight,
    borderRadius: 10,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  dayLabel: {
    color: moneyColors.heroText,
    fontFamily: font.pixel,
    fontSize: 12,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 20,
  },
  dayNextLabel: {
    color: colors.text,
  },
  stats: {
    flexDirection: "row",
    gap: spacing.m,
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    color: moneyColors.heroSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  insights: {
    backgroundColor: colors.card,
    borderColor: colors.badgeFill,
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.s,
    padding: 12,
  },
  insightsHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  petFrame: {
    backgroundColor: colors.highlight,
    borderRadius: 16,
    overflow: "hidden",
  },
  insightsTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: font.pixel,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },
  insight: {
    alignItems: "flex-start",
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.s,
    padding: spacing.s,
  },
  insightGood: {
    backgroundColor: colors.background,
  },
  insightTip: {
    backgroundColor: colors.highlight,
  },
  insightMark: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  insightText: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    lineHeight: 22,
  },
  // One under the other: side by side the labels were cut to «Сыт…» and «Сча…».
  meterRow: {
    gap: spacing.s,
  },
  meter: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 48,
    paddingHorizontal: spacing.s,
  },
  meterLabel: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  meterValue: {
    fontFamily: font.pixel,
    fontSize: 14,
    lineHeight: 22,
  },
  petLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  petMark: {
    alignItems: "center",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  body: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
  },
});
