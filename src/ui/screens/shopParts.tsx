import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CatalogItemContent } from "../../data/content";
import { METERS } from "../../core/config";
import { itemMeterEffects } from "../../core/economy";
import { CoinText } from "../components/CoinText";
import { PixelIcon } from "../components/Pictogram";
import { PixelSprite } from "../components/PixelSprite";
import type { PixelIconName } from "../pixelIconXml";
import { strings } from "../strings";
import { shopStrings } from "../stringsShop";
import { colors, font, minTarget, radius, spacing, type } from "../theme";

/**
 * Soft tints for Магазин tiles and tags. Text on every tint stays colors.text
 * (≥12:1), so the tints only carry grouping, never meaning on their own.
 */
const tint = {
  mandatoryTile: colors.highlight,
  optionalTile: "#E9F0C4",
  goalTag: colors.badgeFill,
  neutralTag: colors.track,
  gain: "#EEF3D2",
} as const;

export const hiddenFromReader = {
  "aria-hidden": true as const,
  accessibilityElementsHidden: true as const,
  importantForAccessibility: "no-hide-descendants" as const,
};

export type RowFlags = { due: boolean; goal: boolean; bought: boolean };

function meterWordLower(meter: "care" | "mood") {
  return meter === "care" ? shopStrings.careWord : shopStrings.moodWord;
}

function meterSprite(meter: "care" | "mood") {
  return meter === "care" ? ("food" as const) : ("mood" as const);
}

function meterWord(meter: "care" | "mood") {
  return meter === "care" ? strings.care : strings.mood;
}

/** «сытость -15 и счастье -15» for the meters this purchase offsets. Null when it feeds none. */
export function dailyDropPhrase(item: CatalogItemContent): string | null {
  const meters = new Set(itemMeterEffects(item).map((effect) => effect.meter));
  const parts: string[] = [];
  if (meters.has("care")) parts.push(shopStrings.dailyCare(METERS.dailyCareDrop));
  if (meters.has("mood")) parts.push(shopStrings.dailyMood(METERS.dailyMoodDrop));
  return parts.length > 0 ? parts.join(" и ") : null;
}

export function rowAnnouncement(item: CatalogItemContent, balance: number, flags: RowFlags) {
  const parts = [item.name, strings.shopPrice(item.price)];
  for (const effect of itemMeterEffects(item)) {
    parts.push(strings.shopMeterA11y(meterWord(effect.meter), effect.delta));
  }
  if (flags.goal) parts.push(strings.shopGoalChip);
  if (flags.bought) parts.push(strings.shopBought);
  if (item.once) parts.push(strings.shopOnceChip);
  if (balance < item.price) parts.push(strings.shopShortfall(item.price - balance));
  return parts.join(". ");
}

/** Spoken name for one Цель card: name, price, what the pet gains, and the line that says what it is. */
export function goalAnnouncement(
  goal: {
    name: string;
    price: number;
    description: string;
    effect: { meter: "care" | "mood"; delta: number };
    note?: string;
  },
  selected: boolean,
) {
  const parts = [
    goal.name,
    strings.shopPrice(goal.price),
    strings.shopMeterA11y(meterWord(goal.effect.meter), goal.effect.delta),
  ];
  if (goal.description) parts.push(goal.description);
  if (goal.note) parts.push(goal.note);
  if (selected) parts.push(strings.shopGoalChip);
  return parts.join(". ");
}

/** Big square picture of the item on a tile tinted by its kind. */
export function ItemTile({
  item,
  size = 72,
}: {
  item: { icon: string; kind?: "mandatory" | "optional" };
  size?: number;
}) {
  return (
    <View
      {...hiddenFromReader}
      style={[
        styles.tile,
        { height: size, width: size, borderRadius: Math.round(size / 4) },
        { backgroundColor: item.kind === "mandatory" ? tint.mandatoryTile : tint.optionalTile },
      ]}
    >
      <Text style={[styles.tileEmoji, { fontSize: Math.round(size * 0.66), lineHeight: Math.round(size * 0.9) }]}>
        {item.icon}
      </Text>
    </View>
  );
}

/** Pixel-font number with the coin sprite. */
export function CoinPrice({ amount, large }: { amount: number; large?: boolean }) {
  return (
    <View style={styles.price}>
      <Text style={[styles.priceNumber, large ? styles.priceLarge : null]}>{amount}</Text>
      <PixelSprite name="coin" size={large ? 24 : 20} />
    </View>
  );
}

function Tag({ label, fill, icon }: { label: string; fill: string; icon?: PixelIconName }) {
  return (
    <View style={[styles.tag, { backgroundColor: fill }]}>
      {icon ? <PixelIcon name={icon} size={16} color={colors.text} /> : null}
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/**
 * State tags: Цель, Куплено, Один раз. No category or «Счёт на
 * сегодня» (Дима, 2026-09-26): the tab already says the category, and the
 * day's drop is stated once above the list.
 */
export function ItemTags({ item, flags }: { item: { once?: boolean }; flags: RowFlags }) {
  if (!flags.goal && !flags.bought && !item.once) return null;
  return (
    <View style={styles.tags}>
      {flags.goal ? <Tag label={strings.shopGoalChip} fill={tint.goalTag} icon="star" /> : null}
      {flags.bought ? <Tag label={strings.shopBought} fill={tint.gain} icon="check" /> : null}
      {item.once ? <Tag label={strings.shopOnceChip} fill={tint.neutralTag} /> : null}
    </View>
  );
}

/**
 * Pet effects with Andrei's food / mood sprites. `announce` gives each line its
 * own spoken name (drawer); in a row the row label already says it all.
 */
export function ItemEffects({
  item,
  announce,
}: {
  item: { effect: { meter: "care" | "mood"; delta: number }; also?: { meter: "care" | "mood"; delta: number } };
  announce: boolean;
}) {
  return (
    <View style={styles.effects} {...(announce ? {} : hiddenFromReader)}>
      {itemMeterEffects(item).map((effect) => (
        <View
          key={effect.meter}
          style={[styles.effect, { backgroundColor: tint.gain }]}
          accessible={announce}
          accessibilityLabel={announce ? strings.shopMeterA11y(meterWord(effect.meter), effect.delta) : undefined}
        >
          <PixelSprite name={meterSprite(effect.meter)} size={16} />
          <Text style={styles.effectText}>{shopStrings.effectGain(effect.delta, meterWordLower(effect.meter))}</Text>
        </View>
      ))}
    </View>
  );
}

/** Compact row action: short visible word, full spoken name, 48 high. */
export function RowButton({
  label,
  spoken,
  icon,
  primary,
  onPress,
}: {
  label: string;
  spoken: string;
  icon: PixelIconName;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowButton,
        primary ? styles.rowButtonPrimary : styles.rowButtonSecondary,
        pressed ? styles.rowButtonPressed : null,
      ]}
    >
      <View style={[styles.rowButtonFace, primary ? styles.rowButtonFacePrimary : null]}>
        <PixelIcon name={icon} size={20} color={primary ? colors.onRaised : colors.accentText} />
        <Text style={[styles.rowButtonLabel, primary ? styles.rowButtonLabelPrimary : null]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Two-segment switch; each half is a button with aria-selected. A press sinks
 * the face onto its edge like the raised buttons, so the tap is felt.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.segments}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="button"
            aria-label={option.label}
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected ? styles.segmentOn : null,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.segmentFace,
                  selected ? styles.segmentFaceOn : null,
                  pressed ? styles.segmentFacePressed : null,
                ]}
              >
                <Text style={[styles.segmentLabel, selected ? styles.segmentLabelOn : null]}>{option.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** One shop row: tappable info block plus Купить. */
export function ShopRow({
  item,
  flags,
  balance,
  marked,
  onOpen,
  onBuy,
}: {
  item: CatalogItemContent;
  flags: RowFlags;
  balance: number;
  marked: boolean;
  onOpen: () => void;
  onBuy: () => void;
}) {
  const shortfall = balance < item.price ? item.price - balance : null;
  return (
    <View style={[styles.row, marked ? styles.rowMarked : null]}>
      <Pressable
        role="button"
        aria-label={rowAnnouncement(item, balance, flags)}
        aria-selected={marked}
        onPress={onOpen}
        style={styles.rowInfo}
      >
        <ItemTile item={item} />
        <View style={styles.rowMiddle}>
          <Text style={styles.name}>{item.name}</Text>
          <View {...hiddenFromReader} style={styles.rowDetails}>
            <ItemTags item={item} flags={flags} />
            <ItemEffects item={item} announce={false} />
          </View>
        </View>
        <View style={styles.rowPrice}>
          <CoinPrice amount={item.price} />
          {shortfall != null ? (
            <View {...hiddenFromReader}>
              <CoinText coin labelled={false} text={strings.shopShortfall(shortfall)} style={styles.shortfall} />
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.rowActions}>
        <RowButton
          label={shopStrings.buy}
          spoken={shopStrings.buyA11y(item.name)}
          icon="shopping-cart"
          primary
          onPress={onBuy}
        />
      </View>
    </View>
  );
}

export type GoalFace = {
  name: string;
  icon: string;
  price: number;
  description: string;
  effect: { meter: "care" | "mood"; delta: number };
  /** «Купишь — питомец перейдёт на этап «Про»». */
  note?: string;
};

/** One Цель, laid out like a Магазин row: picture, name, what it is, the gain, and the price. */
export function GoalRow({
  goal,
  selected,
  onChoose,
}: {
  goal: GoalFace;
  selected: boolean;
  onChoose: () => void;
}) {
  return (
    <View style={[styles.row, selected ? styles.rowMarked : null]}>
      <Pressable
        role="button"
        aria-label={goalAnnouncement(goal, selected)}
        aria-selected={selected}
        onPress={onChoose}
        style={styles.rowInfo}
      >
        <ItemTile item={{ icon: goal.icon, kind: "optional" }} />
        <View style={styles.rowMiddle}>
          <Text style={styles.name}>{goal.name}</Text>
          <View {...hiddenFromReader} style={styles.rowDetails}>
            {goal.description ? <Text style={styles.goalDescription}>{goal.description}</Text> : null}
            {goal.note ? <Text style={styles.goalNote}>{goal.note}</Text> : null}
            <ItemTags item={{ once: false }} flags={{ due: false, goal: selected, bought: false }} />
            <ItemEffects item={goal} announce={false} />
          </View>
        </View>
        <View style={styles.rowPrice}>
          <CoinPrice amount={goal.price} />
        </View>
      </Pressable>
      {selected ? null : (
        <View style={styles.rowActions}>
          <RowButton
            label={strings.shopMakeGoal}
            spoken={strings.shopMakeGoalA11y(goal.name)}
            icon="star"
            primary
            onPress={onChoose}
          />
        </View>
      )}
    </View>
  );
}

/** Drawer header: big tile, name, price. */
export function DrawerHead({ item, children }: { item: CatalogItemContent; children?: ReactNode }) {
  return (
    <View style={styles.drawerHead}>
      <ItemTile item={item} size={72} />
      <View style={styles.drawerHeadText}>
        <Text style={styles.drawerName}>{item.name}</Text>
        <CoinPrice amount={item.price} large />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileEmoji: {
    textAlign: "center",
  },
  price: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  priceNumber: {
    color: colors.text,
    fontFamily: font.pixel,
    fontSize: 16,
    fontWeight: "400",
    includeFontPadding: false,
    lineHeight: 24,
  },
  priceLarge: {
    fontSize: 24,
    lineHeight: 32,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    alignItems: "center",
    borderRadius: 10,
    minHeight: 24,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  effects: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  effect: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    maxWidth: "100%",
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  effectText: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "600",
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  rowButton: {
    borderRadius: 12,
    flex: 1,
  },
  rowButtonPrimary: {
    backgroundColor: colors.raisedEdge,
    paddingBottom: 3,
  },
  rowButtonSecondary: {
    backgroundColor: colors.card,
    borderColor: colors.disabledFace,
    borderWidth: 2,
  },
  rowButtonFace: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.s,
    justifyContent: "center",
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  rowButtonFacePrimary: {
    backgroundColor: colors.raisedFace,
  },
  rowButtonPressed: {
    opacity: 0.75,
  },
  rowButtonLabel: {
    color: colors.accentText,
    fontSize: type.button,
    fontWeight: "700",
  },
  rowButtonLabelPrimary: {
    color: colors.onRaised,
  },
  segments: {
    backgroundColor: colors.track,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  segment: {
    backgroundColor: colors.track,
    borderRadius: 12,
    flex: 1,
    paddingBottom: 3,
  },
  segmentOn: {
    backgroundColor: colors.accent,
  },
  segmentFace: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: minTarget - 3,
    paddingHorizontal: spacing.s,
  },
  segmentFaceOn: {
    backgroundColor: colors.card,
  },
  // The 3 dp edge moves above the face: the face drops by the edge height.
  segmentPressed: {
    backgroundColor: colors.disabledFace,
    paddingBottom: 0,
    paddingTop: 3,
  },
  segmentFacePressed: {
    backgroundColor: colors.highlight,
  },
  segmentLabel: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  segmentLabelOn: {
    color: colors.text,
  },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: radius.card,
    borderWidth: 2,
    gap: spacing.s,
    padding: 12,
  },
  rowMarked: {
    backgroundColor: colors.highlight,
    borderColor: colors.accent,
  },
  rowInfo: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    minHeight: minTarget,
  },
  rowMiddle: {
    flex: 1,
    gap: 6,
  },
  rowDetails: {
    gap: 6,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  goalNote: {
    color: colors.accentText,
    fontSize: type.body,
    fontWeight: "700",
  },
  goalDescription: {
    color: colors.subtle,
    fontSize: type.body,
  },
  rowPrice: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 96,
  },
  shortfall: {
    color: colors.subtle,
    fontSize: 13,
    textAlign: "right",
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.s,
  },
  drawerHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.m,
  },
  drawerHeadText: {
    flex: 1,
    gap: spacing.s,
  },
  drawerName: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
});
