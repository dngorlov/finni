import { StyleSheet, Text, View } from "react-native";
import { itemMeterEffects, type MeterKind } from "../../core/economy";
import type { CatalogItemContent } from "../../data/content";
import { AppModal } from "../components/AppModal";
import { PrimaryButton } from "../components/PrimaryButton";
import { PixelSprite, type SpriteName } from "../components/PixelSprite";
import { strings } from "../strings";
import { shopStrings } from "../stringsShop";
import { colors, font, radius, spacing, type } from "../theme";
import { MoneyCard, OpRow, moneyColors } from "./moneyParts";
import { ItemTile, dailyDropPhrase } from "./shopParts";

export type PurchaseResultModel = {
  item: CatalogItemContent;
  paidFrom: "balance" | "savings";
};

const METER_SPRITE: Record<MeterKind, SpriteName> = {
  care: "food",
  mood: "mood",
};

function meterLabel(meter: MeterKind) {
  return meter === "care" ? strings.care : strings.mood;
}

function meterSpoken(meter: MeterKind, delta: number) {
  return meter === "care" ? strings.feedbackCare(delta) : strings.feedbackMood(delta);
}

/**
 * What the purchase did to the pet, in the Деньги look: gold summary, then a
 * receipt row for the coins that left.
 */
export function PurchaseResult({ model, onDismiss }: { model: PurchaseResultModel; onDismiss: () => void }) {
  const { item, paidFrom } = model;
  const fromBalance = paidFrom === "balance";
  const paidLabel = fromBalance ? strings.feedbackBalance(-item.price) : strings.feedbackSavings(-item.price);
  const shieldPhrase = dailyDropPhrase(item);

  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.hero}>
            <View style={styles.bought}>
              <ItemTile item={item} size={64} />
              <View style={styles.boughtText}>
                <Text style={styles.heroCaption}>{shopStrings.resultBought}</Text>
                <Text style={styles.heroName}>{item.name}</Text>
              </View>
            </View>
            <Text style={styles.heroCaption}>{shopStrings.resultPet}</Text>
            <View style={styles.stats}>
              {itemMeterEffects(item).map((effect) => (
                <View key={effect.meter} accessible aria-label={meterSpoken(effect.meter, effect.delta)} style={styles.stat}>
                  <View style={styles.statIcon}>
                    <PixelSprite name={METER_SPRITE[effect.meter]} size={22} />
                  </View>
                  <Text aria-hidden style={styles.statLabel}>
                    {meterLabel(effect.meter)}
                  </Text>
                  <Text aria-hidden style={styles.statValue}>
                    {`+${effect.delta}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <MoneyCard tight>
            <OpRow
              icon="coins"
              tint={moneyColors.minus}
              title={fromBalance ? strings.balanceWord : strings.savingsWord}
              amount={-item.price}
              label={paidLabel}
              last
            />
          </MoneyCard>
          <MoneyCard>
            <Text style={styles.body}>{item.description}</Text>
            {shieldPhrase ? <Text style={styles.body}>{shopStrings.resultShield(shieldPhrase)}</Text> : null}
          </MoneyCard>
          <PrimaryButton label={strings.gotIt} onPress={onDismiss} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
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
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    gap: spacing.m,
    padding: spacing.m,
  },
  bought: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.m,
  },
  boughtText: {
    flex: 1,
    gap: 4,
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
  },
  stats: {
    flexDirection: "row",
    gap: spacing.m,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  statLabel: {
    color: moneyColors.heroSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  statValue: {
    color: moneyColors.heroText,
    fontFamily: font.pixel,
    fontSize: 20,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 30,
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
});
