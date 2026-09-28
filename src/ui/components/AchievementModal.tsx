import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { achievementStrings, type AchievementCopy } from "../stringsAchievements";
import { colors, radius, spacing, type } from "../theme";
import { MoneyCard, moneyColors } from "../screens/moneyParts";
import { AppModal } from "./AppModal";

/**
 * Reward for a new Достижение. Gold hero like a Деньги account card, emoji
 * tile like a Магазин picture, then the line of what was earned.
 */
export function AchievementModal({
  copy,
  more,
  onDismiss,
}: {
  copy: AchievementCopy;
  more: boolean;
  onDismiss: () => void;
}) {
  const spoken = achievementStrings.rowA11y(copy.title, copy.detail);
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View accessible aria-label={`${achievementStrings.modalCaption}. ${spoken}`} style={styles.hero}>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.tile}
            >
              <Text style={styles.emoji}>{copy.emoji}</Text>
            </View>
            <Text style={styles.heroCaption}>{achievementStrings.modalCaption}</Text>
            <Text style={styles.heroName}>{copy.title}</Text>
          </View>
          <MoneyCard>
            <Text style={styles.body}>{copy.detail}</Text>
            {more ? <Text style={styles.body}>{achievementStrings.more}</Text> : null}
          </MoneyCard>
          <PrimaryButton label={achievementStrings.celebrate} onPress={onDismiss} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(34, 26, 18, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.l,
  },
  sheet: {
    alignSelf: "stretch",
    backgroundColor: colors.background,
    borderRadius: radius.card + 4,
    gap: spacing.m,
    maxWidth: 400,
    padding: spacing.m,
  },
  hero: {
    alignItems: "center",
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  tile: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: 20,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  emoji: {
    fontSize: 40,
    lineHeight: 52,
  },
  heroCaption: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  heroName: {
    color: moneyColors.heroText,
    fontSize: type.section,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
});
