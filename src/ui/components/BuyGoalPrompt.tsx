import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CUSTOM_GOAL_MOOD, readCustomGoalItem } from "../../core/customGoal";
import { meterDeltaMap } from "../../core/economy";
import { META_KEYS } from "../../data/metaKeys";
import { usePlayChrome } from "../navigation/playChrome";
import { MoneyCard, moneyColors } from "../screens/moneyParts";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { resolveCurrentTask } from "../tasks/resolveCurrentTask";
import { colors, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";
import { CoinText } from "./CoinText";
import { FeedbackCard, type FeedbackModel } from "./FeedbackCard";
import { PrimaryButton } from "./PrimaryButton";
import { TextButton } from "./TextButton";

/** Shown while Копилка covers the active Цель. Позже hides it until the bar is tapped again. */
export function BuyGoalPrompt() {
  const { game, meta, content } = useSession();
  const { revision, focus, setFocus, touchChrome } = usePlayChrome();
  const [hiddenKey, setHiddenKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModel | null>(null);
  const [gameTick, setGameTick] = useState(0);
  void revision;
  void gameTick;
  useEffect(() => game.subscribe(() => setGameTick((n) => n + 1)), [game]);

  const profileId = meta.get(META_KEYS.activeProfileId);
  const task = profileId ? resolveCurrentTask(game, content, profileId) : null;
  const goalId = task?.kind === "buy-goal" ? task.goalId : null;
  const preset = goalId ? content.goals.find((item) => item.id === goalId) : undefined;
  const active = profileId ? game.savingsState(profileId).activeGoal : null;
  const custom = !preset && active && active.key === goalId ? readCustomGoalItem(active.key) : null;
  const goal = preset
    ? {
        id: preset.id,
        name: preset.name,
        icon: preset.icon,
        description: preset.description,
        price: preset.price,
        effect: preset.effect,
        stage: preset.stage,
      }
    : custom
      ? {
          id: active!.key,
          name: active!.name || custom.name,
          icon: active!.icon || strings.savingsConfetti,
          description: "",
          price: active!.cost,
          effect: { meter: "mood" as const, delta: CUSTOM_GOAL_MOOD },
          stage: undefined,
        }
      : undefined;

  // A new «купить цель» focus shows the prompt again (state adjusted during render, not in an effect).
  const [seenFocus, setSeenFocus] = useState<typeof focus>(null);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.kind === "buy-goal") setHiddenKey(null);
  }

  const dismiss = () => {
    if (goal) setHiddenKey(goal.id);
    setFocus(null);
  };

  const buy = () => {
    if (!profileId || !goal) return;
    const day = game.dayState(profileId);
    const item = {
      id: goal.id,
      kind: "optional" as const,
      price: goal.price,
      effect: goal.effect,
      once: true as const,
      stage: goal.stage,
    };
    const result = game.purchaseFromSavings(profileId, day.dayId, item);
    if (result.status === "blocked") return;
    touchChrome();
    setHiddenKey(goal.id);
    setFocus(null);
    setFeedback({
      deltas: {
        savings: -goal.price,
        ...meterDeltaMap(goal),
      },
      cause: result.stageExplanation ?? (result.stageHeld ? strings.cheapGoalHeld : strings.feedbackCausePurchase),
      nextStep: strings.feedbackNextGoal,
    });
  };

  const pot = profileId ? game.savingsState(profileId).pot : 0;
  if (feedback) return <FeedbackCard model={feedback} onDismiss={() => setFeedback(null)} />;
  if (!goal || hiddenKey === goal.id || pot < goal.price) return null;

  const spoken = `${strings.savingsAchieved}. ${goal.name}. ${strings.shopPrice(goal.price)}`;

  return (
    <AppModal animation="fade" transparent visible onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View accessible aria-label={spoken} style={styles.hero}>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.tile}
            >
              <Text style={styles.emoji}>{goal.icon}</Text>
            </View>
            <Text style={styles.heroCaption}>{strings.savingsAchieved}</Text>
            <Text style={styles.heroName}>{goal.name}</Text>
          </View>
          <MoneyCard>
            {goal.description ? <Text style={styles.body}>{goal.description}</Text> : null}
            <CoinText labelled={false} text={strings.shopPrice(goal.price)} style={styles.price} />
          </MoneyCard>
          <TextButton label={strings.savingsLater} onPress={dismiss} />
          <PrimaryButton label={strings.savingsBuyFromSavings} onPress={buy} />
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
    textAlign: "center",
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
  price: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
});
