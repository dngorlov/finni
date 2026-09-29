import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { CUSTOM_GOAL_MOOD } from "../../core/customGoal";
import type { CatalogItemContent, GoalContent } from "../../data/content";
import { applyGoalProgress, estimateDaysToGoal } from "../../core/savings";
import { activeGoalLabel, goalThresholdLabel } from "../goalLabel";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState, JournalEntry, SavingsView } from "../../data/repositories/gameRepository";
import { AmountStepper } from "../components/AmountStepper";
import { AppModal } from "../components/AppModal";
import { CoinText } from "../components/CoinText";
import { ScreenTitle } from "../components/ScreenTitle";
import { FeedbackCard, type FeedbackModel } from "../components/FeedbackCard";
import { GoalPicker } from "../components/GoalPicker";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { moneyStrings } from "../stringsMoney";
import { colors, radius, spacing, type } from "../theme";
import { meterDeltaMap } from "../../core/economy";
import { itemLookup, itemTitle, savingsOps, savingsStats } from "./journalStats";
import {
  ActionRow,
  Amount,
  HeroCard,
  MoneyCard,
  moneyColors,
  OpRow,
  ProgressBar,
  RoundAction,
  SectionTitle,
  StatTile,
  TileRow,
} from "./moneyParts";
import { confirmedLeftover, leftoverAfterTap } from "./planLeftover";

/** Rows in the Копилка history. */
const RECENT_OPS = 6;

type Phase =
  | { name: "home" }
  | { name: "deposit"; amount: number }
  | { name: "withdraw"; amount: number }
  | { name: "withdrawPreview"; amount: number; potAfter: number; days: number | null }
  | { name: "celebration" };

/** Centered dialog over a dimmed Копилка. The dimmed area and «Закрыть» both dismiss it. */
function AmountDialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          role="button"
          aria-label={strings.sheetClose}
          onPress={onClose}
          style={styles.scrim}
        />
        <View pointerEvents="box-none" style={styles.dialogWrap}>
          <View onStartShouldSetResponder={() => true} style={styles.dialog}>
            {children}
          </View>
        </View>
      </View>
    </AppModal>
  );
}

function engineItem(item: Pick<CatalogItemContent, "id" | "kind" | "price" | "effect" | "also" | "once"> & { stage?: GoalContent["stage"] }) {
  return {
    id: item.id,
    kind: item.kind,
    price: item.price,
    effect: item.effect,
    also: item.also,
    once: item.once,
    stage: item.stage,
  };
}

export default function SavingsScreen() {
  const { game, meta, content } = useSession();
  const { touchChrome, focus, goalPrompt, setGoalPrompt } = usePlayChrome();
  const [savings, setSavings] = useState<SavingsView | null>(null);
  const [day, setDay] = useState<DayState | null>(null);
  const [balance, setBalance] = useState(0);
  const [phase, setPhase] = useState<Phase>({ name: "home" });
  const [feedback, setFeedback] = useState<FeedbackModel | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [offerPickGoal, setOfferPickGoal] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const load = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    setSavings(game.savingsState(profileId));
    setDay(game.dayState(profileId));
    setBalance(game.getProfile(profileId).balance);
    setJournal(game.listJournal(profileId));
    touchChrome();
  }, [game, meta, touchChrome]);

  useFocusEffect(
    useCallback(() => {
      load();
      setPhase(focus?.kind === "withdraw" ? { name: "withdraw", amount: 0 } : { name: "home" });
      setOfferPickGoal(false);
    }, [load, focus]),
  );

  // A buy from the overlay spends the pot and clears the Цель without this screen acting.
  useEffect(
    () =>
      game.subscribe(() => {
        load();
        setPhase((current) => (current.name === "celebration" ? { name: "home" } : current));
      }),
    [game, load],
  );

  const [seenFocus, setSeenFocus] = useState<typeof focus>(null);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.kind === "goal") setPickerOpen(true);
  }

  // A «выбери цель» request from Дом opens the picker once. setGoalPrompt lives in the
  // shared chrome context, so it cannot be cleared during this component's render.
  useEffect(() => {
    if (!goalPrompt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPickerOpen(true);
    setGoalPrompt(false);
  }, [goalPrompt, setGoalPrompt]);

  if (!savings) {
    return (
      <Screen>
        <CoinText text={strings.appName} style={styles.body} />
      </Screen>
    );
  }

  if (day && !day.open) {
    return (
      <Screen>
        <ScreenTitle style={styles.title}>{strings.navSavings}</ScreenTitle>
        <CoinText text={strings.waitingEconomyHint} style={styles.body} />
      </Screen>
    );
  }

  const deposits = () =>
    journal.filter((row) => row.kind === "savings_in").map((row) => Math.abs(row.amount));

  const presented = activeGoalLabel(savings.activeGoal, content.goals);
  const preset = savings.activeGoal ? content.goals.find((item) => item.id === savings.activeGoal!.key) : undefined;
  const activeItem =
    savings.activeGoal && presented
      ? {
          id: savings.activeGoal.key,
          name: presented.name,
          kind: "optional" as const,
          price: savings.activeGoal.cost,
          effect: preset?.effect ?? { meter: "mood" as const, delta: CUSTOM_GOAL_MOOD },
          once: true,
          stage: preset?.stage,
        }
      : null;
  const profileId = meta.get(META_KEYS.activeProfileId);
  const thresholdLabel = profileId ? goalThresholdLabel(savings, game.getProfile(profileId).stage) : null;
  const activeName = activeItem?.name ?? null;
  const accumulated = savings.activeGoal ? savings.activeGoal.cost - savings.activeGoal.remaining : 0;
  const funded = Boolean(savings.activeGoal?.achieved);
  const canBuyFromPot = Boolean(activeItem && funded && savings.pot >= activeItem.price);
  const celebrating = phase.name === "celebration" && canBuyFromPot;
  const savingsLeftover = confirmedLeftover(day, "savings");
  const leftoverAfterDeposit =
    phase.name === "deposit" ? leftoverAfterTap(savingsLeftover, phase.amount) : null;

  const putIn = (amount: number) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || amount <= 0) return;
    const dayState = game.dayState(profileId);
    const result = game.transferToSavings(profileId, dayState.dayId, amount);
    if (result.status === "blocked") return;
    load();
    if (result.achieved) {
      setPhase({ name: "celebration" });
      return;
    }
    setPhase({ name: "home" });
    setFeedback({
      deltas: { balance: -amount, savings: amount },
      cause: strings.feedbackCauseSavingsIn,
      nextStep: strings.feedbackNextSavingsIn,
    });
  };

  const takeOut = (amount: number) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || amount <= 0) return;
    const dayState = game.dayState(profileId);
    const result = game.withdrawFromSavings(profileId, dayState.dayId, amount);
    if (!result.ok) return;
    load();
    setPhase({ name: "home" });
    setFeedback({
      deltas: { balance: amount, savings: -amount },
      cause: strings.feedbackCauseSavingsOut,
      nextStep: strings.feedbackNextSavingsOut,
    });
  };

  const buyFromSavings = () => {
    if (!activeItem) return;
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const dayState = game.dayState(profileId);
    const result = game.purchaseFromSavings(profileId, dayState.dayId, engineItem(activeItem));
    if (result.status === "blocked") return;
    load();
    setPhase({ name: "home" });
    setOfferPickGoal(true);
    setFeedback({
      deltas: {
        savings: -activeItem.price,
        ...meterDeltaMap(activeItem),
      },
      cause: result.stageExplanation ?? (result.stageHeld ? strings.cheapGoalHeld : strings.feedbackCausePurchase),
      nextStep: strings.feedbackNextGoal,
    });
  };

  const previewWithdraw = (amount: number) => {
    const potAfter = savings.pot - amount;
    const remainingAfter = savings.activeGoal
      ? applyGoalProgress(potAfter, savings.activeGoal.cost).remaining
      : 0;
    const remainingNow = savings.activeGoal?.remaining ?? 0;
    const list = deposits();
    const before = estimateDaysToGoal(remainingNow, list);
    const after = estimateDaysToGoal(remainingAfter, list);
    const days = before != null && after != null ? Math.max(0, after - before) : null;
    setPhase({ name: "withdrawPreview", amount, potAfter, days });
  };

  const openPicker = () => {
    setPickerOpen(true);
  };

  const closeTransfer = () => setPhase({ name: "home" });

  const footer = (() => {
    if (feedback) return null;
    if (celebrating) {
      return (
        <>
          <TextButton
            label={strings.savingsLater}
            onPress={() => setPhase({ name: "home" })}
          />
          <PrimaryButton
            highlighted={focus?.kind === "buy-goal"}
            label={strings.savingsBuyFromSavings}
            onPress={buyFromSavings}
          />
        </>
      );
    }
    if (phase.name === "home") {
      if (offerPickGoal) return <PrimaryButton label={strings.savingsChooseNewGoal} onPress={openPicker} />;
      if (canBuyFromPot) {
        return (
          <PrimaryButton
            highlighted={focus?.kind === "buy-goal"}
            label={strings.savingsBuyFromSavings}
            onPress={buyFromSavings}
          />
        );
      }
    }
    return null;
  })();

  const lookup = itemLookup(content.catalog, content.goals);
  const ops = savingsOps(journal, lookup).slice(0, RECENT_OPS);
  const stats = savingsStats(journal);
  const goalCost = savings.activeGoal?.cost ?? 0;
  const showHome = !celebrating;
  const transferOpen =
    phase.name === "deposit" || phase.name === "withdraw" || phase.name === "withdrawPreview";
  const itemName = (id: string | null) => itemTitle(id, content.catalog, content.goals);

  return (
    <Screen footer={footer}>
      <View
        accessibilityElementsHidden={transferOpen}
        importantForAccessibility={transferOpen ? "no-hide-descendants" : "auto"}
        style={styles.home}
      >
        <ScreenTitle style={styles.title}>{strings.navSavings}</ScreenTitle>
        {savingsLeftover != null && showHome ? (
          <CoinText
            coin
            label={strings.planLeftoverA11y(strings.bucketSavings, savingsLeftover)}
            text={
              savingsLeftover >= 0
                ? strings.planLeftover(savingsLeftover)
                : strings.planOvershoot(Math.abs(savingsLeftover))
            }
            style={styles.body}
          />
        ) : null}
        <HeroCard caption={moneyStrings.savingsCaption} value={savings.pot} label={strings.savingsPot(savings.pot)}>
          <View style={styles.heroDivider} />
          {savings.activeGoal && activeName ? (
            <>
              <View style={styles.heroRow}>
                <View style={styles.heroGoal}>
                  <Text style={styles.heroSmall}>{moneyStrings.savingsGoalCaption}</Text>
                  <View style={styles.heroName}>
                    {savings.activeGoal?.custom && savings.activeGoal.icon ? (
                      <Text aria-hidden style={styles.heroEmoji}>
                        {savings.activeGoal.icon}
                      </Text>
                    ) : null}
                    <Text style={styles.heroGoalName}>{activeName}</Text>
                  </View>
                </View>
                <View accessible aria-label={strings.shopPrice(goalCost)}>
                  <Amount value={goalCost} size={16} color={moneyColors.heroText} />
                </View>
              </View>
              <View accessible aria-label={moneyStrings.savingsGoalProgress(accumulated, goalCost)}>
                <ProgressBar value={accumulated} max={goalCost} on="hero" />
              </View>
              <View style={styles.heroRow}>
                <Text style={styles.heroValue}>{strings.goalRatio(accumulated, goalCost)}</Text>
                <Text style={styles.heroValue}>{strings.savingsRemaining(savings.activeGoal.remaining)}</Text>
              </View>
              {thresholdLabel ? <Text style={styles.heroValue}>{thresholdLabel}</Text> : null}
              <View style={styles.heroRow}>
                <Text style={styles.heroSmall}>{moneyStrings.savingsForecast}</Text>
                <Text style={styles.heroValue}>
                  {savings.estimateDays == null
                    ? strings.savingsEstimateNone
                    : strings.savingsEstimate(savings.estimateDays)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.heroSmall}>{moneyStrings.savingsNoGoal}</Text>
              <Text style={styles.heroGoalName}>{strings.savingsPickGoal}</Text>
            </>
          )}
        </HeroCard>
        {showHome && !offerPickGoal ? (
          <ActionRow>
            <RoundAction
              label={strings.savingsDeposit}
              icon="arrow-down"
              disabled={balance <= 0}
              onPress={() => setPhase({ name: "deposit", amount: 0 })}
            />
            <RoundAction
              label={strings.savingsWithdraw}
              icon="arrow-up"
              disabled={savings.pot <= 0}
              highlighted={focus?.kind === "withdraw"}
              onPress={() => setPhase({ name: "withdraw", amount: 0 })}
            />
            <RoundAction
              label={moneyStrings.actionGoal}
              icon="target"
              highlighted={focus?.kind === "goal"}
              onPress={openPicker}
            />
          </ActionRow>
        ) : null}
        {celebrating ? (
          <View accessible aria-label={strings.savingsAchieved} style={styles.celebrate}>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.celebrateTile}
            >
              <Text style={styles.celebrateEmoji}>{presented?.icon || strings.savingsConfetti}</Text>
            </View>
            <Text style={styles.celebrateTitle}>{strings.savingsAchieved}</Text>
          </View>
        ) : null}
        {showHome ? (
          <>
            <TileRow>
              <StatTile
                label={moneyStrings.statTotal}
                value={stats.total}
                spoken={moneyStrings.statA11y(moneyStrings.statTotal, stats.total)}
              />
              <StatTile
                label={moneyStrings.statCount}
                value={stats.count}
                coin={false}
                spoken={moneyStrings.statCountA11y(stats.count)}
              />
              <StatTile
                label={moneyStrings.statAverage}
                value={stats.average}
                spoken={moneyStrings.statA11y(moneyStrings.statAverage, stats.average)}
              />
            </TileRow>
            <SectionTitle>{moneyStrings.savingsHistory}</SectionTitle>
            <MoneyCard tight>
              {ops.length === 0 ? <Text style={styles.empty}>{moneyStrings.savingsHistoryEmpty}</Text> : null}
              {ops.map((op, index) => {
                const title =
                  op.kind === "in"
                    ? moneyStrings.opIn
                    : op.kind === "out"
                      ? moneyStrings.opOut
                      : moneyStrings.opGoal(itemName(op.itemId));
                const day = moneyStrings.day(op.dayN);
                return (
                  <OpRow
                    key={op.id}
                    icon={op.kind === "in" ? "arrow-down" : op.kind === "out" ? "arrow-up" : "star"}
                    tint={op.kind === "in" ? moneyColors.plus : op.kind === "out" ? colors.raisedEdge : moneyColors.goal}
                    title={title}
                    subtitle={day}
                    amount={op.amount}
                    label={moneyStrings.opRowA11y(title, day, op.amount)}
                    last={index === ops.length - 1}
                  />
                );
              })}
            </MoneyCard>
          </>
        ) : null}
      </View>
      {phase.name === "deposit" ? (
        <AmountDialog onClose={closeTransfer}>
          <AmountStepper
            label={strings.savingsDepositAmount}
            pictogram={strings.navSavingsPictogram}
            value={phase.amount}
            max={balance}
            showTrack
            onChange={(amount) => setPhase({ name: "deposit", amount })}
          />
          <CoinText coin text={strings.savingsConfirmDeposit(phase.amount)} style={styles.body} />
          {leftoverAfterDeposit != null ? (
            <>
              <CoinText coin text={strings.planAfterTap(leftoverAfterDeposit)} style={styles.body} />
              {leftoverAfterDeposit < 0 ? <CoinText text={strings.planOverWarn} style={styles.body} /> : null}
            </>
          ) : null}
          <TextButton label={strings.close} onPress={closeTransfer} />
          <PrimaryButton
            label={strings.savingsDeposit}
            disabled={phase.amount <= 0}
            onPress={() => putIn(phase.amount)}
          />
        </AmountDialog>
      ) : null}
      {phase.name === "withdraw" ? (
        <AmountDialog onClose={closeTransfer}>
          <AmountStepper
            label={strings.savingsDepositAmount}
            pictogram={strings.navSavingsPictogram}
            value={phase.amount}
            max={savings.pot}
            showTrack
            onChange={(amount) => setPhase({ name: "withdraw", amount })}
          />
          <TextButton label={strings.close} onPress={closeTransfer} />
          <PrimaryButton
            label={strings.savingsWithdraw}
            disabled={phase.amount <= 0}
            onPress={() => previewWithdraw(phase.amount)}
          />
        </AmountDialog>
      ) : null}
      {phase.name === "withdrawPreview" ? (
        <AmountDialog onClose={closeTransfer}>
          <CoinText coin text={strings.savingsConfirmWithdraw(phase.amount)} style={styles.section} />
          <CoinText
            coin={phase.days == null}
            text={
              phase.days == null
                ? strings.savingsWithdrawPreviewNone(phase.potAfter)
                : strings.savingsWithdrawPreview(phase.potAfter, phase.days)
            }
            style={styles.body}
          />
          <TextButton label={strings.close} onPress={closeTransfer} />
          <PrimaryButton label={strings.savingsConfirmWithdraw(phase.amount)} onPress={() => takeOut(phase.amount)} />
        </AmountDialog>
      ) : null}
      {feedback ? <FeedbackCard model={feedback} onDismiss={() => setFeedback(null)} /> : null}
      <GoalPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChanged={() => {
          load();
          setOfferPickGoal(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  home: {
    flexGrow: 1,
    gap: spacing.m,
  },
  modalRoot: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(34, 26, 18, 0.45)",
  },
  dialogWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.l,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    gap: spacing.s,
    maxWidth: 360,
    padding: spacing.l,
    width: "100%",
  },
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  section: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  empty: {
    color: colors.subtle,
    fontSize: type.body,
    paddingVertical: spacing.s,
  },
  heroDivider: {
    backgroundColor: moneyColors.heroTrack,
    height: 1,
    marginVertical: 4,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "space-between",
  },
  heroGoal: {
    flex: 1,
    gap: 2,
  },
  heroSmall: {
    color: moneyColors.heroSubtle,
    fontSize: 14,
  },
  heroName: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  heroEmoji: {
    fontSize: 24,
  },
  heroGoalName: {
    color: moneyColors.heroText,
    flexShrink: 1,
    fontSize: type.section,
    fontWeight: "700",
  },
  heroValue: {
    color: moneyColors.heroText,
    fontSize: type.body,
    fontWeight: "700",
  },
  celebrate: {
    alignItems: "center",
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  celebrateTile: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: 20,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  celebrateEmoji: {
    fontSize: 40,
    lineHeight: 52,
  },
  celebrateTitle: {
    color: moneyColors.heroText,
    fontSize: type.section,
    fontWeight: "700",
    textAlign: "center",
  },
});
