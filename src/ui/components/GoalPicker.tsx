import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type Role } from "react-native";
import { CUSTOM_GOAL_MOOD, CUSTOM_GOAL_PRICE_MAX } from "../../core/customGoal";
import { showStageThreshold, stageGoalFloor } from "../../core/stages";
import type { CatalogItemContent, GoalContent } from "../../data/content";
import type { JournalEntry } from "../../data/repositories/gameRepository";
import { META_KEYS } from "../../data/metaKeys";
import { DEFAULT_GOAL_EMOJI, GOAL_EMOJI_GROUPS } from "../goalEmojis";
import { goalThresholdLabel } from "../goalLabel";
import { GoalRow, OwnGoalRow } from "../screens/shopParts";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { AmountStepper } from "./AmountStepper";
import { CoinText } from "./CoinText";
import { ScreenTitle } from "./ScreenTitle";
import { PrimaryButton } from "./PrimaryButton";
import { TextButton } from "./TextButton";

const TEXTBOX_ROLE = "textbox" as Role;

/** Lifetime `once` ownership: any journal purchase of a once catalog id (plus today's purchased ids). */
export function ownedOnceItemIds(
  journal: readonly JournalEntry[],
  catalog: readonly CatalogItemContent[],
  todayPurchasedIds: readonly string[] = [],
): Set<string> {
  const onceIds = new Set(catalog.filter((item) => item.once).map((item) => item.id));
  const owned = new Set<string>();
  for (const id of todayPurchasedIds) {
    if (onceIds.has(id)) owned.add(id);
  }
  for (const row of journal) {
    if (row.itemId && onceIds.has(row.itemId)) owned.add(row.itemId);
  }
  return owned;
}

export function settableOptionalItems(
  catalog: readonly CatalogItemContent[],
  ownedOnce: ReadonlySet<string>,
): CatalogItemContent[] {
  return catalog.filter((item) => item.kind === "optional" && !(item.once && ownedOnce.has(item.id)));
}

type CustomDraft = { icon: string; title: string; price: number };

export function GoalPicker({
  visible,
  onClose,
  onChanged,
}: {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { game, meta, content } = useSession();
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.round(windowHeight * 0.62);
  const [pending, setPending] = useState<GoalContent | null>(null);
  const [draft, setDraft] = useState<CustomDraft | null>(null);
  const [confirmDraft, setConfirmDraft] = useState<CustomDraft | null>(null);
  const [pickingIcon, setPickingIcon] = useState(false);

  const profileId = meta.get(META_KEYS.activeProfileId);
  const savings = profileId ? game.savingsState(profileId) : null;
  const pot = savings?.pot ?? 0;
  const activeKey = savings?.activeGoal?.key ?? null;
  const stage = profileId ? game.getProfile(profileId).stage : "novice";
  const presetPrices = content.goals.filter((goal) => goal.stage === stage).map((goal) => goal.price);
  const floor = presetPrices.length > 0 ? stageGoalFloor(presetPrices) : 0;
  const credit = savings?.stageCredit ?? 0;

  const items = useMemo(() => {
    if (!profileId) return [];
    const current = game.getProfile(profileId).stage;
    const day = game.dayState(profileId);
    const owned = new Set<string>([
      ...game.listJournal(profileId).map((row) => row.itemId).filter((id): id is string => Boolean(id)),
      ...game.purchasedItemIds(profileId, day.dayId),
    ]);
    return content.goals.filter((goal) => goal.stage === current && !owned.has(goal.id));
    // `visible` is not read: it re-reads the journal each time the picker opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.goals, game, profileId, visible]);

  const close = () => {
    setPending(null);
    setDraft(null);
    setConfirmDraft(null);
    setPickingIcon(false);
    onClose();
  };

  const apply = (item: GoalContent) => {
    if (!profileId) return;
    game.setActiveGoal(profileId, {
      id: item.id,
      kind: "optional",
      price: item.price,
      effect: item.effect,
      once: true,
      stage: item.stage,
    });
    setPending(null);
    onChanged?.();
    onClose();
  };

  const applyCustom = (next: CustomDraft) => {
    if (!profileId || floor <= 0) return;
    game.setCustomGoal(profileId, {
      name: next.title,
      icon: next.icon,
      price: next.price,
      presetPrices,
    });
    setDraft(null);
    setConfirmDraft(null);
    setPickingIcon(false);
    onChanged?.();
    onClose();
  };

  const choose = (item: GoalContent) => {
    if (!profileId) return;
    if (activeKey && activeKey !== item.id) {
      setPending(item);
      return;
    }
    apply(item);
  };

  const saveCustom = () => {
    if (!draft || draft.title.trim().length === 0) return;
    if (activeKey) {
      setConfirmDraft(draft);
      setDraft(null);
      setPickingIcon(false);
      return;
    }
    applyCustom(draft);
  };

  const openCustom = () => {
    setPending(null);
    setPickingIcon(false);
    setDraft({ icon: DEFAULT_GOAL_EMOJI, title: "", price: floor });
  };

  const drop = () => {
    if (!profileId) return;
    game.clearActiveGoal(profileId);
    setPending(null);
    onChanged?.();
    onClose();
  };

  if (!visible) return null;

  const thresholdFor = (price: number) =>
    showStageThreshold({ stage, custom: true, price, threshold: floor })
      ? strings.stageThreshold(credit, floor)
      : null;
  const drafting = draft ?? confirmDraft;
  const thresholdLabel = drafting ? thresholdFor(drafting.price) : null;
  const activeCustom = savings?.activeGoal?.custom ? savings.activeGoal : null;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={close}>
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.sheet}>
          {pending ? (
            <>
              <ScreenTitle style={styles.title}>{strings.goalPickerTitle}</ScreenTitle>
              <CoinText coin text={strings.shopConfirmReplaceGoal(pending.name, pot)} style={styles.body} />
              <TextButton label={strings.close} onPress={() => setPending(null)} />
              <PrimaryButton label={strings.shopMakeGoal} onPress={() => apply(pending)} />
            </>
          ) : confirmDraft ? (
            <>
              <ScreenTitle style={styles.title}>{strings.customGoal}</ScreenTitle>
              <CoinText coin text={strings.shopConfirmReplaceGoal(confirmDraft.title.trim(), pot)} style={styles.body} />
              {thresholdLabel ? <Text style={styles.body}>{thresholdLabel}</Text> : null}
              <TextButton label={strings.back} onPress={() => { setDraft(confirmDraft); setConfirmDraft(null); }} />
              <PrimaryButton label={strings.shopMakeGoal} onPress={() => applyCustom(confirmDraft)} />
            </>
          ) : draft && pickingIcon ? (
            <>
              <ScreenTitle style={styles.title}>{strings.goalIcon(draft.icon)}</ScreenTitle>
              <ScrollView style={[styles.list, { maxHeight: listMaxHeight }]} contentContainerStyle={styles.emojiList}>
                {GOAL_EMOJI_GROUPS.map((group) => (
                  <View key={group.title} style={styles.emojiGroup}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <View style={styles.emojiGrid}>
                      {group.emojis.map((emoji) => (
                        <Pressable
                          key={emoji}
                          role="button"
                          aria-label={strings.goalIconPick(emoji)}
                          onPress={() => {
                            setDraft({ ...draft, icon: emoji });
                            setPickingIcon(false);
                          }}
                          style={styles.emoji}
                        >
                          <Text aria-hidden style={styles.emojiGlyph}>
                            {emoji}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TextButton label={strings.back} onPress={() => setPickingIcon(false)} />
            </>
          ) : draft ? (
            <>
              <ScreenTitle style={styles.title}>{strings.customGoal}</ScreenTitle>
              <Pressable
                role="button"
                aria-label={strings.goalIcon(draft.icon)}
                onPress={() => setPickingIcon(true)}
                style={styles.iconButton}
              >
                <Text aria-hidden style={styles.iconGlyph}>
                  {draft.icon}
                </Text>
              </Pressable>
              <TextInput
                role={TEXTBOX_ROLE}
                aria-label={strings.customGoalName}
                placeholder={strings.customGoalNameHint}
                placeholderTextColor={colors.subtle}
                value={draft.title}
                maxLength={24}
                onChangeText={(title) => setDraft({ ...draft, title })}
                style={styles.input}
              />
              <AmountStepper
                label={strings.customGoalPrice}
                pictogram={strings.balanceIcon}
                value={draft.price}
                min={1}
                max={CUSTOM_GOAL_PRICE_MAX}
                showTrack
                onChange={(price) => setDraft({ ...draft, price })}
              />
              {thresholdLabel ? <Text style={styles.body}>{thresholdLabel}</Text> : null}
              <TextButton label={strings.back} onPress={() => { setDraft(null); setPickingIcon(false); }} />
              <PrimaryButton
                label={strings.shopMakeGoal}
                disabled={draft.title.trim().length === 0}
                onPress={saveCustom}
              />
            </>
          ) : (
            <>
              <ScreenTitle style={styles.title}>{strings.goalPickerTitle}</ScreenTitle>
              <ScrollView style={[styles.list, { maxHeight: listMaxHeight }]} contentContainerStyle={styles.listContent}>
                {activeCustom?.name ? (
                  <GoalRow
                    goal={{
                      name: activeCustom.name,
                      icon: activeCustom.icon || DEFAULT_GOAL_EMOJI,
                      price: activeCustom.cost,
                      description: (savings ? goalThresholdLabel(savings, stage) : null) ?? strings.customGoalLead,
                      effect: { meter: "mood", delta: CUSTOM_GOAL_MOOD },
                    }}
                    selected
                    onChoose={close}
                  />
                ) : null}
                {items.map((item) => {
                  const selected = activeKey === item.id;
                  return (
                    <GoalRow
                      key={item.id}
                      goal={{
                        name: item.name,
                        icon: item.icon,
                        price: item.price,
                        description: item.description,
                        effect: item.effect,
                      }}
                      selected={selected}
                      onChoose={selected ? close : () => choose(item)}
                    />
                  );
                })}
                <OwnGoalRow onPress={openCustom} />
              </ScrollView>
              <TextButton label={strings.goalDrop} onPress={drop} />
              <TextButton label={strings.close} onPress={close} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    gap: spacing.m,
    maxHeight: "92%",
    padding: spacing.l,
  },
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  body: {
    color: colors.text,
    fontSize: type.body,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    gap: 12,
    paddingVertical: spacing.s,
  },
  input: {
    borderColor: colors.track,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: type.body,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  iconButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.highlight,
    borderRadius: 12,
    height: minTarget,
    justifyContent: "center",
    width: minTarget,
  },
  iconGlyph: {
    fontSize: 28,
  },
  emojiList: {
    gap: spacing.m,
    paddingVertical: spacing.s,
  },
  emojiGroup: {
    gap: spacing.s,
  },
  groupTitle: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  emoji: {
    alignItems: "center",
    height: minTarget,
    justifyContent: "center",
    width: minTarget,
  },
  emojiGlyph: {
    fontSize: 28,
  },
});
