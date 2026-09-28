import type { Ref } from "react";
import { StyleSheet, Text, View } from "react-native";
import { strings } from "../strings";
import { Pictogram } from "./Pictogram";
import { PixelSprite, type SpriteName } from "./PixelSprite";
import { colors, radius, spacing, type } from "../theme";

export function MeterBar({
  icon,
  label,
  value,
  compact,
  sprite,
  marked,
  measureRef,
  onMeasure,
}: {
  icon: string;
  /** Andrei's pixel sprite shown instead of the emoji glyph. */
  sprite?: SpriteName;
  label: string;
  value: number;
  compact?: boolean;
  /** Acquaintance tour is pointing at this meter. The ring is drawn by the coach, not on the bar. */
  marked?: boolean;
  measureRef?: Ref<View>;
  onMeasure?: () => void;
}) {
  const width = `${Math.max(0, Math.min(100, value))}%` as const;
  const name = strings.meterLine(label, value);
  const mark = sprite ? <PixelSprite name={sprite} size={24} /> : <Pictogram glyph={icon} />;
  if (compact) {
    return (
      <View
        ref={measureRef}
        accessible
        aria-label={name}
        aria-selected={marked ? true : undefined}
        collapsable={false}
        onLayout={onMeasure}
        style={styles.compact}
      >
        {mark}
        <View style={styles.compactTrack} accessibilityElementsHidden>
          <View style={[styles.compactFill, { width }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
        {mark}
        <Text style={styles.label}>{name}</Text>
      </View>
      <View style={styles.track} accessibilityElementsHidden>
        <View style={[styles.fill, { width }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  line: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  label: {
    color: colors.text,
    fontSize: type.body,
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.card,
    height: spacing.l,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.fill,
    borderRadius: radius.card,
    height: spacing.l,
  },
  compact: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.s,
    minWidth: 0,
  },
  compactTrack: {
    backgroundColor: colors.track,
    borderRadius: radius.card,
    flex: 1,
    height: spacing.m,
    overflow: "hidden",
  },
  compactFill: {
    backgroundColor: colors.fill,
    height: spacing.m,
  },
});
