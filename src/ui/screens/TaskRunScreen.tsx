import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { factFromSpending } from "../../core/budgetGames";
import { replayVariety, shuffleAnswers, type ShopPose } from "../../core/shopPlay";
import {
  chooseOption,
  dealTask,
  earnedReward,
  endsGameDay,
  tallyVerdicts,
  isPickChoice,
  startTask,
  type BudgetSplit,
  type NextRef,
  type TaskEffect,
  type TaskStepResult,
  type Verdict,
} from "../../core/tasks";
import { META_KEYS } from "../../data/metaKeys";
import type { ProfileView } from "../../data/repositories/gameRepository";
import { AppModal } from "../components/AppModal";
import { BackButton } from "../components/BackButton";
import { CoinText } from "../components/CoinText";
import { FeedbackCard, type FeedbackModel } from "../components/FeedbackCard";
import { PixelIcon } from "../components/Pictogram";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TextButton } from "../components/TextButton";
import type { RootStackParamList } from "../navigation/types";
import { PetView } from "../pet/PetView";
import type { PetPose } from "../pet/keys";
import { useSession } from "../session/SessionProvider";
import { cueForVerdict } from "../sound/cues";
import { playStoredCue } from "../sound/playCue";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { AllocateBoard, ReplanBoard } from "../games/BudgetBoard";
import { CompareBoard } from "../games/CompareBoard";
import { OptionTiles, SceneTiles, VerdictBanner } from "../games/GameParts";
import { gameStrings } from "../games/gameStrings";
import { PickBoard } from "../games/PickBoard";
import { DreamGame, StepsGame } from "../games/SavingGames";
import { SortBoard } from "../games/SortBoard";

type Props = NativeStackScreenProps<RootStackParamList, "TaskRun">;

function poseForVerdict(verdict: Verdict): PetPose {
  if (verdict === "good") return "happy";
  if (verdict === "bad") return "sad";
  return "idle";
}

function coinDelta(effects: readonly TaskEffect[]): number {
  return effects.reduce((sum, effect) => sum + (effect.coins && effect.coins > 0 ? effect.coins : 0), 0);
}

/** A scene already paid its coins this visit: after «Начать заново» it teaches, but pays nothing again. */
export function withoutSceneCoins(step: TaskStepResult): TaskStepResult {
  return { ...step, effects: step.effects.map(({ coins: _coins, ...effect }) => effect) };
}

export default function TaskRunScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const { game, meta, content } = useSession();
  const task = content.tasks.find((item) => item.id === taskId);
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [result, setResult] = useState<TaskStepResult | null>(null);
  const [sceneFeedback, setSceneFeedback] = useState<FeedbackModel | null>(null);
  /** First answer per scored unit (choice node id, or node#item for sort) — the score. */
  const [firstVerdicts, setFirstVerdicts] = useState<Record<string, Verdict>>({});
  /** План и факт: the child's plan and what the choices spent since. */
  const [plan, setPlan] = useState<BudgetSplit | null>(null);
  const [spent, setSpent] = useState<Partial<BudgetSplit>>({});
  /** This visit's graph: a dealt mini-game, or the lesson unchanged. */
  const [run, setRun] = useState<ReturnType<typeof dealTask> | null>(null);
  /** Rounds cleared this visit, including a right answer after a retry. */
  const [cleared, setCleared] = useState(0);
  /** In-game purse. Never written to Баланс. */
  const [kept, setKept] = useState(0);
  /** Face while a board is in play. A scored answer still wins once it is showing. */
  const [pose, setPose] = useState<ShopPose | null>(null);
  /** The last shop buy was handed back. */
  const [returned, setReturned] = useState(false);
  /** «Начать заново» count this visit; part of each board key so boards start fresh. */
  const [attempt, setAttempt] = useState(0);
  const [confirmRestart, setConfirmRestart] = useState(false);
  /** Scenes whose coins went to Баланс this visit. A restart does not pay them twice. */
  const [paidScenes, setPaidScenes] = useState<Record<string, true>>({});

  /** Back to the first node with a clean score and clean game state (plan, spent, purse). */
  const resetProgress = (visit: ReturnType<typeof dealTask>) => {
    setNodeId(startTask(visit).nodeId);
    setResult(null);
    setSceneFeedback(null);
    setFirstVerdicts({});
    setPlan(null);
    setSpent({});
    setCleared(0);
    setKept(0);
    setPose(null);
    setReturned(false);
  };

  useFocusEffect(
    useCallback(() => {
      const profileId = meta.get(META_KEYS.activeProfileId);
      if (!profileId || !task) return;
      setProfile(game.getProfile(profileId));
      const dealt = dealTask(task);
      const alreadyPlayed = game
        .listTaskProgress(profileId)
        .some((row) => row.taskKey === task.id && row.status === "completed");
      const seed = 1 + Math.floor(Math.random() * 997);
      const shelved = alreadyPlayed ? replayVariety(dealt.nodes, seed) : dealt.nodes;
      const visit = { ...dealt, nodes: shuffleAnswers(shelved, seed) };
      setRun(visit);
      resetProgress(visit);
      setPaidScenes({});
      setConfirmRestart(false);
    }, [game, meta, task]),
  );

  if (!task || !run || !profile || !nodeId) {
    return (
      <Screen>
        <BackButton />
        <CoinText text={strings.navTasks} style={styles.body} />
      </Screen>
    );
  }

  const node = run.nodes.find((item) => item.id === nodeId);
  const kind = node?.kind ?? "choice";
  const explaining = result !== null;
  const withPet = (text: string) => text.split("{pet}").join(profile.petName);

  const remember = (key: string, verdict: Verdict) => {
    setFirstVerdicts((current) => (key in current ? current : { ...current, [key]: verdict }));
  };

  const finish = (lastStep: TaskStepResult | null, verdicts: Record<string, Verdict>) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const day = game.dayState(profileId);
    const verdictList = Object.values(verdicts);
    const earned = earnedReward(run, verdictList);
    const alreadyCompleted = game
      .listTaskProgress(profileId)
      .some((row) => row.taskKey === task.id && row.status === "completed");
    const dayEnded = endsGameDay(task) && !alreadyCompleted;
    const reward = game.claimTaskReward(
      profileId,
      day.dayId,
      task.id,
      earned,
      dayEnded ? { task, catalog: content.catalog, bills: content.bills } : undefined,
      tallyVerdicts(verdictList),
    );
    navigation.replace("TaskResult", {
      taskId: task.id,
      reward,
      earned,
      sceneCoins: lastStep ? coinDelta(lastStep.effects) : 0,
      points: Object.values(verdicts).reduce((sum, v) => sum + (v === "good" ? 1 : v === "warn" ? 0.5 : 0), 0),
      dayEnded,
    });
  };

  const goTo = (next: NextRef, lastStep: TaskStepResult | null, verdicts: Record<string, Verdict>) => {
    if (next === "exit") {
      finish(lastStep, verdicts);
      return;
    }
    setNodeId(next);
    setResult(null);
    setReturned(false);
    setPose(null);
  };

  const restart = () => {
    setConfirmRestart(false);
    resetProgress(run);
    setAttempt((current) => current + 1);
  };

  const choose = (optionIndex: number) => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId || !node) return;
    const day = game.dayState(profileId);
    const dealt = chooseOption(run, node.id, optionIndex);
    const step = paidScenes[node.id] ? withoutSceneCoins(dealt) : dealt;
    if (coinDelta(step.effects) > 0) setPaidScenes((current) => ({ ...current, [node.id]: true }));
    const purse = node.options?.[optionIndex]?.kept ?? 0;
    if (step.next !== "retry") {
      if (step.verdict === "good") setCleared((current) => current + 1);
      if (purse > 0) setKept((current) => current + purse);
    }
    game.applyTaskStep(profileId, day.dayId, step);
    setProfile(game.getProfile(profileId));
    remember(node.id, step.verdict);
    const spend = node.options?.[optionIndex]?.spend;
    if (spend && step.next !== "retry") {
      setSpent((current) => ({ ...current, [spend.bucket]: (current[spend.bucket] ?? 0) + spend.amount }));
    }
    setResult(step);
    void playStoredCue(cueForVerdict(step.verdict), meta);
    const coins = coinDelta(step.effects);
    if (coins > 0 && step.next !== "exit") {
      setSceneFeedback({
        deltas: { balance: coins },
        cause: strings.feedbackCauseTaskScene,
        nextStep: strings.feedbackNextTaskScene,
      });
    }
  };

  const goNext = () => {
    if (!node) return;
    // Answers were recorded on earlier presses, so state already holds them.
    const verdicts = { ...firstVerdicts };
    if (kind !== "choice") {
      goTo(node.next ?? "exit", null, verdicts);
      return;
    }
    if (!result) return;
    if (result.next === "retry") {
      if (isPickChoice(node)) setReturned(true);
      setResult(null);
      setPose("idle");
      return;
    }
    goTo(result.next, result, verdicts);
  };

  const tileMode = kind === "choice" && (node?.options?.every((option) => option.icon) ?? false);
  const pickMode = kind === "choice" && node != null && isPickChoice(node);
  const footer =
    kind === "card" ? (
      <PrimaryButton label={node?.button ?? strings.taskCardNext} onPress={goNext} />
    ) : kind === "choice" && explaining ? (
      <PrimaryButton
        label={result?.next === "retry" ? (pickMode ? gameStrings.repair : gameStrings.retry) : strings.next}
        onPress={goNext}
      />
    ) : kind === "choice" && !tileMode && !pickMode ? (
      <>
        {node?.options?.map((option, index) => (
          <PrimaryButton key={`${node.id}-${index}`} label={withPet(option.label)} onPress={() => choose(index)} />
        ))}
      </>
    ) : null;
  const shownVerdict = result?.verdict;
  const isCard = kind === "card";
  const rounds = run.nodes.filter((item) => (item.kind ?? "choice") === "choice");
  const roundAt = rounds.findIndex((item) => item.id === node?.id);
  const showMeter = task.deal != null && roundAt >= 0;
  const showPurse = run.nodes.some((item) => item.options?.some((option) => (option.kept ?? 0) > 0));
  const showRestart = !endsGameDay(task);

  return (
    <Screen footer={footer}>
      <View style={styles.top}>
        <BackButton />
        {node?.title === task.title ? (
          <View style={styles.topSpacer} />
        ) : (
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
        )}
        {showRestart ? (
          <Pressable
            role="button"
            aria-label={strings.taskRestart}
            onPress={() => setConfirmRestart(true)}
            style={({ pressed }) => [styles.restart, pressed ? styles.restartPressed : null]}
          >
            <PixelIcon name="reload" size={20} color={colors.accentText} />
            <Text style={styles.restartLabel}>{strings.taskRestart}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={isCard ? styles.cardHero : styles.petRow}>
        <PetView
          species={profile.species}
          color={profile.color}
          accessory={profile.accessory}
          petName={profile.petName}
          care={profile.care}
          mood={profile.mood}
          size={isCard ? 120 : 88}
          pose={shownVerdict ? poseForVerdict(shownVerdict) : (pose ?? undefined)}
        />
        {result && task.parent ? (
          <Text style={styles.meterText}>
            {result.verdict === "good" ? gameStrings.petGlad(profile.petName) : gameStrings.petThink(profile.petName)}
          </Text>
        ) : null}
      </View>
      {showMeter ? (
        <View style={styles.meter}>
          <Text style={styles.meterText}>{gameStrings.round(roundAt + 1, rounds.length)}</Text>
          <Text style={styles.meterText}>{gameStrings.cleared(cleared)}</Text>
          {showPurse ? <Text style={styles.meterText}>{gameStrings.kept(kept)}</Text> : null}
        </View>
      ) : null}
      {node?.id === task.nodes[0]?.id && kind === "choice" ? (
        <CoinText text={withPet(task.intro)} style={styles.body} />
      ) : null}
      {isCard && node ? (
        <View style={styles.lessonCard}>
          {node.title ? <CoinText text={withPet(node.title)} style={styles.section} /> : null}
          <CoinText text={withPet(node.text)} style={styles.body} />
        </View>
      ) : null}
      {!isCard && node ? (
        <View style={styles.verdict}>
          {node.title ? <CoinText text={withPet(node.title)} style={styles.section} /> : null}
          <CoinText text={withPet(node.text)} style={kind === "choice" ? styles.section : styles.body} />
        </View>
      ) : null}
      {kind === "choice" && node?.scene && !(pickMode && !explaining) ? <SceneTiles tiles={node.scene} /> : null}
      {pickMode && node?.scene && node.options && !explaining ? (
        <PickBoard
          key={`${node.id}#${attempt}`}
          tiles={node.scene}
          options={node.options}
          onChoose={choose}
          returned={returned}
          onPose={setPose}
        />
      ) : null}
      {tileMode && node?.options && !explaining ? (
        <OptionTiles options={node.options} onChoose={choose} withPet={withPet} />
      ) : null}
      {kind === "sort" && node ? (
        <SortBoard
          key={`${node.id}#${attempt}`}
          bins={node.bins ?? []}
          items={node.items ?? []}
          withPet={withPet}
          onAnswer={(index, verdict) => {
            remember(`${node.id}#${index}`, verdict);
            void playStoredCue(cueForVerdict(verdict), meta);
          }}
          onDone={goNext}
          onPose={setPose}
        />
      ) : null}
      {kind === "allocate" && node ? (
        <AllocateBoard
          key={`${node.id}#${attempt}`}
          total={node.total ?? 100}
          onDone={(split) => {
            setPlan(split);
            setSpent({});
            goNext();
          }}
          onPose={setPose}
        />
      ) : null}
      {kind === "compare" && node ? (
        <CompareBoard
          key={`${node.id}#${attempt}`}
          plan={plan ?? { mandatory: 0, wants: 0, savings: node.total ?? 100 }}
          fact={factFromSpending(node.total ?? 100, spent)}
          onDone={goNext}
        />
      ) : null}
      {kind === "replan" && node && node.plan && node.event ? (
        <ReplanBoard
          key={`${node.id}#${attempt}`}
          total={node.total ?? 100}
          plan={node.plan}
          event={node.event}
          outcomes={node.outcomes}
          withPet={withPet}
          onDone={goNext}
          onPose={setPose}
        />
      ) : null}
      {kind === "steps" && node && node.goal ? (
        <StepsGame
          key={`${node.id}#${attempt}`}
          goal={node.goal}
          saved={node.saved ?? 0}
          amounts={node.amounts ?? [5]}
          income={node.income ?? 10}
          temptations={node.temptations}
          petName={profile.petName}
          onDone={goNext}
          onPose={setPose}
        />
      ) : null}
      {kind === "dream" && node ? (
        <DreamGame
          key={`${node.id}#${attempt}`}
          goals={node.goals ?? []}
          saved={node.saved ?? 0}
          amounts={node.amounts ?? [5, 10]}
          days={node.days}
          onDone={goNext}
        />
      ) : null}
      {result ? (
        <View style={styles.verdict}>
          <VerdictBanner verdict={result.verdict} text={withPet(result.explanation)} />
          {result.effects.map((effect, index) =>
            effect.meter && effect.delta ? (
              <CoinText
                key={`${effect.meter}-${index}`}
                text={effect.meter === "care" ? strings.feedbackCare(effect.delta) : strings.feedbackMood(effect.delta)}
                style={styles.body}
              />
            ) : null,
          )}
          {result.spawnTask ? <CoinText text={strings.taskSpawned} style={styles.body} /> : null}
        </View>
      ) : null}
      {sceneFeedback ? <FeedbackCard model={sceneFeedback} onDismiss={() => setSceneFeedback(null)} /> : null}
      {showRestart && confirmRestart ? (
        <RestartConfirm onRestart={restart} onKeep={() => setConfirmRestart(false)} />
      ) : null}
    </Screen>
  );
}

/** «Начать заново?» — asked first so a stray tap never wipes a half-played task. */
function RestartConfirm({ onRestart, onKeep }: { onRestart: () => void; onKeep: () => void }) {
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.section}>{strings.taskRestartTitle}</Text>
          <Text style={styles.body}>{strings.taskRestartBody}</Text>
          <PrimaryButton label={strings.taskRestartConfirm} onPress={onRestart} />
          <TextButton label={strings.taskRestartKeep} onPress={onKeep} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(62, 42, 28, 0.45)",
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
  topSpacer: {
    flex: 1,
  },
  restart: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.accentText,
    borderRadius: radius.card,
    borderWidth: 2,
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    minHeight: minTarget,
    paddingHorizontal: spacing.s,
  },
  restartPressed: {
    opacity: 0.7,
  },
  restartLabel: {
    color: colors.accentText,
    fontSize: type.body,
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
  verdict: {
    gap: spacing.s,
  },
  verdictTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  taskTitle: {
    color: colors.subtle,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  petRow: {
    alignItems: "center",
    gap: spacing.s,
  },
  meter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    justifyContent: "center",
  },
  meterText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  cardHero: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: radius.card,
    paddingVertical: spacing.m,
  },
  lessonCard: {
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.s,
    padding: spacing.m,
  },
});
