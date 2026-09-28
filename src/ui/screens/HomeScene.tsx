import { useEffect, useRef, useState, type Ref } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Fab, FabStack } from "../components/Fab";
import { PixelIcon } from "../components/Pictogram";
import { PixelSprite } from "../components/PixelSprite";
import { useLatest } from "../components/useLatest";
import { LivingPet } from "../pet/LivingPet";
import { strings } from "../strings";
import { homeStrings } from "../stringsHome";
import { shopStrings } from "../stringsShop";
import { colors, font, minTarget, radius, spacing } from "../theme";
import { nextSpeechLine, speechMood, speechPool } from "./petSpeech";

/** Before the first layout pass (and in jest, which never lays out). */
const FALLBACK_PET = 240;
/** Floor band, as a share of the scene height. */
const FLOOR_SHARE = 0.3;
/** How long a pet line stays up. */
const SPEECH_MS = 3500;
/** Quiet gap before the pet starts the next line on its own. */
const QUIET_MS = 8000;
/** Window on the left wall: its bottom edge above the floor, and its side. */
const WINDOW_LIFT = spacing.l + 96;
/** One narrow wooden shelf on the right wall: three cells stacked. */
const SHELF_WIDTH = 48;
const SHELF_HEIGHT = 132;
const SHELF_CELLS = 3;
/** Info mark is 32 dp; slop keeps the tap at the 48 dp minimum. */
const DAY_INFO_SLOP = (minTarget - 32) / 2;

export type HomePet = {
  species: string;
  color: string;
  accessory: string;
  petName: string;
  care: number;
  mood: number;
};

/** Press Start 2P is monospaced: every glyph is one em wide. */
const DAY_FONT = 12;

/** Room for the whole «День N» label so it is never cut, whatever the goal chip needs. */
function dayLabelWidth(label: string): number {
  return Math.ceil(label.length * DAY_FONT + 2);
}

/**
 * Главная like «Говорящий Том»: the pet stands big in a pixel room, the day and
 * the Цель float as small pills on top. Магазин and Итоги are round buttons
 * just under that row, and Подарок sits bottom-left
 * while an Ежедневный подарок is waiting. Nothing scrolls.
 */
export function HomeScene({
  pet,
  day,
  waiting,
  goalName,
  goalIcon = "",
  threshold = null,
  accumulated,
  cost,
  canPickGoal = false,
  onPickGoal,
  onShop,
  onResults,
  giftReady = false,
  onGift,
  dayTip,
  onDayTip,
  dropRef,
  onDropLayout,
  bottomInset = 0,
  active = true,
  quiet = false,
  random,
}: {
  pet: HomePet;
  day: number;
  waiting: boolean;
  goalName: string;
  goalIcon?: string;
  threshold?: string | null;
  accumulated: number;
  cost: number;
  /** Копилка is open, so the Цель pill can open «Выбери цель». */
  canPickGoal?: boolean;
  onPickGoal?: () => void;
  onShop: () => void;
  onResults: () => void;
  /** An Ежедневный подарок can be taken today. */
  giftReady?: boolean;
  onGift?: () => void;
  /** «День N» explanation is open. The screen behind owns the tap-outside catcher. */
  dayTip: boolean;
  onDayTip: (open: boolean) => void;
  /** Anchor for the tap shield that keeps the explanation from closing itself. */
  dropRef?: Ref<View>;
  onDropLayout?: () => void;
  /** Space the pet and buttons leave at the bottom for the overlaid Этап card. */
  bottomInset?: number;
  /** Дом is on screen. False pauses the pet's animation timers. */
  active?: boolean;
  /** Acquaintance tour is speaking, so the pet stays quiet. */
  quiet?: boolean;
  /** Test seam for the pet's idle choices. */
  random?: () => number;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  // Bottom of Магазин / Итоги in scene space; the shelf stays clear of them and the HUD.
  const [actionsBottom, setActionsBottom] = useState(0);
  const [said, setLine] = useState<string | null>(null);
  // Speech pauses with the pet: nothing hangs in the air while Дом is hidden or the tour speaks.
  const line = active && !quiet ? said : null;
  const speech = useLatest({
    input: { care: pet.care, mood: pet.mood, goalName, accumulated, cost, canPickGoal },
    random: random ?? Math.random,
  });
  const lineRef = useRef<string | null>(null);
  const showRef = useRef<() => void>(() => {});
  const mood = speechMood(pet.care, pet.mood);

  // Speech pauses with the pet while Дом is not on screen.
  useEffect(() => {
    if (!active || quiet) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;

    const show = () => {
      const pool = speechPool({ ...speech.current.input, hour: new Date().getHours() });
      // Each visit (and each change of mood) opens with that mood's first line.
      const next = first ? (pool[0] ?? null) : nextSpeechLine(pool, lineRef.current, speech.current.random);
      first = false;
      lineRef.current = next;
      setLine(next);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (cancelled) return;
        setLine(null);
        timer = setTimeout(() => {
          if (!cancelled) show();
        }, QUIET_MS);
      }, SPEECH_MS);
    };

    showRef.current = show;
    show();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, quiet, mood, speech]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const measured = box.width > 0 && box.height > 0;
  // Snap to 8 px so the pixel art scales by whole steps.
  const petSize = measured
    ? Math.max(120, Math.floor(Math.min(box.width * 0.68, box.height * 0.56) / 8) * 8)
    : FALLBACK_PET;
  const floorHeight = measured ? Math.round(box.height * FLOOR_SHARE) : 160;
  const petBottom = Math.round(floorHeight * 0.35) + bottomInset;
  // Nudge left so the pet's head clears Магазин and Итоги at the top-right.
  // With Подарок on the bottom-left as well, leave the pet centered between the sides.
  const petLeft = measured
    ? Math.max(spacing.s, Math.round((box.width - petSize) / 2 - (giftReady ? 0 : spacing.l)))
    : undefined;

  const say = () => showRef.current();

  // The open «День N» note pushes the buttons down for a moment; the shelf keeps its place.
  const onActionsLayout = (event: LayoutChangeEvent) => {
    if (dayTip) return;
    const { y, height } = event.nativeEvent.layout;
    const bottom = Math.round(spacing.m + y + height); // styles.hud.top
    setActionsBottom((current) => (current === bottom ? current : bottom));
  };
  const shelfBottom = floorHeight + WINDOW_LIFT;
  const shelfTop = box.height - shelfBottom - SHELF_HEIGHT;
  // Short scenes (small phones, big Этап card) have no wall for it: leave it out rather than overlap.
  const showShelf = measured && actionsBottom > 0 && shelfTop >= actionsBottom + spacing.s && shelfBottom >= bottomInset;

  const progress = cost > 0 ? Math.max(0, Math.min(1, accumulated / cost)) : 0;
  const goalLabel = `${homeStrings.goalA11y(goalName, accumulated, cost)}${threshold ? `. ${threshold}` : ""}`;
  const goalBody = (
    <>
      <View style={styles.goalRow}>
        {goalIcon ? (
          <Text aria-hidden style={styles.goalEmoji}>
            {goalIcon}
          </Text>
        ) : (
          <PixelIcon name="star" size={16} color={colors.accentText} />
        )}
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.goalTitle}>
          {goalName}
        </Text>
        <Text style={styles.goalRatio}>{strings.goalRatio(accumulated, cost)}</Text>
        <PixelSprite name="coin" size={14} />
      </View>
      <View style={styles.goalTrack}>
        <View style={[styles.goalFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {threshold ? (
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.goalThreshold}>
          {threshold}
        </Text>
      ) : null}
    </>
  );

  return (
    <View testID="home-scene" style={styles.scene} onLayout={onLayout}>
      {/* Room: wall, window, shelf, skirting board, floor planks. Pure decoration. */}
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <View style={[styles.wall, { bottom: floorHeight }]} />
        <View style={[styles.window, { bottom: floorHeight + WINDOW_LIFT }]}>
          <View style={styles.pane}>
            <View style={styles.sun} />
          </View>
          <View style={styles.pane} />
          <View style={styles.pane} />
          <View style={styles.pane} />
        </View>
        {showShelf ? (
          <View testID="home-shelf" style={[styles.shelf, { bottom: shelfBottom }]}>
            {Array.from({ length: SHELF_CELLS }, (_, index) => (
              <View key={index} style={styles.shelfCell} />
            ))}
          </View>
        ) : null}
        <View style={[styles.floor, { height: floorHeight }]}>
          <View style={styles.skirting} />
          <View style={styles.plank} />
          <View style={styles.plank} />
          <View style={styles.plank} />
        </View>
      </View>

      <LivingPet
        pet={pet}
        size={petSize}
        homeLeft={petLeft}
        homeBottom={petBottom}
        sceneWidth={box.width}
        sceneHeight={box.height}
        active={active}
        talkLabel={homeStrings.petTalk(pet.petName)}
        onTap={say}
        random={random}
        bubble={
          line ? (
            <Pressable
              role="button"
              aria-label={line}
              accessibilityHint={homeStrings.petBubbleHint}
              accessibilityLiveRegion="polite"
              hitSlop={8}
              onPress={say}
              style={styles.bubble}
            >
              <Text style={styles.bubbleText}>{line}</Text>
              <View aria-hidden style={styles.bubbleTail} />
            </Pressable>
          ) : null
        }
      />

      <View pointerEvents="box-none" style={styles.hud}>
        <View style={styles.hudRow}>
          <View style={styles.dayPill}>
            <Text numberOfLines={1} style={[styles.dayText, { minWidth: dayLabelWidth(strings.journalDay(day)) }]}>
              {strings.journalDay(day)}
            </Text>
            <Pressable
              role="button"
              aria-label={shopStrings.dailyDropHint}
              accessibilityState={{ expanded: dayTip }}
              hitSlop={DAY_INFO_SLOP}
              onPress={() => onDayTip(!dayTip)}
              style={styles.dayInfo}
            >
              <PixelIcon name="info-box" size={16} color={colors.card} />
            </Pressable>
          </View>
          {goalName ? (
            canPickGoal ? (
              <Pressable
                role="button"
                aria-label={goalLabel}
                hitSlop={4}
                onPress={onPickGoal}
                style={({ pressed }) => [styles.goal, pressed ? styles.goalPressed : null]}
              >
                {goalBody}
              </Pressable>
            ) : (
              <View accessible aria-label={goalLabel} style={styles.goal}>
                {goalBody}
              </View>
            )
          ) : canPickGoal ? (
            <Pressable
              role="button"
              aria-label={strings.goalEmptyPrompt}
              hitSlop={4}
              onPress={onPickGoal}
              style={({ pressed }) => [styles.goal, pressed ? styles.goalPressed : null]}
            >
              <View style={styles.goalRow}>
                <PixelIcon name="star" size={16} color={colors.accentText} />
                <Text numberOfLines={1} style={styles.goalTitle}>
                  {strings.goalEmptyPrompt}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        {dayTip ? (
          <View ref={dropRef} onLayout={onDropLayout} style={styles.drop}>
            <Text style={styles.dropText}>{shopStrings.dailyRule}</Text>
          </View>
        ) : null}
        {waiting ? (
          <View style={styles.hudRow}>
            <View style={[styles.pill, styles.pillWaiting]}>
              <PixelIcon name="clock" size={16} color={colors.subtle} />
              <Text style={styles.pillText}>{strings.waitingBanner}</Text>
            </View>
          </View>
        ) : null}
        <View testID="home-actions" pointerEvents="box-none" onLayout={onActionsLayout} style={styles.actionRow}>
          <Fab
            label={strings.navShop}
            icon={<PixelIcon name="shopping-cart" size={32} color={waiting ? colors.subtle : colors.onRaised} />}
            disabled={waiting}
            accessibilityHint={waiting ? strings.waitingEconomyHint : undefined}
            onPress={onShop}
          />
          <Fab
            label={strings.tabResults}
            icon={<PixelIcon name="clipboard" size={32} color={colors.onRaised} />}
            onPress={onResults}
          />
        </View>
      </View>

      {giftReady && onGift ? (
        <FabStack side="left" bottom={spacing.m + bottomInset}>
          <Fab
            label={homeStrings.giftButton}
            icon={<PixelIcon name="gift" size={32} color={colors.onRaised} />}
            onPress={onGift}
          />
        </FabStack>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.track,
    flex: 1,
    overflow: "hidden",
  },
  wall: {
    backgroundColor: colors.track,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  window: {
    backgroundColor: colors.raisedEdge,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    height: 92,
    left: spacing.l,
    padding: 4,
    position: "absolute",
    width: 92,
  },
  pane: {
    backgroundColor: colors.card,
    height: 38,
    overflow: "hidden",
    width: 38,
  },
  sun: {
    backgroundColor: colors.accent,
    height: 12,
    left: 6,
    position: "absolute",
    top: 6,
    width: 12,
  },
  shelf: {
    backgroundColor: colors.raisedEdge,
    gap: 4,
    height: SHELF_HEIGHT,
    padding: 4,
    position: "absolute",
    right: spacing.l + spacing.m,
    width: SHELF_WIDTH,
  },
  shelfCell: {
    backgroundColor: colors.card,
    flex: 1,
  },
  floor: {
    backgroundColor: colors.badgeFill,
    bottom: 0,
    gap: spacing.l,
    left: 0,
    position: "absolute",
    right: 0,
  },
  skirting: {
    backgroundColor: colors.raisedEdge,
    height: 8,
  },
  plank: {
    backgroundColor: colors.accent,
    height: 4,
    opacity: 0.5,
  },
  bubble: {
    backgroundColor: colors.card,
    borderColor: colors.raisedEdge,
    borderRadius: 12,
    borderWidth: 3,
    marginBottom: 6,
    maxWidth: 240,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  bubbleText: {
    color: colors.text,
    fontFamily: font.pixel,
    fontSize: 12,
    fontWeight: "400",
    includeFontPadding: false,
    // Press Start 2P draws a whole em above the baseline; the extra room keeps Й and Ё clear of the line above.
    lineHeight: 20,
    textAlign: "center",
  },
  bubbleTail: {
    alignSelf: "center",
    backgroundColor: colors.card,
    borderBottomColor: colors.raisedEdge,
    borderBottomWidth: 3,
    borderRightColor: colors.raisedEdge,
    borderRightWidth: 3,
    bottom: -9,
    height: 14,
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 14,
  },
  hud: {
    gap: spacing.s,
    left: spacing.m,
    position: "absolute",
    right: spacing.m,
    top: spacing.m,
  },
  actionRow: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: spacing.m,
  },
  hudRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  dayPill: {
    alignItems: "center",
    backgroundColor: colors.raisedEdge,
    borderRadius: 10,
    flexDirection: "row",
    flexShrink: 0,
    minHeight: 36,
    paddingLeft: spacing.s,
    paddingRight: 2,
  },
  dayInfo: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  dayText: {
    color: colors.card,
    flexShrink: 0,
    fontFamily: font.pixel,
    fontSize: DAY_FONT,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 20,
  },
  drop: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: radius.card,
    maxWidth: "100%",
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  dropText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  goalPressed: {
    opacity: 0.7,
  },
  goal: {
    backgroundColor: colors.card,
    borderColor: colors.disabledFace,
    borderRadius: 10,
    borderWidth: 2,
    flex: 1,
    flexShrink: 1,
    gap: 4,
    minHeight: 40,
    minWidth: 0,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  goalRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  goalTitle: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 0,
  },
  goalEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  goalThreshold: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  goalRatio: {
    color: colors.text,
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "700",
  },
  goalTrack: {
    backgroundColor: colors.track,
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
  },
  goalFill: {
    backgroundColor: colors.fill,
    height: 8,
  },
  pill: {
    alignItems: "center",
    borderRadius: radius.card,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.m,
  },
  pillWaiting: {
    backgroundColor: colors.card,
  },
  pillText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
