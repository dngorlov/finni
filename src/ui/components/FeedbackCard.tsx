import { StyleSheet, Text, View } from "react-native";
import { Pictogram } from "./Pictogram";
import { CoinText } from "./CoinText";
import { PrimaryButton } from "./PrimaryButton";
import { strings } from "../strings";
import { colors, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";

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

function DeltaRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.row}>
      <Pictogram glyph={icon} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

export function FeedbackCard({ model, onDismiss }: { model: FeedbackModel; onDismiss: () => void }) {
  const { deltas } = model;

  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {model.chip ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{model.chip}</Text>
            </View>
          ) : null}
          {deltas.balance ? (
            // The coin follows the number («Баланс +5 🪙») instead of leading the row.
            <CoinText coin text={strings.feedbackBalance(deltas.balance)} style={styles.body} />
          ) : null}
          {deltas.savings ? (
            <DeltaRow icon={strings.savingsIcon} label={strings.feedbackSavings(deltas.savings)} />
          ) : null}
          {deltas.care ? (
            <DeltaRow icon={strings.careIcon} label={strings.feedbackCare(deltas.care)} />
          ) : null}
          {deltas.mood ? (
            <DeltaRow icon={strings.moodIcon} label={strings.feedbackMood(deltas.mood)} />
          ) : null}
          {model.cause ? (
            <CoinText coin={/[+\-−]\d/.test(model.cause)} text={model.cause} style={styles.body} />
          ) : null}
          {model.nextStep ? <CoinText text={model.nextStep} style={styles.body} /> : null}
          <PrimaryButton
            label={strings.gotIt}
            onPress={onDismiss}
          />
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
    backgroundColor: colors.card,
    borderRadius: radius.card,
    gap: spacing.s,
    maxWidth: 360,
    padding: spacing.l,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: colors.badgeFill,
    borderRadius: 12,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  chipLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
});
