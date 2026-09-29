import { StyleSheet, Text, View } from "react-native";
import { MoneyCard, moneyColors } from "../screens/moneyParts";
import { moneyStrings } from "../stringsMoney";
import { strings } from "../strings";
import { colors, font, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";
import { CoinText } from "./CoinText";
import { PixelIcon } from "./Pictogram";
import { PixelSprite, type SpriteName } from "./PixelSprite";
import { PrimaryButton } from "./PrimaryButton";

export type FeedbackDeltas = {
  balance?: number;
  savings?: number;
  care?: number;
  mood?: number;
};

export type FeedbackModel = {
  deltas: FeedbackDeltas;
  cause?: string;
  nextStep?: string;
  chip?: string;
};

type DeltaKind = "balance" | "savings" | "care" | "mood";

type DeltaRow = {
  kind: DeltaKind;
  amount: number;
  title: string;
  label: string;
};

function rowsOf(deltas: FeedbackDeltas): DeltaRow[] {
  const rows: DeltaRow[] = [];
  if (deltas.balance) {
    rows.push({
      kind: "balance",
      amount: deltas.balance,
      title: strings.balanceWord,
      label: strings.feedbackBalance(deltas.balance),
    });
  }
  if (deltas.savings) {
    rows.push({
      kind: "savings",
      amount: deltas.savings,
      title: strings.savingsWord,
      label: strings.feedbackSavings(deltas.savings),
    });
  }
  if (deltas.care) {
    rows.push({
      kind: "care",
      amount: deltas.care,
      title: strings.care,
      label: strings.feedbackCare(deltas.care),
    });
  }
  if (deltas.mood) {
    rows.push({
      kind: "mood",
      amount: deltas.mood,
      title: strings.mood,
      label: strings.feedbackMood(deltas.mood),
    });
  }
  return rows;
}

function DeltaMark({ kind, amount }: { kind: DeltaKind; amount: number }) {
  if (kind === "savings") {
    return <PixelIcon name={amount > 0 ? "arrow-down" : "arrow-up"} size={24} color={colors.text} />;
  }
  const sprite: SpriteName =
    kind === "balance" ? "coin" : kind === "care" ? "food" : amount < 0 ? "mood-down" : "mood";
  return <PixelSprite name={sprite} size={24} />;
}

/**
 * What just changed: Баланс, Копилка, Сытость, Счастье. Same card as a purchase
 * receipt — gold summary, then the reason on a white card.
 */
export function FeedbackCard({ model, onDismiss }: { model: FeedbackModel; onDismiss: () => void }) {
  const rows = rowsOf(model.deltas);
  const solo = rows.length < 2;

  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.hero}>
            <Text style={styles.heroCaption}>{model.chip ?? strings.feedbackTitle}</Text>
            <View style={[styles.stats, solo ? styles.statsSolo : null]}>
              {rows.map((row) => (
                <View
                  key={row.kind}
                  accessible
                  accessibilityLabel={row.label}
                  style={[styles.stat, solo ? styles.statSolo : null]}
                >
                  <View
                    aria-hidden
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={styles.statIcon}
                  >
                    <DeltaMark kind={row.kind} amount={row.amount} />
                  </View>
                  <Text aria-hidden style={styles.statLabel}>
                    {row.title}
                  </Text>
                  <Text aria-hidden style={styles.statValue}>
                    {moneyStrings.signed(row.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {model.cause || model.nextStep ? (
            <MoneyCard>
              {model.cause ? (
                <CoinText coin={/[+\-−]\d/.test(model.cause)} text={model.cause} style={styles.body} />
              ) : null}
              {model.nextStep ? <CoinText text={model.nextStep} style={styles.body} /> : null}
            </MoneyCard>
          ) : null}
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
  heroCaption: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    gap: spacing.m,
  },
  statsSolo: {
    justifyContent: "center",
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statSolo: {
    alignItems: "center",
    flex: 0,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
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
