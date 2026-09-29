import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  childGames,
  miniGames,
  missionPrerequisite,
  rewardLeft,
  taskUnlockOrder,
  unlockedTasks,
  type TaskContent,
} from "../../core/tasks";
import { META_KEYS } from "../../data/metaKeys";
import type { TaskProgressView } from "../../data/repositories/gameRepository";
import { BottomSheet } from "../components/BottomSheet";
import { Card } from "../components/Card";
import { CoinText } from "../components/CoinText";
import { Fab, FabStack } from "../components/Fab";
import { Pictogram, PixelIcon } from "../components/Pictogram";
import { ScreenTitle } from "../components/ScreenTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../navigation/types";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { TOPIC_TINT } from "../topicStyle";
import type { SpotlightBox } from "../finnyScript";
import { measureSpotlight } from "../measureSpotlight";
import { MapArrows, mapEdges } from "./MapArrows";
import { containedMapSize } from "./mapLayout";
import { ZoomableMap } from "./ZoomableMap";
import { completedTaskIds, correctionTasks, type TaskTopic } from "../tasks/model";

/** Background art: Andrei's Moscow map drops in here (same file name, any size, 3:4). */
const MAP_IMAGE = require("../../../assets/map/moscow.png");
const PIN = 44;

const TOPIC_COPY: Record<TaskTopic, { title: string; icon: string }> = {
  budget: { title: strings.taskTopicBudget, icon: strings.taskTopicBudgetIcon },
  savings: {
    title: strings.taskTopicSavings,
    icon: strings.taskTopicSavingsIcon,
  },
  payments: {
    title: strings.taskTopicPayments,
    icon: strings.taskTopicPaymentsIcon,
  },
};

type PinState = "locked" | "open" | "done" | "soon";

/**
 * Карта заданий: the map stays clear. A pin opens the lesson in a sheet,
 * with «Начать» in the sheet footer. Мини-игры and Словарик keep their labels.
 */
export default function TaskListScreen({
  markFirstOpen = false,
  measureRoot,
  onSpotlightBox,
}: {
  markFirstOpen?: boolean;
  measureRoot?: RefObject<View | null>;
  onSpotlightBox?: (id: string, box: SpotlightBox) => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { game, meta, content } = useSession();
  const { focus } = usePlayChrome();
  const [progress, setProgress] = useState<TaskProgressView[]>([]);
  const [demo, setDemo] = useState(false);
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const [correctionsHeight, setCorrectionsHeight] = useState(0);
  const pinRef = useRef<View>(null);
  const reportPin = () => {
    if (!markFirstOpen) return;
    measureSpotlight(pinRef.current, measureRoot?.current ?? null, "pin", onSpotlightBox, PIN / 2);
  };

  useEffect(() => {
    if (!markFirstOpen) return;
    measureSpotlight(pinRef.current, measureRoot?.current ?? null, "pin", onSpotlightBox, PIN / 2);
  }, [markFirstOpen, measureRoot, onSpotlightBox]);

  useFocusEffect(
    useCallback(() => {
      const profileId = meta.get(META_KEYS.activeProfileId);
      if (!profileId) return;
      setDemo(game.getProfile(profileId).isDemo);
      setProgress(game.listTaskProgress(profileId));
    }, [game, meta]),
  );

  const [seenFocus, setSeenFocus] = useState<typeof focus>(null);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.kind === "lesson") setSheetTaskId(focus.taskId);
  }

  const byKey = new Map(progress.map((row) => [row.taskKey, row]));
  const completed = completedTaskIds(progress);
  const openIds = new Set(
    unlockedTasks(content.tasks, completed, demo).map((task) => task.id),
  );
  const missions = taskUnlockOrder(content.tasks);
  const corrections = correctionTasks(content.tasks, progress);
  const stateOf = (task: TaskContent): PinState =>
    task.comingSoon
      ? "soon"
      : completed.has(task.id)
        ? "done"
        : openIds.has(task.id)
          ? "open"
          : "locked";
  const sheetTask = content.tasks.find((task) => task.id === sheetTaskId) ?? null;
  if (corrections.length === 0 && correctionsHeight !== 0) setCorrectionsHeight(0);

  // Pins sit in % of the map box so they follow the art at any screen width.
  const at = (task: TaskContent) => ({
    x: task.pin?.x ?? 0.5,
    y: task.pin?.y ?? 0.5,
  });
  const pct = (fraction: number): `${number}%` =>
    `${Math.round(fraction * 1000) / 10}%`;

  const map = containedMapSize(slot.width, slot.height);
  const mapReady = map.width > 0 && map.height > 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>{strings.mapTitle}</ScreenTitle>
        <Text style={styles.hint}>{strings.mapHint}</Text>
      </View>
      <View
        testID="map-slot"
        collapsable={false}
        style={styles.mapSlot}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSlot((current) =>
            Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
              ? current
              : { width, height },
          );
        }}
      >
        <ZoomableMap
          size={map}
          style={[
            styles.map,
            mapReady
              ? {
                  height: map.height,
                  left: (slot.width - map.width) / 2,
                  position: "absolute",
                  top: Math.max(0, (slot.height - map.height) / 2),
                  width: map.width,
                }
              : styles.mapPending,
          ]}
        >
          {(counterScale) => (
            <>
              {/* Explicit width/height: on iOS an absolute-fill Image kept its
                  828×1104 intrinsic size and spilled far past the box.
                  resizeMethod="scale" keeps the full bitmap so a zoomed map stays sharp. */}
              {mapReady ? (
                <Image
                  source={MAP_IMAGE}
                  style={{ width: map.width, height: map.height }}
                  resizeMode="contain"
                  resizeMethod="scale"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              {mapReady ? (
                <MapArrows
                  edges={mapEdges(missions, content.tasks)}
                  size={map}
                  // Selected pins grow 15 %; the arrows stop clear of that too.
                  gap={Math.ceil((PIN / 2) * 1.15) + 2}
                  walked={(edge) => demo || completed.has(edge.from.id)}
                />
              ) : null}
              {missions.map((task) => {
                const state = stateOf(task);
                const { x, y } = at(task);
                const isSelected = task.id === sheetTaskId;
                const firstOpen = markFirstOpen && task.id === missions[0]?.id && state === "open";
                return (
                  // The spot rides the zoomed art; the counter-scale keeps the pin its own size.
                  <Animated.View
                    key={task.id}
                    style={[styles.pinSpot, { left: pct(x), top: pct(y), transform: [{ scale: counterScale }] }]}
                  >
                    <Pressable
                      ref={firstOpen ? pinRef : undefined}
                      collapsable={firstOpen ? false : undefined}
                      onLayout={firstOpen ? reportPin : undefined}
                      role="button"
                      aria-label={strings.missionPinA11y(task.title, state)}
                      aria-selected={isSelected || firstOpen}
                      onPress={() => setSheetTaskId(task.id)}
                      hitSlop={(minTarget - PIN) / 2}
                      style={[
                        styles.pin,
                        state === "locked" || state === "soon"
                          ? styles.pinLocked
                          : state === "done"
                            ? styles.pinDone
                            : styles.pinOpen,
                        isSelected ? styles.pinSelected : null,
                      ]}
                    >
                      <Pictogram
                        glyph={
                          state === "soon"
                            ? "⏳"
                            : state === "locked"
                              ? "🔒"
                              : state === "done"
                                ? "✓"
                                : TOPIC_COPY[task.topic].icon
                        }
                      />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </>
          )}
        </ZoomableMap>
      </View>
      {corrections.length > 0 ? (
        <View
          style={styles.correctionsBar}
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.height);
            setCorrectionsHeight((current) => (current === next ? current : next));
          }}
        >
          <Corrections
            tasks={corrections}
            onPlay={(taskId) => navigation.navigate("TaskRun", { taskId })}
          />
        </View>
      ) : null}
      <FabStack bottom={correctionsHeight > 0 ? correctionsHeight + spacing.s : spacing.m}>
        <Fab
          label={strings.missionGames}
          icon={<PixelIcon name="play" size={32} color={colors.onRaised} />}
          onPress={() => setGamesOpen(true)}
        />
        <Fab
          label={strings.glossaryTitle}
          icon={<PixelIcon name="book-open" size={32} color={colors.onRaised} />}
          onPress={() => navigation.navigate("Handbook")}
        />
      </FabStack>
      <GamesSheet
        visible={gamesOpen}
        explainLock={!demo}
        games={miniGames(content.tasks).map((task) => ({
          task,
          state: stateOf(task),
          parent: content.tasks.find((item) => item.id === task.parent) ?? null,
        }))}
        onClose={() => setGamesOpen(false)}
        onPlay={(taskId) => {
          setGamesOpen(false);
          navigation.navigate("TaskRun", { taskId });
        }}
      />
      {sheetTask ? (
        <MissionSheet
          task={sheetTask}
          state={stateOf(sheetTask)}
          best={byKey.get(sheetTask.id)?.bestReward ?? 0}
          games={childGames(sheetTask, content.tasks).map((child) => ({
            task: child,
            state: stateOf(child),
          }))}
          highlighted={
            focus?.kind === "lesson" && focus.taskId === sheetTask.id && stateOf(sheetTask) === "open"
          }
          blocker={missionPrerequisite(sheetTask, content.tasks)}
          onClose={() => setSheetTaskId(null)}
          onPlay={(taskId) => {
            setSheetTaskId(null);
            navigation.navigate("TaskRun", { taskId });
          }}
        />
      ) : null}
    </View>
  );
}

const hiddenStar = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no" as const,
};

function DifficultyMarks({ level }: { level: number }) {
  return (
    <View accessible accessibilityLabel={strings.missionDifficulty(level)} style={styles.difficulty}>
      {[1, 2, 3].map((star) => (
        <Text
          key={star}
          {...hiddenStar}
          style={[styles.star, star <= level ? styles.starOn : styles.starOff]}
        >
          {star <= level ? strings.starFilled : strings.starEmpty}
        </Text>
      ))}
    </View>
  );
}

/** «Начать», a replay, or the lock line. Sits in the sheet footer, clear of the stage card. */
function MissionAction({
  task,
  state,
  blocker,
  onPlay,
  highlighted,
}: {
  task: TaskContent;
  state: PinState;
  blocker: TaskContent | null;
  onPlay: (taskId: string) => void;
  highlighted?: boolean;
}) {
  if (state === "soon") return null;
  if (state === "locked" && blocker) {
    return (
      <View style={styles.lockedLine}>
        <PixelIcon name="lock" size={20} color={colors.subtle} />
        <Text style={[styles.body, styles.lockedText]}>{strings.missionLockedAfter(blocker.title)}</Text>
      </View>
    );
  }
  return (
    <PrimaryButton
      highlighted={highlighted}
      label={state === "done" ? strings.missionReplay : strings.missionStart}
      onPress={() => onPlay(task.id)}
    />
  );
}

/** One slim row per pending correction. Playing it removes the row. */
function Corrections({ tasks, onPlay }: { tasks: TaskContent[]; onPlay: (taskId: string) => void }) {
  if (tasks.length === 0) return null;
  return (
    <>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          role="button"
          aria-label={task.title}
          accessibilityHint={strings.missionCorrections}
          onPress={() => onPlay(task.id)}
          style={({ pressed }) => [styles.fix, pressed ? styles.fixPressed : null]}
        >
          <View aria-hidden style={styles.fixBadge}>
            <PixelIcon name="warning-diamond" size={22} color={colors.onRaised} />
          </View>
          <View style={styles.fixCopy}>
            <Text style={styles.fixCaption}>{strings.missionCorrections}</Text>
            <CoinText text={task.title} numberOfLines={1} style={styles.fixTitle} />
          </View>
          <View aria-hidden style={styles.fixGo}>
            <PixelIcon name="play" size={18} color={colors.onRaised} />
          </View>
        </Pressable>
      ))}
    </>
  );
}

/** Mini-games of the selected pin as a row of small play chips. */
function GameRow({
  parent,
  games,
  onPlay,
}: {
  parent: TaskContent;
  games: { task: TaskContent; state: PinState }[];
  onPlay: (taskId: string) => void;
}) {
  if (games.length === 0) return null;
  return (
    <View style={styles.games}>
      <Text style={styles.gamesTitle}>{strings.missionGames}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.gameList}
      >
        {games.map((child) => {
          const locked = child.state === "locked" || child.state === "soon";
          return (
            <Pressable
              key={child.task.id}
              role="button"
              aria-label={strings.missionPlayGame(child.task.title)}
              aria-disabled={locked}
              accessibilityHint={locked ? strings.missionLockedAfter(parent.title) : undefined}
              disabled={locked}
              onPress={() => onPlay(child.task.id)}
              style={({ pressed }) => [
                styles.gameChip,
                locked ? styles.gameChipLocked : child.state === "done" ? styles.gameChipDone : null,
                pressed && !locked ? styles.gameChipPressed : null,
              ]}
            >
              <View
                style={[
                  styles.gameChipFace,
                  locked ? styles.gameChipFaceLocked : child.state === "done" ? styles.gameChipFaceDone : null,
                ]}
              >
                <PixelIcon
                  name={locked ? "lock" : child.state === "done" ? "check" : "play"}
                  size={20}
                  color={locked ? colors.subtle : colors.onRaised}
                />
                <CoinText
                  inline
                  labelled={false}
                  text={child.task.title}
                  style={[styles.gameLabel, locked ? styles.gameLabelLocked : null]}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Every mini-game, with the Урок it belongs to. Locked until that Урок is done, except in Демо-режим. */
function GamesSheet({
  visible,
  games,
  explainLock,
  onClose,
  onPlay,
}: {
  visible: boolean;
  games: { task: TaskContent; state: PinState; parent: TaskContent | null }[];
  explainLock: boolean;
  onClose: () => void;
  onPlay: (taskId: string) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{strings.missionGames}</Text>
      {explainLock ? <Text style={styles.sheetBody}>{strings.missionGamesLead}</Text> : null}
      {games.map((child) => {
        const locked = child.state === "locked" || child.state === "soon";
        return (
          <Pressable
            key={child.task.id}
            role="button"
            aria-label={strings.missionPlayGame(child.task.title)}
            aria-disabled={locked}
            accessibilityHint={
              locked && child.parent ? strings.missionLockedAfter(child.parent.title) : undefined
            }
            disabled={locked}
            onPress={() => onPlay(child.task.id)}
            style={({ pressed }) => [
              styles.catalogHit,
              pressed && !locked ? styles.gameChipPressed : null,
            ]}
          >
            <Card>
              <View style={styles.catalogRow}>
                <PixelIcon
                  name={locked ? "lock" : child.state === "done" ? "check" : "play"}
                  size={24}
                  color={locked ? colors.subtle : colors.accentText}
                />
                <View style={styles.catalogCopy}>
                  <CoinText text={child.task.title} style={styles.cardTitle} />
                  {child.parent ? (
                    <Text style={styles.body}>{strings.missionGameLesson(child.parent.title)}</Text>
                  ) : null}
                  {locked && child.parent ? (
                    <Text style={[styles.body, styles.lockedText]}>
                      {strings.missionLockedAfter(child.parent.title)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

/** Lesson for one map pin. «Начать» stays in the footer, above the stage card. */
function MissionSheet({
  task,
  state,
  best,
  games,
  blocker,
  highlighted,
  onClose,
  onPlay,
}: {
  task: TaskContent;
  state: PinState;
  best: number;
  games: { task: TaskContent; state: PinState }[];
  blocker: TaskContent | null;
  highlighted?: boolean;
  onClose: () => void;
  onPlay: (taskId: string) => void;
}) {
  const topic = TOPIC_COPY[task.topic];
  return (
    <BottomSheet
      visible
      onClose={onClose}
      footer={
        state === "soon" ? null : (
          <MissionAction
            task={task}
            state={state}
            blocker={blocker}
            onPlay={onPlay}
            highlighted={highlighted}
          />
        )
      }
    >
      <View style={styles.sheetHead}>
        <View style={[styles.topicBadge, { backgroundColor: TOPIC_TINT[task.topic] }]}>
          <Pictogram glyph={topic.icon} size={24} />
        </View>
        <View style={styles.panelTitle}>
          <CoinText text={task.title} style={styles.sheetTitle} />
          <Text style={styles.body}>
            {topic.title}
            {task.pin ? ` · ${strings.missionDistrict(task.pin.district)}` : ""}
          </Text>
        </View>
        {task.difficulty && state !== "soon" ? <DifficultyMarks level={task.difficulty} /> : null}
      </View>
      <CoinText text={task.intro} style={styles.sheetBody} />
      {task.description ? <CoinText text={task.description} style={styles.sheetBody} /> : null}
      {state === "soon" ? (
        <Text style={styles.body}>{strings.missionSoon}</Text>
      ) : state === "done" ? (
        <CoinText coin text={strings.missionRewardBest(best, task.reward)} style={styles.body} />
      ) : (
        <CoinText coin text={strings.missionRewardMax(task.reward)} style={styles.body} />
      )}
      {state === "done" ? (
        <CoinText coin text={strings.missionRewardLeft(rewardLeft(task, best))} style={styles.body} />
      ) : null}
      <GameRow parent={task} games={games} onPlay={onPlay} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    gap: 2,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  title: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  hint: {
    color: colors.subtle,
    fontSize: type.body,
  },
  correctionsBar: {
    paddingBottom: spacing.s,
    paddingHorizontal: spacing.m,
  },
  fix: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomWidth: 4,
    borderColor: colors.raisedEdge,
    borderRadius: radius.card,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  fixPressed: {
    borderBottomWidth: 2,
    marginTop: 2,
  },
  fixBadge: {
    alignItems: "center",
    backgroundColor: colors.badgeFill,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fixCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  fixCaption: {
    color: colors.accentText,
    fontSize: type.body,
    fontWeight: "700",
  },
  fixTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  fixGo: {
    alignItems: "center",
    backgroundColor: colors.raisedFace,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sheetHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  cardTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
    lineHeight: 22,
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  mapSlot: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  map: {
    borderRadius: 12,
    overflow: "hidden",
  },
  mapPending: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pinSpot: {
    height: PIN,
    marginLeft: -PIN / 2,
    marginTop: -PIN / 2,
    position: "absolute",
    width: PIN,
  },
  pin: {
    alignItems: "center",
    borderColor: colors.card,
    borderRadius: PIN / 2,
    borderWidth: 3,
    height: PIN,
    justifyContent: "center",
    width: PIN,
  },
  pinOpen: {
    backgroundColor: colors.accent,
  },
  pinDone: {
    backgroundColor: colors.fill,
  },
  pinLocked: {
    backgroundColor: colors.disabledFace,
  },
  pinSelected: {
    borderColor: colors.raisedEdge,
    transform: [{ scale: 1.15 }],
  },
  topicBadge: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  panelTitle: {
    flex: 1,
    minWidth: 0,
  },
  lockedLine: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  lockedText: {
    color: colors.subtle,
    flex: 1,
  },
  difficulty: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 20,
    lineHeight: 24,
  },
  starOn: {
    color: colors.accent,
  },
  starOff: {
    color: colors.disabledFace,
  },
  games: {
    gap: 4,
  },
  gamesTitle: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  gameList: {
    gap: spacing.s,
  },
  gameChip: {
    backgroundColor: colors.raisedFace,
    borderRadius: 12,
    paddingBottom: 4,
  },
  gameChipDone: {
    backgroundColor: colors.fill,
  },
  gameChipLocked: {
    backgroundColor: colors.disabledFace,
  },
  gameChipPressed: {
    paddingBottom: 0,
    paddingTop: 4,
  },
  gameChipFace: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    minHeight: minTarget - 4,
    paddingHorizontal: spacing.m,
  },
  gameChipFaceDone: {
    backgroundColor: colors.track,
  },
  gameChipFaceLocked: {
    backgroundColor: colors.track,
  },
  gameLabel: {
    color: colors.onRaised,
    fontSize: type.body,
    fontWeight: "700",
  },
  gameLabelLocked: {
    color: colors.subtle,
  },
  catalogHit: {
    minHeight: minTarget,
  },
  catalogRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  catalogCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  sheetBody: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
  },
});
