import { StyleSheet, Text, View } from "react-native";
import { CHART_COLORS, DonutChart } from "../components/DonutChart";
import type { AdultOverview, AdultTopicStat } from "../session/adultOverview";
import { strings } from "../strings";
import { colors, font, spacing, type } from "../theme";
import { MoneyCard, moneyColors, SectionTitle, SplitBar } from "./moneyParts";

const TOPIC_COLOR: Record<AdultTopicStat["id"], string> = {
  budget: CHART_COLORS.mandatory,
  savings: CHART_COLORS.savings,
  payments: CHART_COLORS.bank,
};

/** Half or better is the same green as money in; below that, the same red as money out. */
function percentColor(percent: number): string {
  return percent >= 50 ? moneyColors.plus : moneyColors.minus;
}

/** Темы as a ring, the answer rate as a two-color bar, and the calm summary lines. */
export function AdultProgress({ overview }: { overview: AdultOverview }) {
  const done = overview.topics.reduce((sum, topic) => sum + topic.done, 0);
  const wrong = Math.max(0, overview.scored - overview.correct);
  return (
    <>
      <SectionTitle>{strings.adultTopics}</SectionTitle>
      <MoneyCard>
        <View style={styles.chart}>
          <DonutChart
            size={148}
            thickness={26}
            slices={overview.topics.map((topic) => ({
              id: topic.id,
              label: topic.title,
              value: topic.done,
              color: TOPIC_COLOR[topic.id],
            }))}
            centerValue={done}
            centerCaption={strings.adultChartCaption}
            centerColor={done > 0 ? colors.text : colors.subtle}
            accessibilityLabel={strings.adultTopicsChart(done, overview.topics)}
          />
        </View>
        {overview.topics.map((topic) => (
          <View key={topic.id} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: TOPIC_COLOR[topic.id] }]} />
            <Text style={styles.body}>{topic.line}</Text>
          </View>
        ))}
      </MoneyCard>
      <SectionTitle>{strings.adultAnswers}</SectionTitle>
      <MoneyCard>
        {overview.percent == null ? (
          <Text style={styles.body}>{overview.answersLine}</Text>
        ) : (
          <View accessible aria-label={overview.answersLine} style={styles.rate}>
            <Text style={[styles.percent, { color: percentColor(overview.percent) }]}>{overview.percent}%</Text>
            <SplitBar
              leading={overview.correct}
              trailing={wrong}
              leadingColor={moneyColors.plus}
              trailingColor={moneyColors.minus}
            />
            <View style={styles.rateCounts}>
              <Text style={[styles.count, { color: moneyColors.plus }]}>{strings.adultCorrectCount(overview.correct)}</Text>
              <Text style={[styles.count, { color: moneyColors.minus }]}>{strings.adultWrongCount(wrong)}</Text>
            </View>
          </View>
        )}
      </MoneyCard>
      <SectionTitle>{strings.resultsOverall}</SectionTitle>
      <MoneyCard>
        <Text style={styles.body}>{overview.daysLine}</Text>
        <Text style={styles.body}>{overview.tasksLine}</Text>
        <Text style={styles.body}>{overview.lessonsLine}</Text>
        {overview.lastLessonLine ? <Text style={styles.body}>{overview.lastLessonLine}</Text> : null}
      </MoneyCard>
    </>
  );
}

const styles = StyleSheet.create({
  chart: {
    alignItems: "center",
    paddingVertical: spacing.s,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: 32,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  body: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
  },
  rate: {
    gap: spacing.s,
  },
  percent: {
    fontFamily: font.pixel,
    fontSize: 22,
    lineHeight: 33,
  },
  rateCounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: {
    fontSize: type.body,
    fontWeight: "700",
  },
});
