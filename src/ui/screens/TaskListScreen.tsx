import { useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
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
import { GlyphLabel, Pictogram, PixelIcon } from "../components/Pictogram";
import { ScreenTitle } from "../components/ScreenTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../navigation/types";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { homeStrings } from "../stringsHome";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { TOPIC_TINT } from "../topicStyle";
import {
  containedMapSize,
  dockCap,
  dockOverflows,
  naturalDockHeight,
  PANEL_BORDER,
  PANEL_PAD,
} from "./mapLayout";
import {
  completedTaskIds,
  correctionTasks,
  preferredHubTask,
  type TaskTopic,
} from "../tasks/model";

/** Background art: Andrei's Moscow map drops in here (same file name, any size, 3:4). */
const MAP_IMAGE = require("../../../assets/map/moscow.png");
const PIN = 44;
const DOTS = 5;

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
 * Карта заданий: pins by district, unlock chain, reward left. The map keeps
 * the space above the lesson dock. A long description scrolls inside the dock,
 * and «Начать» stays pinned at the bottom of the card.
 */
export default function TaskListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { game, meta, content } = useSession();
  const { focus } = usePlayChrome();
  const [progress, setProgress] = useState<TaskProgressView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [outer, setOuter] = useState({ width: 0, height: 0 });
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const [dockHeight, setDockHeight] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const profileId = meta.get(META_KEYS.activeProfileId);
      if (!profileId) return;
      const rows = game.listTaskProgress(profileId);
      setProgress(rows);
      setSelectedId(
        (current) =>
          current ??
          preferredHubTask(content.tasks, rows)?.id ??
          null,
      );
    }, [content.tasks, game, meta]),
  );

  const [seenFocus, setSeenFocus] = useState<typeof focus>(null);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.kind === "lesson") setSelectedId(focus.taskId);
  }

  const byKey = new Map(progress.map((row) => [row.taskKey, row]));
  const completed = completedTaskIds(progress);
  const openIds = new Set(
    unlockedTasks(content.tasks, completed).map((task) => task.id),
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
  const selected = missions.find((task) => task.id === selectedId) ?? null;

  // Pins sit in % of the map box so they follow the art at any screen width.
  const at = (task: TaskContent) => ({
    x: task.pin?.x ?? 0.5,
    y: task.pin?.y ?? 0.5,
  });
  const pct = (fraction: number): `${number}%` =>
    `${Math.round(fraction * 1000) / 10}%`;

  const pad = spacing.m;
  const cap = dockCap(outer.height, pad);
  const map = containedMapSize(slot.width, slot.height);
  const mapReady = map.width > 0 && map.height > 0;
  const selectedState = selected ? stateOf(selected) : null;
  const showAction = selected != null && selectedState !== "soon";
  const games = selected ? childGames(selected, content.tasks) : [];
  const showExtras = games.length > 0 || corrections.length > 0;
  if (!selected && corrections.length === 0 && dockHeight !== 0) setDockHeight(0);

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setOuter((current) =>
          current.width === width && current.height === height ? current : { width, height },
        );
      }}
    >
      <View style={[styles.column, { padding: pad }]}>
        <ScreenTitle style={styles.title}>{strings.mapTitle}</ScreenTitle>
        <View
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
        <View
          style={[
            styles.map,
            mapReady
              ? {
                  height: map.height,
                  left: (slot.width - map.width) / 2,
                  position: "absolute",
                  top: 0,
                  width: map.width,
                }
              : styles.mapPending,
          ]}
        >
          {/* Explicit width/height: on iOS an absolute-fill Image kept its
              828×1104 intrinsic size and spilled far past the box. */}
          {mapReady ? (
            <Image
              source={MAP_IMAGE}
              style={{ width: map.width, height: map.height }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          {missions.map((task) => {
            const before = missionPrerequisite(task, content.tasks);
            if (!before) return null;
            const from = at(before);
            const to = at(task);
            return Array.from({ length: DOTS }, (_, i) => {
              const t = (i + 1) / (DOTS + 1);
              return (
                <View
                  key={`${task.id}-dot-${i}`}
                  pointerEvents="none"
                  style={[
                    styles.dot,
                    completed.has(before.id) ? styles.dotOpen : null,
                    {
                      left: pct(from.x + (to.x - from.x) * t),
                      top: pct(from.y + (to.y - from.y) * t),
                    },
                  ]}
                />
              );
            });
          })}
          {missions.map((task) => {
            const state = stateOf(task);
            const { x, y } = at(task);
            const isSelected = task.id === selectedId;
            return (
              <Pressable
                key={task.id}
                role="button"
                aria-label={strings.missionPinA11y(task.title, state)}
                aria-selected={isSelected}
                onPress={() => setSelectedId(task.id)}
                hitSlop={(minTarget - PIN) / 2}
                style={[
                  styles.pin,
                  state === "locked" || state === "soon"
                    ? styles.pinLocked
                    : state === "done"
                      ? styles.pinDone
                      : styles.pinOpen,
                  isSelected ? styles.pinSelected : null,
                  { left: pct(x), top: pct(y) },
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
            );
          })}
        </View>
        </View>
        {selected && selectedState ? (
          <LessonDock
            cap={cap}
            onHeight={setDockHeight}
            copy={
              <MissionCopy
                task={selected}
                state={selectedState}
                best={byKey.get(selected.id)?.bestReward ?? 0}
                onMore={() => setDetailsOpen(true)}
              />
            }
            action={
              showAction ? (
                <MissionAction
                  task={selected}
                  state={selectedState}
                  blocker={missionPrerequisite(selected, content.tasks)}
                  onPlay={(taskId) => navigation.navigate("TaskRun", { taskId })}
                  highlighted={
                    focus?.kind === "lesson" &&
                    focus.taskId === selected.id &&
                    selectedState === "open"
                  }
                />
              ) : null
            }
            extras={
              showExtras ? (
                <>
                  {games.length > 0 ? (
                    <GameRow
                      parent={selected}
                      games={games.map((child) => ({ task: child, state: stateOf(child) }))}
                      onPlay={(taskId) => navigation.navigate("TaskRun", { taskId })}
                    />
                  ) : null}
                  <Corrections
                    tasks={corrections}
                    onPlay={(taskId) => navigation.navigate("TaskRun", { taskId })}
                  />
                </>
              ) : null
            }
          />
        ) : corrections.length > 0 ? (
          <View
            style={[styles.dock, cap > 0 ? { maxHeight: cap } : null]}
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.height);
              setDockHeight((current) => (current === next ? current : next));
            }}
          >
            <ScrollView style={[styles.panelScrollFit, cap > 0 ? { maxHeight: cap } : null]} contentContainerStyle={styles.extras}>
              <Corrections
                tasks={corrections}
                onPlay={(taskId) => navigation.navigate("TaskRun", { taskId })}
              />
            </ScrollView>
          </View>
        ) : null}
      </View>
      <FabStack bottom={dockHeight > 0 ? pad + dockHeight + spacing.s : spacing.m}>
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
      {selected ? (
        <MissionDetails
          visible={detailsOpen}
          task={selected}
          state={stateOf(selected)}
          best={byKey.get(selected.id)?.bestReward ?? 0}
          onClose={() => setDetailsOpen(false)}
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

function rememberHeight(current: number, next: number): number {
  const rounded = Math.round(next);
  return current === rounded ? current : rounded;
}

/**
 * Layout events are pooled: `nativeEvent` is null once the handler returns.
 * Read the height here. A state updater runs later and must not touch the event.
 */
function rememberLayout(event: LayoutChangeEvent, setHeight: Dispatch<SetStateAction<number>>) {
  const height = event.nativeEvent?.layout.height;
  if (height == null) return;
  setHeight((current) => rememberHeight(current, height));
}

/**
 * Lesson card under the map. Copy and games scroll once they pass `cap`;
 * «Начать» stays pinned so a long description cannot shrink the map.
 */
export function LessonDock({
  cap,
  copy,
  action,
  extras,
  onHeight,
}: {
  cap: number;
  copy: ReactNode;
  action: ReactNode | null;
  extras: ReactNode | null;
  onHeight: (height: number) => void;
}) {
  const [copyHeight, setCopyHeight] = useState(0);
  const [actionHeight, setActionHeight] = useState(0);
  const [extrasHeight, setExtrasHeight] = useState(0);
  const ready =
    copyHeight > 0 && (action == null || actionHeight > 0) && (extras == null || extrasHeight > 0);
  const natural = naturalDockHeight({
    copyHeight,
    actionHeight: action ? actionHeight : 0,
    extrasHeight: extras ? extrasHeight : 0,
  });
  const overflows = ready && dockOverflows(natural, cap);
  const report = (height: number) => onHeight(Math.round(height));

  const copyBlock = (
    <View
      collapsable={false}
      style={styles.copy}
      onLayout={(event) => rememberLayout(event, setCopyHeight)}
    >
      {copy}
    </View>
  );
  const actionBlock = action ? (
    <View
      collapsable={false}
      style={styles.dockAction}
      onLayout={(event) => rememberLayout(event, setActionHeight)}
    >
      {action}
    </View>
  ) : null;
  const extrasBlock = extras ? (
    <View
      collapsable={false}
      style={styles.extras}
      onLayout={(event) => rememberLayout(event, setExtrasHeight)}
    >
      {extras}
    </View>
  ) : null;

  return (
    <View
      style={[styles.dock, cap > 0 ? { maxHeight: cap } : null, overflows ? { height: cap } : null]}
      onLayout={(event) => report(event.nativeEvent.layout.height)}
    >
      <View style={[styles.panel, overflows ? styles.panelFlex : null]}>
        {/* Scroll content keeps its full height, so a long intro is measured
            even when the dock itself is capped. */}
        <ScrollView
          scrollEnabled={overflows}
          style={overflows ? styles.panelScroll : styles.panelScrollFit}
          contentContainerStyle={extras ? styles.copy : undefined}
        >
          {copyBlock}
          {extrasBlock}
        </ScrollView>
        {actionBlock}
      </View>
    </View>
  );
}

/** Topic, title, intro, and the reward line. The action sits under this. */
function MissionCopy({
  task,
  state,
  best,
  onMore,
}: {
  task: TaskContent;
  state: PinState;
  best: number;
  onMore: () => void;
}) {
  const topic = TOPIC_COPY[task.topic];
  return (
    <>
      <View style={styles.panelRow}>
        <View style={[styles.topicBadge, { backgroundColor: TOPIC_TINT[task.topic] }]}>
          <Pictogram glyph={topic.icon} size={24} />
        </View>
        <View style={styles.panelTitle}>
          <CoinText text={task.title} style={styles.cardTitle} />
          <CoinText text={task.intro} style={styles.body} />
        </View>
        {task.difficulty && state !== "soon" ? <DifficultyMarks level={task.difficulty} /> : null}
      </View>
      <View style={styles.panelRow}>
        <View style={styles.panelReward}>
          {state === "soon" ? (
            <Text style={styles.body}>{strings.missionSoon}</Text>
          ) : state === "done" ? (
            <CoinText coin text={strings.missionRewardBest(best, task.reward)} style={styles.body} />
          ) : (
            <CoinText coin text={strings.missionRewardMax(task.reward)} style={styles.body} />
          )}
        </View>
        {state === "soon" ? null : (
          <Pressable
            role="button"
            aria-label={homeStrings.mapMoreA11y(task.title)}
            onPress={onMore}
            style={styles.more}
          >
            <Text style={styles.moreLabel}>{homeStrings.mapMore}</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

/** «Начать», a replay, or the lock line. Pinned under the scrolling copy. */
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

function Corrections({ tasks, onPlay }: { tasks: TaskContent[]; onPlay: (taskId: string) => void }) {
  if (tasks.length === 0) return null;
  return (
    <>
      <Text style={styles.section}>{strings.missionCorrections}</Text>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          role="button"
          aria-label={task.title}
          onPress={() => onPlay(task.id)}
          style={styles.hit}
        >
          <Card>
            <CoinText text={task.title} style={styles.cardTitle} />
            <CoinText text={task.intro} style={styles.body} />
            <CoinText text={strings.playTask} style={styles.body} />
          </Card>
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

/** Every mini-game, with the Урок it belongs to. Locked until that Урок is done. */
function GamesSheet({
  visible,
  games,
  onClose,
  onPlay,
}: {
  visible: boolean;
  games: { task: TaskContent; state: PinState; parent: TaskContent | null }[];
  onClose: () => void;
  onPlay: (taskId: string) => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{strings.missionGames}</Text>
      <Text style={styles.sheetBody}>{strings.missionGamesLead}</Text>
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

/** «Подробнее»: district, description, and what is left to earn. */
function MissionDetails({
  visible,
  task,
  state,
  best,
  onClose,
}: {
  visible: boolean;
  task: TaskContent;
  state: PinState;
  best: number;
  onClose: () => void;
}) {
  const topic = TOPIC_COPY[task.topic];
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      footer={<PrimaryButton label={strings.gotIt} onPress={onClose} />}
    >
      <CoinText text={task.title} style={styles.sheetTitle} />
      <GlyphLabel
        glyph={topic.icon}
        label={`${topic.title}${task.pin ? ` · ${strings.missionDistrict(task.pin.district)}` : ""}`}
        labelStyle={styles.body}
      />
      {task.description ? <CoinText text={task.description} style={styles.sheetBody} /> : null}
      {state === "done" ? (
        <CoinText coin text={strings.missionRewardLeft(rewardLeft(task, best))} style={styles.body} />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  column: {
    flex: 1,
    gap: spacing.s,
  },
  title: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  section: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
    marginTop: spacing.s,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
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
  dot: {
    backgroundColor: colors.disabledFace,
    borderRadius: 3,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    position: "absolute",
    width: 6,
  },
  dotOpen: {
    backgroundColor: colors.raisedEdge,
  },
  pin: {
    alignItems: "center",
    borderColor: colors.card,
    borderRadius: PIN / 2,
    borderWidth: 3,
    height: PIN,
    justifyContent: "center",
    marginLeft: -PIN / 2,
    marginTop: -PIN / 2,
    position: "absolute",
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
  dock: {
    flexShrink: 1,
    gap: spacing.s,
    width: "100%",
  },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: radius.card,
    borderWidth: PANEL_BORDER,
    gap: spacing.s,
    padding: PANEL_PAD,
  },
  panelFlex: {
    flex: 1,
    minHeight: 0,
  },
  panelScroll: {
    flex: 1,
    minHeight: 0,
  },
  panelScrollFit: {
    flexGrow: 0,
    flexShrink: 0,
  },
  copy: {
    gap: spacing.s,
  },
  dockAction: {
    flexShrink: 0,
  },
  extras: {
    gap: spacing.s,
  },
  panelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  topicBadge: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  panelTitle: {
    flex: 1,
    minWidth: 0,
  },
  panelReward: {
    flex: 1,
    minWidth: 0,
  },
  more: {
    justifyContent: "center",
    minHeight: minTarget,
    paddingHorizontal: spacing.s,
  },
  moreLabel: {
    color: colors.accentText,
    fontSize: type.body,
    fontWeight: "700",
    textDecorationLine: "underline",
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
  hit: {
    minHeight: minTarget,
  },
});
