import { useEffect, useRef, useState, type RefObject } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { STAGE_CODES, STAGE_NAMES, type Stage } from "../../core/stages";
import { useAnimationsOn } from "../motion";
import { PixelIcon } from "./Pictogram";
import { homeStrings } from "../stringsHome";
import { strings } from "../strings";
import type { SpotlightBox } from "../finnyScript";
import { measureSpotlight } from "../measureSpotlight";
import { colors, font, minTarget, modalScrim, spacing } from "../theme";

/** Lip under the tucked card, same press language as a raised button. */
const PEEK_EDGE = 4;

/** Height of the tucked card, including the lip. Дом uses this to clear the overlay. */
export const STAGE_PEEK_HEIGHT = minTarget + PEEK_EDGE;

/** Width / height. A little shorter than ISO/IEC 7810 ID-1 (85.6 / 53.98). */
const CARD_RATIO = 1.8;

/** Новичок is 1, Про is 2, Миллионер is 3. */
const STAGE_TOTAL = 3;

function stageNumber(stage: Stage): number {
  return STAGE_CODES[stage] + 1;
}

function cardSize(width: number) {
  const cardWidth = Math.max(width - spacing.m * 2, minTarget);
  return { cardWidth, cardHeight: cardWidth / CARD_RATIO };
}

function tuckedOffset(width: number) {
  return Math.max(cardSize(width).cardHeight - minTarget, 0);
}

type FaceKind = "sticker" | "club" | "metal";

type Face = {
  background: string;
  band: string;
  ink: string;
  accent: string;
  radius: number;
  fontFamily: string;
  kind: FaceKind;
};

const FACES: Record<Stage, Face> = {
  novice: {
    background: "#7EC8E3",
    band: "#FFF6E4",
    ink: "#14324A",
    accent: "#2B8CB8",
    radius: 28,
    fontFamily: font.novice,
    kind: "sticker",
  },
  pro: {
    background: colors.heroFill,
    band: colors.heroFill,
    ink: "#FFFFFF",
    accent: colors.accent,
    radius: 2,
    fontFamily: font.pro,
    kind: "club",
  },
  millionaire: {
    background: "#141414",
    band: "#141414",
    ink: "#F4E7C5",
    accent: "#C6A36A",
    radius: 14,
    fontFamily: font.millionaire,
    kind: "metal",
  },
};

export function StageCard({
  stage,
  petName,
  goalName,
  goalIcon = "",
  threshold = null,
  accumulated,
  cost,
  open,
  onOpen,
  onClose,
  canPickGoal,
  onPickGoal,
  overlay = false,
  spotlight = false,
  measureRoot,
  onSpotlightBox,
}: {
  stage: Stage;
  petName: string;
  goalName: string;
  goalIcon?: string;
  threshold?: string | null;
  accumulated: number;
  cost: number;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Копилка is open, so an empty card can offer «Выбери цель». */
  canPickGoal: boolean;
  onPickGoal: () => void;
  /** Sit on top of the screen behind, instead of taking a row of its own. */
  overlay?: boolean;
  /** Acquaintance tour is pointing at this card. */
  spotlight?: boolean;
  measureRoot?: RefObject<View | null>;
  onSpotlightBox?: (id: string, box: SpotlightBox) => void;
}) {
  const { width } = useWindowDimensions();
  const face = FACES[stage];
  const name = STAGE_NAMES[stage];
  const number = stageNumber(stage);
  const spoken = spokenGoal(goalName, accumulated, cost, threshold, canPickGoal);
  const label = strings.stageA11y(name, number, STAGE_TOTAL, spoken);
  const { cardHeight } = cardSize(width);
  const motion = useAnimationsOn();
  const [shift] = useState(() => new Animated.Value(tuckedOffset(Dimensions.get("window").width)));
  // A tuck slides the open card back down the way it came; it stays drawn, deaf to taps and the reader, until it lands.
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setClosing(!open && motion);
  }
  const shown = open || closing;
  const goalRef = useRef<View>(null);
  const reportGoal = () => {
    if (!spotlight || !open) return;
    measureSpotlight(goalRef.current, measureRoot?.current ?? null, "goal", onSpotlightBox, face.radius);
  };

  useEffect(() => {
    if (!spotlight || !open) return;
    measureSpotlight(goalRef.current, measureRoot?.current ?? null, "goal", onSpotlightBox, face.radius);
  }, [face.radius, measureRoot, onSpotlightBox, open, spotlight]);

  useEffect(() => {
    if (!open) return;
    if (!motion) {
      shift.setValue(0);
      return;
    }
    shift.setValue(Math.max(cardHeight - minTarget, 0));
    Animated.timing(shift, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [cardHeight, motion, open, shift]);

  useEffect(() => {
    if (!closing) return;
    const tuck = Animated.timing(shift, {
      toValue: Math.max(cardHeight - minTarget, 0),
      duration: 200,
      useNativeDriver: true,
    });
    tuck.start(() => setClosing(false));
    return () => tuck.stop();
  }, [cardHeight, closing, shift]);

  const faceProps = {
    face,
    name,
    number,
    petName,
    goalName,
    goalIcon,
    threshold,
    accumulated,
    cost,
    canPickGoal,
    onPickGoal,
    reserveClose: true,
  };

  return (
    <>
      <Pressable
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? "no-hide-descendants" : "auto"}
        role="button"
        aria-label={label}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.peekShell,
          overlay ? styles.peekOverlay : null,
          { backgroundColor: face.accent, borderRadius: face.radius },
          pressed ? styles.peekPressed : null,
        ]}
      >
        <View style={[styles.peekClip, { borderRadius: face.radius }]}>
          <View style={[styles.face, faceShell(face), { height: cardHeight }]}>
            {/* The tucked face only peeks the title. «Выбери цель» is a control on the open card. */}
            <CardFace {...faceProps} onPickGoal={undefined} />
          </View>
          <PeekCue color={face.ink} />
        </View>
      </Pressable>
      {open ? (
        <Pressable
          role="button"
          aria-label={strings.sheetClose}
          onPress={onClose}
          style={styles.scrim}
        />
      ) : null}
      {shown ? (
        <Animated.View
          aria-hidden={!open}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          pointerEvents={open ? "auto" : "none"}
          testID={open ? undefined : "stage-card-tucking"}
          style={[
            styles.openCard,
            faceShell(face),
            { height: cardHeight, transform: [{ translateY: motion ? shift : 0 }] },
          ]}
        >
          <View
            ref={goalRef}
            collapsable={false}
            onLayout={reportGoal}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <CardFace {...faceProps} />
          <Pressable
            role="button"
            aria-label={strings.close}
            onPress={onClose}
            style={styles.close}
          >
            <Cross color={face.ink} />
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  );
}

/** Up arrow in the slot Закрыть uses once the card is open. It bobs so the strip reads as a pull. */
function PeekCue({ color }: { color: string }) {
  const [nudge] = useState(() => new Animated.Value(0));
  const motion = useAnimationsOn();

  useEffect(() => {
    let stopped = false;
    let loop: Animated.CompositeAnimation | null = null;
    const play = () => {
      loop?.stop();
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(nudge, { toValue: -5, duration: 650, useNativeDriver: true }),
          Animated.timing(nudge, { toValue: 0, duration: 650, useNativeDriver: true }),
        ]),
      );
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
      nudge.setValue(0);
    };
    if (!motion) {
      stop();
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!stopped && !reduce) play();
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduce) => {
      if (reduce) stop();
      else play();
    });
    return () => {
      stopped = true;
      stop();
      subscription.remove();
    };
  }, [motion, nudge]);

  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.peekCue, { transform: [{ translateY: motion ? nudge : 0 }] }]}
    >
      <PixelIcon name="arrow-up" size={22} color={color} />
    </Animated.View>
  );
}

function spokenGoal(
  goalName: string,
  accumulated: number,
  cost: number,
  threshold: string | null,
  canPickGoal: boolean,
): string {
  if (goalName && cost > 0) {
    const progress = homeStrings.goalA11y(goalName, accumulated, cost);
    return threshold ? `${progress}. ${threshold}` : progress;
  }
  if (!canPickGoal) return "";
  return threshold ? `${strings.goalEmptyPrompt}. ${threshold}` : strings.goalEmptyPrompt;
}

function faceShell(face: Face) {
  return {
    backgroundColor: face.background,
    borderColor: face.accent,
    borderRadius: face.radius,
    borderWidth: face.kind === "metal" ? 1 : 0,
  };
}

/** The full Этап card, already open. Итоги shows this; the play shell peeks the same face. */
export function StageCardPlate({
  stage,
  petName,
  goalName,
  goalIcon = "",
  threshold = null,
  accumulated,
  cost,
}: {
  stage: Stage;
  petName: string;
  goalName: string;
  goalIcon?: string;
  threshold?: string | null;
  accumulated: number;
  cost: number;
}) {
  const face = FACES[stage];
  const name = STAGE_NAMES[stage];
  const number = stageNumber(stage);
  const spoken = spokenGoal(goalName, accumulated, cost, threshold, true);

  return (
    <View
      accessible
      accessibilityLabel={strings.stageA11y(name, number, STAGE_TOTAL, spoken)}
      style={[styles.plateCard, faceShell(face)]}
    >
      <CardFace
        face={face}
        name={name}
        number={number}
        petName={petName}
        goalName={goalName}
        goalIcon={goalIcon}
        threshold={threshold}
        accumulated={accumulated}
        cost={cost}
        canPickGoal
        reserveClose={false}
      />
    </View>
  );
}

function CardFace({
  face,
  name,
  number,
  petName,
  goalName,
  goalIcon,
  threshold,
  accumulated,
  cost,
  canPickGoal,
  onPickGoal,
  reserveClose,
}: {
  face: Face;
  name: string;
  number: number;
  petName: string;
  goalName: string;
  goalIcon: string;
  threshold: string | null;
  accumulated: number;
  cost: number;
  canPickGoal: boolean;
  onPickGoal?: () => void;
  reserveClose: boolean;
}) {
  const hasGoal = goalName.length > 0 && cost > 0;
  const ink = { color: face.ink, fontFamily: face.fontFamily };

  return (
    <View style={styles.face}>
      <View style={[styles.band, reserveClose ? null : styles.bandOpen, { backgroundColor: face.band }]}>
        <StageMarks face={face} number={number} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.title, ink]}>
          {name}
        </Text>
      </View>
      <View style={styles.plate}>
        <View style={styles.chipRow}>
          <Chip sharp={face.kind === "club"} />
          <Contactless color={face.ink} />
        </View>
        <View style={styles.footer}>
          <View style={styles.identity}>
            <View style={styles.goalPair}>
              {hasGoal ? (
                <Text numberOfLines={1} style={[styles.pan, ink]}>
                  {strings.goalRatio(accumulated, cost)}
                </Text>
              ) : null}
              {hasGoal ? (
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.holder, ink]}>
                  {`${goalIcon ? `${goalIcon} ` : ""}${goalName}`}
                </Text>
              ) : canPickGoal && onPickGoal ? (
                <Pressable
                  role="button"
                  aria-label={strings.goalEmptyPrompt}
                  onPress={onPickGoal}
                  style={({ pressed }) => [pressed ? styles.promptPressed : null]}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.holder, ink]}>
                    {strings.goalEmptyPrompt}
                  </Text>
                </Pressable>
              ) : canPickGoal ? (
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.holder, ink]}>
                  {strings.goalEmptyPrompt}
                </Text>
              ) : null}
              {threshold ? (
                <Text numberOfLines={1} style={[styles.threshold, ink]}>
                  {threshold}
                </Text>
              ) : null}
            </View>
            {petName ? (
              <Text numberOfLines={1} style={[styles.emboss, ink]}>
                {petName}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.logo, { color: face.ink }]}>{strings.appName}</Text>
        </View>
      </View>
    </View>
  );
}

function StageMarks({ face, number }: { face: Face; number: number }) {
  return (
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.marks}>
      {([1, 2, 3] as const).map((step) => (
        <View
          key={step}
          style={[
            styles.dot,
            {
              backgroundColor: step <= number ? face.ink : "transparent",
              borderColor: face.ink,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Gold contact module. The grid is the pads a terminal reads. */
function Chip({ sharp }: { sharp: boolean }) {
  return (
    <View aria-hidden style={[styles.chip, sharp ? styles.chipSharp : null]}>
      <View style={styles.chipSpine} />
      <View style={[styles.chipBar, styles.chipBarHigh]} />
      <View style={[styles.chipBar, styles.chipBarLow]} />
    </View>
  );
}

/** Four arcs on the right of the card — the contactless mark. */
const WAVE_RADII = [7, 12, 17, 22] as const;

function Contactless({ color }: { color: string }) {
  const originX = 2;
  const originY = 30;
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.contactless}
    >
      <Svg width={26} height={32} viewBox="0 0 26 32">
        {WAVE_RADII.map((radius) => (
          <Path
            key={radius}
            d={`M${originX} ${originY - radius} A ${radius} ${radius} 0 0 1 ${originX + radius} ${originY}`}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.75}
          />
        ))}
      </Svg>
    </View>
  );
}

function Cross({ color }: { color: string }) {
  return (
    <View aria-hidden style={styles.cross}>
      <View style={[styles.crossBar, { backgroundColor: color, transform: [{ rotate: "45deg" }] }]} />
      <View style={[styles.crossBar, { backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  peekShell: {
    marginHorizontal: spacing.m,
    paddingBottom: PEEK_EDGE,
  },
  peekOverlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  peekPressed: {
    paddingBottom: 0,
    paddingTop: PEEK_EDGE,
  },
  peekClip: {
    height: minTarget,
    overflow: "hidden",
  },
  peekCue: {
    alignItems: "center",
    height: minTarget,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: minTarget,
  },
  face: {
    flex: 1,
    overflow: "hidden",
  },
  plateCard: {
    aspectRatio: CARD_RATIO,
    overflow: "hidden",
    width: "100%",
  },
  band: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    height: minTarget,
    paddingLeft: spacing.m,
    paddingRight: minTarget,
  },
  bandOpen: {
    paddingRight: spacing.m,
  },
  marks: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.s,
  },
  dot: {
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "400",
  },
  plate: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.m,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pan: {
    fontSize: 22,
    fontWeight: "400",
    letterSpacing: 4,
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.s,
  },
  identity: {
    flex: 1,
  },
  goalPair: {
    gap: 2,
  },
  holder: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: 1,
  },
  promptPressed: {
    opacity: 0.7,
  },
  threshold: {
    fontSize: 16,
    fontWeight: "400",
  },
  emboss: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 2,
    marginTop: spacing.s,
    textTransform: "uppercase",
  },
  logo: {
    flexShrink: 0,
    fontFamily: font.pixel,
    fontSize: 12,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 16,
  },
  chip: {
    backgroundColor: "#E4C56A",
    borderColor: "#7A5A28",
    borderRadius: 5,
    borderWidth: 1.5,
    height: 32,
    overflow: "hidden",
    width: 42,
  },
  chipSharp: {
    borderRadius: 0,
  },
  chipSpine: {
    backgroundColor: "#7A5A28",
    bottom: 0,
    left: "48%",
    position: "absolute",
    top: 0,
    width: 1.5,
  },
  chipBar: {
    backgroundColor: "#7A5A28",
    height: 1.5,
    left: 0,
    position: "absolute",
    right: 0,
  },
  chipBarHigh: {
    top: "34%",
  },
  chipBarLow: {
    top: "66%",
  },
  contactless: {
    height: 32,
    width: 26,
  },
  scrim: {
    backgroundColor: modalScrim,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  openCard: {
    bottom: 0,
    left: spacing.m,
    overflow: "hidden",
    position: "absolute",
    right: spacing.m,
  },
  close: {
    alignItems: "center",
    height: minTarget,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: minTarget,
  },
  cross: {
    height: 18,
    width: 18,
  },
  crossBar: {
    borderRadius: 1,
    height: 2,
    left: 0,
    position: "absolute",
    top: 8,
    width: 18,
  },
});
