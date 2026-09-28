import { useEffect, useRef, type RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePlayChrome, type TaskFocus } from "../navigation/playChrome";
import type { RootStackParamList } from "../navigation/types";
import { META_KEYS } from "../../data/metaKeys";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { currentTaskLabel, resolveCurrentTask } from "../tasks/resolveCurrentTask";
import { colors, font, minTarget, radius, spacing, type } from "../theme";
import { CoinAmount } from "./CoinText";
import { MeterBar } from "./MeterBar";
import { PixelSprite } from "./PixelSprite";
import { PixelIcon } from "./Pictogram";
import type { PixelIconName } from "../pixelIconXml";
import type { SpotlightBox, TourSpotlight } from "../finnyScript";
import { measureSpotlight } from "../measureSpotlight";

/** One pixel icon per kind of Текущая задача. */
const TASK_ICON: Record<NonNullable<ReturnType<typeof resolveCurrentTask>>["kind"], PixelIconName> = {
  "set-goal": "target",
  "buy-goal": "star",
  "confirm-plan": "clipboard",
  "buy-bills": "shopping-cart",
  lesson: "map",
};

const EDGE = 4;

/** Balance digits at full size; a longer balance shrinks the font instead of clipping. */
const BALANCE_FULL_DIGITS = 4;
const BALANCE_FONT = 16;

export function balanceFontSize(balance: number): number {
  const length = String(balance).length;
  if (length <= BALANCE_FULL_DIGITS) return BALANCE_FONT;
  return Math.max(10, Math.floor((BALANCE_FONT * BALANCE_FULL_DIGITS) / length));
}

function openTask(
  task: NonNullable<ReturnType<typeof resolveCurrentTask>>,
  chrome: {
    navigation: NativeStackNavigationProp<RootStackParamList>;
    setTab: (tab: "home" | "map" | "money") => void;
    setMoney: (section: "savings" | "plan" | "journal" | "bank") => void;
    setFocus: (focus: TaskFocus) => void;
  },
) {
  if (task.kind === "buy-bills") {
    chrome.setFocus({ kind: "shop-bills" });
    chrome.navigation.navigate("Shop");
    return;
  }
  if (task.kind === "lesson") {
    chrome.setTab("map");
    chrome.setFocus({ kind: "lesson", taskId: task.taskId });
    chrome.navigation.navigate("Main");
    return;
  }
  if (task.kind === "buy-goal") {
    chrome.setTab("money");
    chrome.setMoney("savings");
    chrome.setFocus({ kind: "buy-goal" });
    chrome.navigation.navigate("Main");
    return;
  }
  chrome.setTab("money");
  chrome.setMoney(task.kind === "confirm-plan" ? "plan" : "savings");
  chrome.setFocus(task.kind === "confirm-plan" ? { kind: "plan" } : { kind: "goal" });
  chrome.navigation.navigate("Main");
}

export function StatusStrip({
  spotlight,
  measureRoot,
  onSpotlightBox,
}: {
  spotlight?: TourSpotlight | null;
  measureRoot?: RefObject<View | null>;
  onSpotlightBox?: (id: string, box: SpotlightBox) => void;
}) {
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { revision, setTab, setMoney, focus, setFocus } = usePlayChrome();
  const { game, meta, content } = useSession();
  const profileId = meta.get(META_KEYS.activeProfileId);
  void revision;
  const profile = profileId ? game.getProfile(profileId) : null;
  const task = profileId && profile ? resolveCurrentTask(game, content, profileId) : null;
  const walletRef = useRef<View>(null);
  const healthRef = useRef<View>(null);
  const happinessRef = useRef<View>(null);
  const reportMark = (id: "wallet" | "health" | "happiness", node: View | null) => {
    if (spotlight !== id) return;
    measureSpotlight(node, measureRoot?.current ?? null, id, onSpotlightBox, radius.card);
  };

  useEffect(() => {
    const root = measureRoot?.current ?? null;
    if (spotlight === "wallet") measureSpotlight(walletRef.current, root, "wallet", onSpotlightBox, radius.card);
    if (spotlight === "health") measureSpotlight(healthRef.current, root, "health", onSpotlightBox, radius.card);
    if (spotlight === "happiness") measureSpotlight(happinessRef.current, root, "happiness", onSpotlightBox, radius.card);
  }, [measureRoot, onSpotlightBox, spotlight]);

  useEffect(() => {
    if (!focus) return;
    const matches =
      (task?.kind === "set-goal" && focus.kind === "goal") ||
      (task?.kind === "buy-goal" && focus.kind === "buy-goal") ||
      (task?.kind === "confirm-plan" && focus.kind === "plan") ||
      (task?.kind === "buy-bills" && focus.kind === "shop-bills") ||
      (task?.kind === "lesson" && focus.kind === "lesson" && focus.taskId === task.taskId);
    if (!matches) setFocus(null);
  }, [focus, setFocus, task]);

  if (!focused || !profile) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.status}>
        <Pressable
          ref={walletRef}
          collapsable={false}
          onLayout={() => reportMark("wallet", walletRef.current)}
          role="button"
          aria-label={strings.balanceBadge(profile.balance)}
          aria-selected={spotlight === "wallet" ? true : undefined}
          onPress={() => {
            setTab("money");
            navigation.navigate("Main");
          }}
          style={({ pressed }) => [styles.balance, pressed ? styles.balancePressed : null]}
        >
          <CoinAmount
            hidden
            value={profile.balance}
            style={[styles.balanceValue, { fontSize: balanceFontSize(profile.balance) }]}
            size={24}
          />
        </Pressable>
        <Pressable
          role="button"
          aria-label={strings.settings}
          onPress={() => navigation.navigate("Settings")}
          style={({ pressed }) => [styles.settingsShell, pressed ? styles.settingsPressed : null]}
        >
          <View style={styles.settingsFace}>
            <PixelSprite name="gear" size={28} />
          </View>
        </Pressable>
      </View>
      <View style={styles.meters}>
        <MeterBar
          compact
          marked={spotlight === "health"}
          measureRef={healthRef}
          onMeasure={() => reportMark("health", healthRef.current)}
          sprite="food"
          icon={strings.careIcon}
          label={strings.care}
          value={profile.care}
        />
        <MeterBar
          compact
          marked={spotlight === "happiness"}
          measureRef={happinessRef}
          onMeasure={() => reportMark("happiness", happinessRef.current)}
          sprite="mood"
          icon={strings.moodIcon}
          label={strings.mood}
          value={profile.mood}
        />
      </View>
      {task ? (
        <Pressable
          role="button"
          aria-label={currentTaskLabel(task, content)}
          onPress={() => openTask(task, { navigation, setTab, setMoney, setFocus })}
          style={({ pressed }) => [styles.task, pressed ? styles.taskPressed : null]}
        >
          <View aria-hidden style={styles.taskBadge}>
            <PixelIcon name={TASK_ICON[task.kind]} size={24} color={colors.onRaised} />
          </View>
          <View aria-hidden style={styles.taskText}>
            <Text style={styles.taskCaption}>{strings.currentTaskCaption}</Text>
            <Text style={styles.taskLabel} numberOfLines={2}>
              {currentTaskLabel(task, content).replace(/^Текущая задача: /, "")}
            </Text>
          </View>
          <View aria-hidden style={styles.taskGo}>
            <PixelIcon name="arrow-right" size={20} color={colors.onRaised} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  status: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  meters: {
    flexDirection: "row",
    gap: spacing.m,
  },
  task: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomWidth: 4,
    borderColor: colors.accent,
    borderRadius: radius.card,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget + 8,
    paddingHorizontal: spacing.s,
    paddingVertical: 6,
  },
  taskPressed: {
    borderBottomWidth: 2,
    marginTop: 2,
  },
  taskBadge: {
    alignItems: "center",
    backgroundColor: colors.raisedFace,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  taskText: {
    flex: 1,
  },
  taskCaption: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  taskLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  taskGo: {
    alignItems: "center",
    backgroundColor: colors.raisedFace,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  balance: {
    alignItems: "center",
    backgroundColor: colors.badgeFill,
    borderRadius: radius.card,
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.s,
    height: minTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.m,
  },
  balancePressed: {
    opacity: 0.7,
  },
  balanceValue: {
    color: colors.text,
    fontFamily: font.pixel,
    fontSize: 16,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 24,
    textAlignVertical: "center",
  },
  settingsShell: {
    backgroundColor: colors.raisedEdge,
    borderRadius: minTarget / 2,
    marginLeft: "auto",
    paddingBottom: EDGE,
  },
  settingsPressed: {
    paddingBottom: 0,
    paddingTop: EDGE,
  },
  settingsFace: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: minTarget / 2,
    height: minTarget - EDGE,
    justifyContent: "center",
    width: minTarget,
  },
});
