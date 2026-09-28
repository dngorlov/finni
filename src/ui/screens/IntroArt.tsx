import { StyleSheet, Text, View } from "react-native";
import type { IntroCardContent } from "../../data/content";
import { PetView } from "../pet/PetView";
import { colors, font, radius, spacing } from "../theme";

const hidden = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no-hide-descendants" as const,
};

function Tile({ icon, label, tint }: { icon: string; label: string; tint: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: tint }]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/**
 * Picture above each Первый запуск card, so a child who reads slowly still
 * gets the idea from the image. Decorative: the card text says it all.
 */
export function IntroArt({ id }: { id: IntroCardContent["id"] }) {
  return (
    <View {...hidden} style={styles.stage}>
      {id === "welcome" ? <PetView species="sp1" color="c2" accessory="a1" pose="happy" size={176} accessibilityHidden /> : null}
      {id === "task" ? (
        <View style={styles.row}>
          <Text style={styles.big}>🐷</Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.big}>🛹</Text>
        </View>
      ) : null}
      {id === "decisions" ? (
        <View style={styles.row}>
          <Tile icon="🍱" label="Нужно" tint={colors.badgeFill} />
          <Tile icon="🍬" label="Хочется" tint="#E9F0C4" />
          <Tile icon="🐷" label="Отложить" tint={colors.highlight} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 200,
    padding: spacing.m,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    justifyContent: "center",
  },
  big: {
    fontSize: 72,
  },
  arrow: {
    color: colors.accentText,
    fontFamily: font.pixel,
    fontSize: 24,
  },
  tile: {
    alignItems: "center",
    borderRadius: 16,
    gap: 4,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  tileIcon: {
    fontSize: 40,
  },
  tileLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
