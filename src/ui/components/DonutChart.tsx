import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, font } from "../theme";

export type DonutSlice = { id: string; label: string; value: number; color: string };

/**
 * Ring chart (the «pie» of Журнал and Копилка). Slices are drawn in order,
 * clockwise from 12 o'clock; zero slices are skipped. The number in the
 * middle is `centerValue` (defaults to the total). Always pair it with a
 * legend that repeats the numbers — the ring alone is decoration for a reader.
 */
export function DonutChart({
  slices,
  size = 160,
  thickness = 28,
  centerValue,
  centerCaption,
  centerColor,
  accessibilityLabel,
}: {
  slices: readonly DonutSlice[];
  size?: number;
  thickness?: number;
  centerValue?: number | string;
  centerCaption?: string;
  centerColor?: string;
  accessibilityLabel: string;
}) {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <View accessible role="img" aria-label={accessibilityLabel} style={{ height: size, width: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={thickness} fill="none" />
        {total > 0
          ? slices.map((slice) => {
              if (slice.value <= 0) return null;
              const length = (slice.value / total) * c;
              const dash = Math.max(0, length - gap);
              const node = (
                <Circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={slice.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              offset += length;
              return node;
            })
          : null}
      </Svg>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Text aria-hidden style={[styles.value, centerColor ? { color: centerColor } : null]}>
          {centerValue ?? total}
        </Text>
        {centerCaption ? (
          <Text aria-hidden style={styles.caption}>
            {centerCaption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Chart colors on the Andrei palette; each keeps ≥3:1 against the card. */
export const CHART_COLORS = {
  /** Same big fill as the money hero cards: one token in theme.ts. */
  mandatory: colors.heroFill,
  optional: "#F7A115",
  savings: "#6B7A00",
  bank: "#6B7A00",
  tasks: "#F7A115",
  other: "#9C8A76",
} as const;

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.text,
    fontFamily: font.pixel,
    fontSize: 18,
  },
  caption: {
    color: colors.subtle,
    fontSize: 13,
    marginTop: 4,
  },
});
