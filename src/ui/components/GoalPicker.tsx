import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CUSTOM_GOAL_MOOD } from "../../core/customGoal";
import { nextStage, STAGE_NAMES } from "../../core/stages";
import type { CatalogItemContent, GoalContent } from "../../data/content";
import type { JournalEntry } from "../../data/repositories/gameRepository";
import { META_KEYS } from "../../data/metaKeys";
import { DEFAULT_GOAL_EMOJI } from "../goalEmojis";
import { goalThresholdLabel } from "../goalLabel";
import { GoalRow } from "../screens/shopParts";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, radius, spacing, type } from "../theme";
import { AppModal } from "./AppModal";
import { CoinText } from "./CoinText";
import { ScreenTitle } from "./ScreenTitle";
import { PrimaryButton } from "./PrimaryButton";
import { TextButton } from "./TextButton";

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

export function GoalPicker({
  visible,
  onClose,
  onChanged,
  title = strings.goalPickerTitle,
  lead,
  required = false,
}: {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
  /** Sheet heading. Деньги uses «Выбери цель»; the tour keeps its own line. */
  title?: string;
  /** Sentence under the heading, on the list only. */
  lead?: string;
  /** Stay until a Цель is set. Hides «Закрыть». */
  required?: boolean;
}) {
  const { game, meta, content } = useSession();
  const { height: windowHeight } = useWindowDimensions();
  const listMaxHeight = Math.round(windowHeight * 0.62);
  const [pending, setPending] = useState<GoalContent | null>(null);

  const profileId = meta.get(META_KEYS.activeProfileId);
  const savings = profileId ? game.savingsState(profileId) : null;
  const pot = savings?.pot ?? 0;
  const activeKey = savings?.activeGoal?.key ?? null;
  const stage = profileId ? game.getProfile(profileId).stage : "novice";
  const next = nextStage(stage);
  const stepNote = next === stage ? null : strings.goalStepNote(STAGE_NAMES[next]);

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

  const choose = (item: GoalContent) => {
    if (!profileId) return;
    if (activeKey && activeKey !== item.id) {
      setPending(item);
      return;
    }
    apply(item);
  };

  if (!visible) return null;

  // A Своя цель saved before ADR-0015 stays readable and buyable; no new one can be written.
  const activeCustom = savings?.activeGoal?.custom ? savings.activeGoal : null;

  return (
    <AppModal animation="slide" transparent visible onRequestClose={required ? () => {} : close}>
      <View style={styles.backdrop} pointerEvents="box-none">
        <View style={styles.sheet}>
          {pending ? (
            <>
              <ScreenTitle style={styles.title}>{strings.goalPickerTitle}</ScreenTitle>
              <CoinText coin text={strings.shopConfirmReplaceGoal(pending.name, pot)} style={styles.body} />
              <TextButton label={strings.close} onPress={() => setPending(null)} />
              <PrimaryButton label={strings.shopMakeGoal} onPress={() => apply(pending)} />
            </>
          ) : (
            <>
              <ScreenTitle style={styles.title}>{title}</ScreenTitle>
              {lead ? <Text style={styles.body}>{lead}</Text> : null}
              <ScrollView style={[styles.list, { maxHeight: listMaxHeight }]} contentContainerStyle={styles.listContent}>
                {activeCustom?.name ? (
                  <GoalRow
                    goal={{
                      name: activeCustom.name,
                      icon: activeCustom.icon || DEFAULT_GOAL_EMOJI,
                      price: activeCustom.cost,
                      description: (savings ? goalThresholdLabel(savings, stage) : null) ?? "",
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
                        note: stepNote ?? undefined,
                      }}
                      selected={selected}
                      onChoose={selected ? close : () => choose(item)}
                    />
                  );
                })}
              </ScrollView>
              {required ? null : <TextButton label={strings.close} onPress={close} />}
            </>
          )}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
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
});
