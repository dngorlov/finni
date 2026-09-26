import { StyleSheet, Text, View } from "react-native";
import type { PlanBuckets } from "../../core/economy";
import { CoinText } from "../components/CoinText";
import { CHART_COLORS } from "../components/DonutChart";
import { PixelIcon } from "../components/Pictogram";
import type { PixelIconName } from "../pixelIconXml";
import { strings } from "../strings";
import { colors, spacing, type } from "../theme";
import { Amount, MoneyCard, moneyColors, ProgressBar } from "./moneyParts";

type BucketKey = "mandatory" | "optional" | "savings";

export const PLAN_BUCKETS: readonly { key: BucketKey; label: string; color: string; icon: PixelIconName }[] = [
  { key: "mandatory", label: strings.bucketMandatory, color: CHART_COLORS.mandatory, icon: "clipboard" },
  { key: "optional", label: strings.bucketOptional, color: CHART_COLORS.optional, icon: "smile" },
  { key: "savings", label: strings.bucketSavings, color: CHART_COLORS.savings, icon: "arrow-down" },
];

/** Ink for an icon on a bucket-colored mark. */
export function bucketInk(color: string): string {
  if (color === CHART_COLORS.optional || color === CHART_COLORS.tasks) return colors.onRaised;
  return moneyColors.heroText;
}

/** Обязательные, Желаемые, and Копилка as one card: one tight row per bucket, fact on the bar. */
export function PlanFactCard({ plan, actual }: { plan: PlanBuckets; actual: PlanBuckets }) {
  return (
    <MoneyCard tight>
      {PLAN_BUCKETS.map((bucket, index) => (
        <View
          key={bucket.key}
          style={[styles.compare, index === PLAN_BUCKETS.length - 1 ? null : styles.compareDivider]}
        >
          <View style={styles.compareTop}>
            <View style={[styles.mark, { backgroundColor: bucket.color }]}>
              <PixelIcon name={bucket.icon} size={16} color={bucketInk(bucket.color)} />
            </View>
            <View style={styles.compareText}>
              <Text style={styles.compareLabel}>{bucket.label}</Text>
              <CoinText coin text={strings.planVsActual(plan[bucket.key], actual[bucket.key])} style={styles.planLine} />
            </View>
            <Amount value={actual[bucket.key]} size={14} />
          </View>
          <ProgressBar
            value={actual[bucket.key]}
            max={Math.max(plan[bucket.key], actual[bucket.key])}
            color={bucket.color}
          />
        </View>
      ))}
    </MoneyCard>
  );
}

const styles = StyleSheet.create({
  compare: {
    gap: 6,
    paddingVertical: spacing.s,
  },
  compareDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  compareTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  compareText: {
    flex: 1,
  },
  compareLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  planLine: {
    color: colors.subtle,
    fontSize: type.body,
  },
  mark: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
