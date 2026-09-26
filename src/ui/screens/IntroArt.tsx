import { StyleSheet, Text, View } from "react-native";
import type { IntroCardContent } from "../../data/content";
import { PixelSprite } from "../components/PixelSprite";
import { SPECIES_KEYS } from "../pet/keys";
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
      {id === "goal" ? (
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
          <Tile icon="🐷" label="Копилка" tint={colors.highlight} />
        </View>
      ) : null}
      {id === "appearance" ? (
        <View style={styles.row}>
          {SPECIES_KEYS.map((species, index) => (
            <PetView
              key={species}
              species={species}
              color={(["c2", "c3", "c1"] as const)[index]!}
              accessory="a1"
              pose="idle"
              size={96}
              accessibilityHidden
            />
          ))}
        </View>
      ) : null}
      {id === "name" ? (
        <View style={styles.row}>
          <PetView species="sp2" color="c3" accessory="a1" pose="idle" size={128} accessibilityHidden />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Привет! А тебя как зовут?</Text>
          </View>
        </View>
      ) : null}
      {id === "budget" ? (
        <View style={styles.row}>
          <PixelSprite name="coin" size={72} />
          <Text style={styles.coins}>100</Text>
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
  bubble: {
    backgroundColor: colors.card,
    borderRadius: 16,
    maxWidth: 150,
    padding: spacing.s,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  coins: {
    color: colors.text,
    fontFamily: font.pixel,
    fontSize: 40,
  },
});
