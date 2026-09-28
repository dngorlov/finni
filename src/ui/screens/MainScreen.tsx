import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { DailyRewardCell } from "../../core/dailyReward";
import { BANK, FEATURES } from "../../core/config";
import { META_KEYS } from "../../data/metaKeys";
import type { DayState, ProfileView, SavingsView } from "../../data/repositories/gameRepository";
import { AccessoryUnlockCard } from "../components/AccessoryUnlockCard";
import { GoalPicker } from "../components/GoalPicker";
import { PixelSprite } from "../components/PixelSprite";
import { FeedbackCard, type FeedbackModel } from "../components/FeedbackCard";
import { Screen } from "../components/Screen";
import { STAGE_PEEK_HEIGHT, StageCard } from "../components/StageCard";
import { StatusStrip } from "../components/StatusStrip";
import type { MoneySection } from "../navigation/playChrome";
import { usePlayChrome } from "../navigation/playChrome";
import type { RootStackParamList } from "../navigation/types";
import { goalFace } from "../goalLabel";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { shopStrings } from "../stringsShop";
import { completedTaskIds } from "../tasks/model";
import { moneyStrings } from "../stringsMoney";
import { finnyScript, nextTourStep, tourStep, type SpotlightBox } from "../finnyScript";
import { measureSpotlight } from "../measureSpotlight";
import { colors, minTarget, spacing, type } from "../theme";
import BankScreen from "./BankScreen";
import { DailyRewardCalendar, DailyRewardGot } from "./DailyRewardSheet";
import { FinnyTour } from "./FinnyTour";
import { HomeScene } from "./HomeScene";
import { PillRow } from "./moneyParts";
import { TabPane, useTabFade } from "./TabPane";
import { JournalPanel } from "./progressPanels";
import PlanScreen from "./PlanScreen";
import SavingsScreen from "./SavingsScreen";
import TaskListScreen from "./TaskListScreen";

type Props = NativeStackScreenProps<RootStackParamList, "Main">;

type HubModel = {
  profile: ProfileView;
  savings: SavingsView;
  day: DayState;
  goalName: string;
  goalIcon: string;
  threshold: string | null;
  accumulated: number;
  cost: number;
  remaining: number;
  savingsOpen: boolean;
  planOpen: boolean;
  bankOpen: boolean;
  giftReady: boolean;
  giftCells: DailyRewardCell[];
};

const MONEY_OPTIONS: { id: MoneySection; label: string }[] = [
  { id: "savings", label: strings.navSavings },
  { id: "plan", label: strings.navPlan },
  { id: "journal", label: strings.tabJournal },
  { id: "bank", label: strings.navBank },
];

/**
 * The Аксессуар waiting for its card, held back while a Достижение modal is
 * still up so the two celebrations come one after the other.
 */
function useAccessoryUnlock(profileId: string | null) {
  const { game } = useSession();
  const subscribe = useCallback(
    (listener: () => void) => (profileId ? game.subscribe(listener) : () => {}),
    [game, profileId],
  );
  const read = useCallback(() => {
    if (!profileId) return null;
    try {
      if (game.listAchievements(profileId).some((row) => !row.celebrated)) return null;
      return game.accessoryUnlock(profileId);
    } catch {
      return null;
    }
  }, [game, profileId]);
  return useSyncExternalStore(subscribe, read, read);
}

export default function MainScreen({ navigation }: Props) {
  const { game, meta, content } = useSession();
  const focused = useIsFocused();
  const { tab, setTab, money, setMoney, revision, setGoalPrompt, touchChrome } = usePlayChrome();
  // Дом stays mounted behind the other tabs, so the pet is not rebuilt on every switch.
  const { fade, leaving } = useTabFade(tab);
  const [hub, setHub] = useState<HubModel | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModel | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftGot, setGiftGot] = useState<number | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [dayTip, setDayTip] = useState(false);
  const [dropBox, setDropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tourId, setTourId] = useState<string | null>(() => {
    const saved = meta.get(META_KEYS.finnyTour);
    return tourStep(saved) ? saved : null;
  });
  const tourOpensCard = tourStep(tourId)?.spotlight === "goal";
  const [trackedTourCard, setTrackedTourCard] = useState(tourOpensCard);
  if (tourOpensCard !== trackedTourCard) {
    setTrackedTourCard(tourOpensCard);
    setCardOpen(tourOpensCard);
  }
  const [spotlightHole, setSpotlightHole] = useState<{ id: string; box: SpotlightBox } | null>(null);
  const rememberSpotlight = useCallback((id: string, box: SpotlightBox) => {
    setSpotlightHole((current) => {
      if (
        current?.id === id &&
        current.box.x === box.x &&
        current.box.y === box.y &&
        current.box.width === box.width &&
        current.box.height === box.height &&
        current.box.radius === box.radius
      ) {
        return current;
      }
      return { id, box };
    });
  }, []);
  const shellRef = useRef<View>(null);
  const mapRef = useRef<View>(null);
  useEffect(() => {
    if (tourStep(tourId)?.spotlight !== "map") return;
    measureSpotlight(mapRef.current, shellRef.current, "map", rememberSpotlight, 16);
  }, [rememberSpotlight, tourId]);
  const dropRef = useRef<View>(null);
  const closeDayTip = useCallback(() => {
    setDropBox(null);
    setDayTip(false);
  }, []);
  const openGoal = useCallback(() => {
    setCardOpen(false);
    closeDayTip();
    setMoney("savings");
    setTab("money");
    setGoalPrompt(true);
  }, [closeDayTip, setGoalPrompt, setMoney, setTab]);
  const openGift = useCallback(() => {
    closeDayTip();
    setCardOpen(false);
    setGiftOpen(true);
  }, [closeDayTip]);
  const claimGift = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const result = game.claimDailyReward(profileId);
    setGiftOpen(false);
    if (result.status === "ok") {
      setHub((current) => (current ? { ...current, giftReady: false } : current));
      setGiftGot(result.coins);
    }
    touchChrome();
  }, [game, meta, touchChrome]);
  const placeDropShield = useCallback(() => {
    const drop = dropRef.current;
    const shell = shellRef.current;
    if (!drop || !shell || typeof drop.measureLayout !== "function") return;
    drop.measureLayout(
      shell,
      (x, y, width, height) => {
        setDropBox((current) =>
          current && current.x === x && current.y === y && current.width === width && current.height === height
            ? current
            : { x, y, width, height },
        );
      },
      () => setDropBox(null),
    );
  }, []);

  const loadHub = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    const opened = game.openDay(profileId);
    const bank = opened.status === "opened" ? game.collectDeposits(profileId, opened.dayId) : null;
    const profile = game.getProfile(profileId);
    const progress = game.listTaskProgress(profileId);
    const completed = completedTaskIds(progress);
    const savingsOpen = profile.isDemo || completed.has(FEATURES.savingsTaskId);
    const planOpen = profile.isDemo || completed.has(FEATURES.planTaskId);
    const bankOpen = profile.isDemo || completed.has(BANK.unlockTaskId);
    const savings = game.savingsState(profileId);
    const day = game.dayState(profileId);
    const gift = game.dailyRewardState(profileId);
    const activeGoal = savings.activeGoal;
    const face = goalFace(savings, profile.stage, content.goals);
    const cost = activeGoal?.cost ?? 0;
    const remaining = activeGoal?.remaining ?? 0;
    setHub({
      profile,
      savings,
      day,
      goalName: face.name,
      goalIcon: face.icon,
      threshold: face.threshold,
      accumulated: cost - remaining,
      cost,
      remaining,
      savingsOpen,
      planOpen,
      bankOpen,
      giftReady: gift.ready,
      giftCells: gift.cells,
    });
    const bankPaid = bank && bank.paid > 0 ? bank : null;
    if (bankPaid) {
      setFeedback({
        deltas: { balance: bankPaid.paid },
        cause: strings.feedbackBankReturned(bankPaid.paid, bankPaid.interest),
      });
    }
  }, [content, game, meta]);

  useFocusEffect(
    useCallback(() => {
      loadHub();
    }, [loadHub]),
  );

  useEffect(() => {
    // Re-read the hub from SQLite after a money action elsewhere bumps `revision`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHub();
  }, [loadHub, revision]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (giftGot != null) {
          setGiftGot(null);
          return true;
        }
        if (giftOpen) {
          setGiftOpen(false);
          return true;
        }
        if (dayTip) {
          closeDayTip();
          return true;
        }
        if (cardOpen) {
          setCardOpen(false);
          return true;
        }
        if (tourStep(tourId)) return true;
        if (tab === "home") {
          BackHandler.exitApp();
          return true;
        }
        setTab("home");
        return true;
      });
      return () => subscription.remove();
    }, [cardOpen, closeDayTip, dayTip, giftGot, giftOpen, setTab, tab, tourId]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => setCardOpen(false);
    }, []),
  );

  useEffect(() => {
    if (!hub) return;
    const visible =
      (money === "savings" && hub.savingsOpen) ||
      (money === "plan" && hub.planOpen) ||
      money === "journal" ||
      (money === "bank" && hub.bankOpen);
    if (!visible) setMoney("journal");
  }, [hub, money, setMoney]);

  const advanceTour = useCallback(() => {
    if (!tourId) return;
    const next = nextTourStep(tourId);
    meta.set(META_KEYS.finnyTour, next ?? "done");
    setTourId(next);
  }, [meta, tourId]);
  useEffect(() => {
    const step = tourStep(tourId);
    if (!step) return;
    setTab(step.tab ?? "home");
  }, [setTab, tourId]);

  const unlockKey = useAccessoryUnlock(hub?.profile.id ?? null);
  const celebrateUnlock = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return;
    game.celebrateAccessoryUnlock(profileId);
    loadHub();
    touchChrome();
  }, [game, loadHub, meta, touchChrome]);

  if (!hub) {
    return (
      <View style={styles.shell}>
        <StatusStrip />
        <Screen>
          <Text style={styles.body}>{strings.appName}</Text>
        </Screen>
      </View>
    );
  }

  const waiting = !hub.day.open;
  const options = MONEY_OPTIONS.filter((option) => {
    if (option.id === "savings") return hub.savingsOpen;
    if (option.id === "plan") return hub.planOpen;
    if (option.id === "bank") return hub.bankOpen;
    return true;
  });
  const current = options.find((option) => option.id === money) ?? options[0];
  const tour = hub.profile.isDemo ? null : tourStep(tourId);
  const markId = tour?.spotlight ?? (tour?.map ? "pin" : null);
  const hole = spotlightHole?.id === markId ? spotlightHole.box : null;
  const showUnlock =
    unlockKey != null &&
    focused &&
    tab === "home" &&
    !cardOpen &&
    !giftOpen &&
    giftGot == null &&
    feedback == null &&
    tour == null;

  return (
    <View ref={shellRef} style={styles.shell}>
      <View style={styles.aboveTabs}>
        <View
          accessibilityElementsHidden={cardOpen}
          importantForAccessibility={cardOpen ? "no-hide-descendants" : "auto"}
          style={styles.aboveTabs}
        >
          <StatusStrip measureRoot={shellRef} spotlight={tour?.spotlight} onSpotlightBox={rememberSpotlight} />
          <View style={styles.bodySlot}>
            <TabPane open={tab === "home"} leaving={leaving === "home"} fadeIn={fade?.value ?? null}>
              <HomeScene
                pet={{
                  species: hub.profile.species,
                  color: hub.profile.color,
                  accessory: hub.profile.accessory,
                  petName: hub.profile.petName,
                  care: hub.profile.care,
                  mood: hub.profile.mood,
                }}
                day={hub.day.n}
                waiting={waiting}
                goalName={hub.goalName}
                goalIcon={hub.goalIcon}
                threshold={hub.threshold}
                accumulated={hub.accumulated}
                cost={hub.cost}
                canPickGoal={hub.savingsOpen}
                onPickGoal={openGoal}
                onShop={() => navigation.navigate("Shop")}
                onResults={() => navigation.navigate("Results")}
                giftReady={hub.giftReady}
                onGift={openGift}
                dayTip={dayTip}
                onDayTip={(open) => (open ? setDayTip(true) : closeDayTip())}
                dropRef={dropRef}
                onDropLayout={placeDropShield}
                bottomInset={STAGE_PEEK_HEIGHT}
                active={focused && !showUnlock && tab === "home"}
                quiet={tour != null}
              />
            </TabPane>
            {tab === "map" || leaving === "map" ? (
              <TabPane open={tab === "map"} leaving={leaving === "map"} fadeIn={fade?.value ?? null}>
                <TaskListScreen
                  markFirstOpen={Boolean(tour?.map)}
                  measureRoot={shellRef}
                  onSpotlightBox={rememberSpotlight}
                />
              </TabPane>
            ) : null}
            {tab === "money" || leaving === "money" ? (
              <TabPane open={tab === "money"} leaving={leaving === "money"} fadeIn={fade?.value ?? null}>
                <View style={styles.money}>
                  <View style={styles.menu} role="tablist" aria-label={moneyStrings.sections}>
                    <PillRow grow options={options} value={current.id} onChange={setMoney} />
                  </View>
                  <View style={styles.bodySlot}>
                    {money === "savings" ? <SavingsScreen /> : null}
                    {money === "plan" ? <PlanScreen /> : null}
                    {money === "journal" ? (
                      <Screen>
                        <JournalPanel />
                      </Screen>
                    ) : null}
                    {money === "bank" ? <BankScreen /> : null}
                  </View>
                </View>
              </TabPane>
            ) : null}
          </View>
        </View>
        <StageCard
          stage={hub.profile.stage}
          petName={hub.profile.petName}
          goalName={hub.goalName}
          goalIcon={hub.goalIcon}
          threshold={hub.threshold}
          accumulated={hub.accumulated}
          cost={hub.cost}
          open={cardOpen}
          onOpen={() => setCardOpen(true)}
          onClose={() => setCardOpen(false)}
          canPickGoal={hub.savingsOpen}
          onPickGoal={openGoal}
          overlay={tab === "home"}
          spotlight={tour?.spotlight === "goal"}
          measureRoot={shellRef}
          onSpotlightBox={rememberSpotlight}
        />
      </View>
      <View style={styles.tabTray}>
        <View style={styles.tabs}>
          {(
            [
              ["home", strings.tabHome, "home"],
              ["map", strings.tabMap, "map"],
              ["money", strings.tabMoney, "coin"],
            ] as const
          ).map(([id, label, icon]) => {
            const selected = tab === id;
            const ink = selected ? colors.onRaised : colors.subtle;
            return (
              <Pressable
                key={id}
                ref={id === "map" ? mapRef : undefined}
                collapsable={id === "map" ? false : undefined}
                onLayout={
                  id === "map"
                    ? () => measureSpotlight(mapRef.current, shellRef.current, "map", rememberSpotlight, 16)
                    : undefined
                }
                role="button"
                aria-label={label}
                aria-selected={selected}
                onPress={() => {
                  setCardOpen(false);
                  closeDayTip();
                  setTab(id);
                }}
                style={styles.tab}
              >
                {({ pressed }) => (
                  <>
                    <View
                      style={[
                        styles.token,
                        selected ? styles.tokenOn : null,
                        selected && pressed ? styles.tokenPressed : null,
                      ]}
                    >
                      <View style={[styles.tokenFace, selected ? styles.tokenFaceOn : null]}>
                        <View style={selected ? null : styles.spriteIdle}>
                          <PixelSprite name={icon} size={28} />
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.tabLabel, selected ? styles.tabLabelOn : null, { color: ink }]}>{label}</Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      {dayTip ? (
        <Pressable
          role="button"
          aria-label={shopStrings.dailyDropClose}
          aria-hidden
          onPress={closeDayTip}
          style={styles.dayTipScrim}
        />
      ) : null}
      {dayTip && dropBox ? (
        <View pointerEvents="box-none" style={styles.dayTipScrim}>
          <Pressable
            accessible={false}
            aria-hidden
            onPress={() => {}}
            style={{
              backgroundColor: "transparent",
              height: dropBox.height,
              left: dropBox.x,
              position: "absolute",
              top: dropBox.y,
              width: dropBox.width,
            }}
          />
        </View>
      ) : null}
      {giftOpen && hub ? (
        <DailyRewardCalendar cells={hub.giftCells} onClose={() => setGiftOpen(false)} onClaim={claimGift} />
      ) : null}
      {giftGot != null ? <DailyRewardGot coins={giftGot} onDismiss={() => setGiftGot(null)} /> : null}
      {feedback ? <FeedbackCard model={feedback} onDismiss={() => setFeedback(null)} /> : null}
      {tour?.pickGoal ? (
        <GoalPicker
          visible
          title={finnyScript.pickTitle}
          lead={finnyScript.pickLine}
          required
          onClose={() => {}}
          onChanged={() => {
            touchChrome();
            advanceTour();
          }}
        />
      ) : tour ? (
        <FinnyTour
          step={tour}
          chosen={tourGoal(game, content.goals, hub.profile.id)}
          hole={hole}
          onAdvance={advanceTour}
        />
      ) : null}
      {showUnlock && unlockKey ? (
        <AccessoryUnlockCard
          accessory={unlockKey}
          stage={hub.profile.stage}
          pet={{ species: hub.profile.species, color: hub.profile.color, petName: hub.profile.petName }}
          onDone={celebrateUnlock}
          onAppearance={() => {
            celebrateUnlock();
            navigation.navigate("Appearance");
          }}
        />
      ) : null}
    </View>
  );
}

function tourGoal(
  game: { savingsState(profileId: string): { activeGoal: { key: string; cost: number; custom: boolean; name: string | null } | null } },
  goals: readonly { id: string; name: string }[],
  profileId: string,
): { name: string; cost: number } | null {
  try {
    const active = game.savingsState(profileId).activeGoal;
    if (!active) return null;
    const known = goals.find((goal) => goal.id === active.key);
    const name = active.custom ? (active.name ?? "") : (known?.name ?? "");
    if (!name) return null;
    return { name, cost: active.cost };
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1,
  },
  dayTipScrim: {
    backgroundColor: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  aboveTabs: {
    flex: 1,
    overflow: "hidden",
  },
  bodySlot: {
    flex: 1,
  },
  money: {
    flex: 1,
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  menu: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
  },
  tabTray: {
    backgroundColor: colors.raisedEdge,
    paddingBottom: 4,
  },
  tabs: {
    backgroundColor: colors.track,
    flexDirection: "row",
    gap: spacing.s,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  tab: {
    alignItems: "stretch",
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: minTarget,
  },
  token: {
    backgroundColor: colors.track,
    borderRadius: 14,
    overflow: "hidden",
    paddingBottom: 4,
  },
  tokenPressed: {
    paddingBottom: 0,
    paddingTop: 4,
  },
  tokenOn: {
    backgroundColor: colors.raisedEdge,
  },
  tokenFace: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 36,
    paddingVertical: 4,
  },
  tokenFaceOn: {
    backgroundColor: colors.raisedFace,
  },
  spriteIdle: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: type.body,
    textAlign: "center",
  },
  tabLabelOn: {
    fontWeight: "700",
  },
});
