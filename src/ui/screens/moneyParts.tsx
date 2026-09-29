import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CoinAmount } from "../components/CoinText";
import { PixelIcon } from "../components/Pictogram";
import { PixelSprite } from "../components/PixelSprite";
import type { PixelIconName } from "../pixelIconXml";
import { dayStrings } from "../stringsDay";
import { moneyStrings } from "../stringsMoney";
import { colors, font, minTarget, radius, spacing, type } from "../theme";

/** Bank-app look shared by Копилка, План, Журнал and Банк. */
export const moneyColors = {
  /** Account card: the shared hero fill with light text (white on #855400 is 6:1). */
  heroFace: colors.heroFill,
  heroText: "#FFFFFF",
  heroSubtle: colors.highlight,
  /** Empty part of a bar on the hero: a lighter step of `colors.heroFill`. */
  heroTrack: "rgba(255,255,255,0.22)",
  /** Money in (≥4.5:1 on white, 7.4:1). */
  plus: "#4F5B00",
  /** Money out (≥4.5:1 on white, 7.6:1). */
  minus: "#9B2C14",
  goal: "#8C4A60",
  free: colors.disabledFace,
} as const;

/** Green when coins arrived, red when they left, muted at zero. */
export function amountColor(amount: number): string {
  if (amount > 0) return moneyColors.plus;
  if (amount < 0) return moneyColors.minus;
  return colors.subtle;
}

/** Amount in the pixel face with the coin sprite. */
export function Amount({
  value,
  signed,
  size = 16,
  color = colors.text,
}: {
  value: number;
  signed?: boolean;
  size?: number;
  color?: string;
}) {
  const text = signed ? moneyStrings.signed(value) : String(value);
  return (
    <View style={styles.amount}>
      <CoinAmount value={text} style={[styles.pixel, { color, fontSize: size, lineHeight: Math.round(size * 1.5) }]} />
    </View>
  );
}

/** The account-card hero at the top of a section. */
export function HeroCard({
  caption,
  value,
  label,
  signed,
  compact,
  children,
}: {
  caption: string;
  value: number;
  /** Spoken amount line. */
  label: string;
  /** Show a leading + when this is money that just arrived. */
  signed?: boolean;
  /** Caption and amount on one line, a smaller number — for screens where the hero is not the star. */
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={[styles.hero, compact ? styles.heroCompact : null]}>
      <View style={compact ? styles.heroRow : null}>
        <Text style={[styles.heroCaption, compact ? styles.heroCaptionCompact : null]}>{caption}</Text>
        <View accessible aria-label={label}>
          <Amount value={value} signed={signed} size={compact ? 20 : 32} color={moneyColors.heroText} />
        </View>
      </View>
      {children}
    </View>
  );
}

/** Thin progress bar; `on` picks the hero or the card colors. */
export function ProgressBar({
  value,
  max,
  on = "card",
  color = colors.fill,
}: {
  value: number;
  max: number;
  on?: "hero" | "card";
  color?: string;
}) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { backgroundColor: on === "hero" ? moneyColors.heroTrack : colors.track }]}
    >
      <View style={[styles.barFill, { backgroundColor: color, width: `${share * 100}%` }]} />
    </View>
  );
}

/** Two shares of one track, side by side. A zero share is left out; both zero stays empty. */
export function SplitBar({
  leading,
  trailing,
  leadingColor,
  trailingColor,
}: {
  leading: number;
  trailing: number;
  leadingColor: string;
  trailingColor: string;
}) {
  const lead = Math.max(0, leading);
  const trail = Math.max(0, trailing);
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, styles.barSplit]}
    >
      {lead > 0 ? <View style={[styles.barSplitFill, { backgroundColor: leadingColor, flex: lead }]} /> : null}
      {trail > 0 ? <View style={[styles.barSplitFill, { backgroundColor: trailingColor, flex: trail }]} /> : null}
    </View>
  );
}

/** Small stat tile: caption on top, pixel number below. */
export function StatTile({
  label,
  value,
  spoken,
  coin = true,
  color,
}: {
  label: string;
  value: number;
  spoken: string;
  coin?: boolean;
  color?: string;
}) {
  return (
    <View accessible aria-label={spoken} style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {coin ? (
        <Amount value={value} size={16} color={color} />
      ) : (
        <Text style={[styles.pixel, styles.tileNumber, color ? { color } : null]}>{value}</Text>
      )}
    </View>
  );
}

export function TileRow({ children }: { children: ReactNode }) {
  return <View style={styles.tileRow}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text role="heading" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

/** Round quick action with a caption under it (Положить / Забрать / Цель). */
export function RoundAction({
  label,
  icon,
  onPress,
  disabled,
  highlighted,
}: {
  label: string;
  icon: PixelIconName;
  onPress: () => void;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={Boolean(disabled)}
      aria-selected={highlighted ? true : undefined}
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.actionEdge, disabled ? styles.actionEdgeOff : null, pressed && !disabled ? styles.actionPressed : null]}>
            <View
              style={[
                styles.actionFace,
                disabled ? styles.actionFaceOff : null,
                highlighted ? styles.actionFaceMarked : null,
              ]}
            >
              <PixelIcon name={icon} size={28} color={disabled ? colors.subtle : colors.onRaised} />
            </View>
          </View>
          <Text aria-hidden style={[styles.actionCaption, disabled ? styles.actionCaptionOff : null]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function ActionRow({ children }: { children: ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

/** Bank-statement row: icon in a circle, title and subtitle, amount on the right. */
export function OpRow({
  icon,
  tint,
  title,
  subtitle,
  amount,
  label,
  last,
}: {
  icon: PixelIconName;
  tint: string;
  title: string;
  subtitle?: string;
  amount: number;
  label: string;
  last?: boolean;
}) {
  const color = amountColor(amount);
  return (
    <View accessible aria-label={label} style={[styles.op, last ? null : styles.opDivider]}>
      <View style={styles.opIcon}>
        {icon === "coins" ? <PixelSprite name="coin" size={24} /> : <PixelIcon name={icon} size={24} color={tint} />}
      </View>
      <View style={styles.opText}>
        <Text style={styles.opTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.opSubtitle}>{subtitle}</Text> : null}
      </View>
      <Amount value={amount} signed size={14} color={color} />
    </View>
  );
}

export type LegendRow = { id: string; label: string; color: string; amount: number; percent: number };

/** Chart legend with the numbers the ring only hints at. */
export function Legend({ rows }: { rows: readonly LegendRow[] }) {
  return (
    <View style={styles.legend}>
      {rows.map((row) => (
        <View
          key={row.id}
          accessible
          aria-label={moneyStrings.legendRow(row.label, row.amount)}
          style={styles.legendRow}
        >
          <View style={[styles.legendDot, { backgroundColor: row.color }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {row.label}
          </Text>
          <Amount value={row.amount} size={12} />
        </View>
      ))}
    </View>
  );
}

/** Pill tabs / chips row (Траты / Доходы, money sections). */
export function PillRow<T extends string>({
  options,
  value,
  onChange,
  grow,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  grow?: boolean;
}) {
  return (
    <View style={[styles.pills, grow ? styles.pillsTrack : null]}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            role="button"
            aria-label={option.label}
            aria-selected={selected}
            onPress={() => onChange(option.id)}
            style={[
              styles.pill,
              grow ? styles.pillGrow : styles.pillRing,
              selected ? (grow ? styles.pillSegmentOn : styles.pillOn) : grow ? null : styles.pillOff,
            ]}
          >
            {grow ? (
              <View style={[styles.pillSegmentFace, selected ? styles.pillSegmentFaceOn : null]}>
                <Text style={styles.pillText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {option.label}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.pillText, selected ? styles.pillTextOn : null]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact menu: one chip, the rest of the choices drop open under it. */
export function Dropdown<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: (current: string) => string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === value) ?? options[0];
  return (
    <View style={styles.dropdown}>
      <Pressable
        role="button"
        aria-label={label(current.label)}
        aria-expanded={open}
        onPress={() => setOpen((was) => !was)}
        style={styles.dropdownTrigger}
      >
        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
          {current.label}
        </Text>
        <View style={open ? styles.dropdownChevronOpen : null}>
          <PixelIcon name="chevron-down" size={20} color={colors.text} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.dropdownList}>
          {options.map((option, index) => {
            const selected = option.id === value;
            return (
              <Pressable
                key={option.id}
                role="button"
                aria-label={option.label}
                aria-selected={selected}
                onPress={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                style={[
                  styles.dropdownOption,
                  index < options.length - 1 ? styles.dropdownDivider : null,
                  selected ? styles.dropdownOptionOn : null,
                ]}
              >
                <Text style={styles.dropdownOptionText}>{option.label}</Text>
                {selected ? (
                  <PixelIcon name="check" size={20} color={colors.text} />
                ) : (
                  <View style={styles.dropdownCheck} />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Folds a long list: «Показать все (N)» / «Свернуть», a full-width 48 dp row. */
export function ShowAllButton({
  expanded,
  total,
  onPress,
}: {
  expanded: boolean;
  total: number;
  onPress: () => void;
}) {
  const label = expanded ? dayStrings.showLess : dayStrings.showAll(total);
  return (
    <Pressable role="button" aria-label={label} aria-expanded={expanded} onPress={onPress} style={styles.showAll}>
      <Text style={styles.showAllText}>{label}</Text>
      <View style={expanded ? styles.dropdownChevronOpen : null}>
        <PixelIcon name="chevron-down" size={20} color={colors.accentText} />
      </View>
    </Pressable>
  );
}

export function MoneyCard({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return <View style={[styles.card, tight ? styles.cardTight : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  pixel: {
    fontFamily: font.pixel,
    fontWeight: "400",
  },
  amount: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
  },
  hero: {
    backgroundColor: moneyColors.heroFace,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m + 4,
  },
  heroCompact: {
    gap: 6,
    padding: spacing.m,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "space-between",
  },
  heroCaption: {
    color: moneyColors.heroSubtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  heroCaptionCompact: {
    flexShrink: 1,
  },
  bar: {
    borderRadius: 6,
    height: 12,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 6,
    height: 12,
  },
  barSplit: {
    flexDirection: "row",
  },
  barSplitFill: {
    height: 12,
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.s,
  },
  tile: {
    backgroundColor: colors.card,
    borderRadius: 16,
    flex: 1,
    gap: spacing.s,
    justifyContent: "space-between",
    minHeight: 80,
    padding: 12,
  },
  tileLabel: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: "700",
  },
  tileNumber: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
    marginTop: spacing.s,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  action: {
    alignItems: "center",
    gap: 6,
    minHeight: minTarget,
    minWidth: 80,
  },
  actionEdge: {
    backgroundColor: colors.raisedEdge,
    borderRadius: 32,
    paddingBottom: 4,
  },
  actionEdgeOff: {
    backgroundColor: colors.disabledFace,
  },
  actionPressed: {
    paddingBottom: 0,
    paddingTop: 4,
  },
  actionFace: {
    alignItems: "center",
    backgroundColor: colors.raisedFace,
    borderRadius: 32,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  actionFaceOff: {
    backgroundColor: colors.track,
  },
  actionFaceMarked: {
    backgroundColor: colors.highlight,
  },
  actionCaption: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  actionCaptionOff: {
    color: colors.subtle,
  },
  op: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingVertical: spacing.s,
  },
  opDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  opIcon: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  opText: {
    flex: 1,
    minWidth: 0,
  },
  opTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  opSubtitle: {
    color: colors.subtle,
    fontSize: 13,
    marginTop: 2,
  },
  legend: {
    alignSelf: "stretch",
    gap: 4,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: 32,
  },
  legendDot: {
    borderRadius: 4,
    height: 16,
    width: 16,
  },
  legendLabel: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  pillsTrack: {
    backgroundColor: colors.track,
    borderRadius: 16,
    flexWrap: "nowrap",
    gap: 4,
    padding: 4,
  },
  pill: {
    alignItems: "center",
    borderRadius: 24,
    justifyContent: "center",
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  pillRing: {
    borderWidth: 1,
  },
  pillGrow: {
    backgroundColor: colors.track,
    borderRadius: 12,
    flex: 1,
    paddingBottom: 3,
    paddingHorizontal: 0,
  },
  pillOff: {
    backgroundColor: colors.card,
    borderColor: colors.track,
  },
  pillOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  pillSegmentOn: {
    backgroundColor: colors.accent,
  },
  pillSegmentFace: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.track,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: minTarget - 3,
    paddingHorizontal: 4,
  },
  pillSegmentFaceOn: {
    backgroundColor: colors.card,
  },
  pillText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  pillTextOn: {
    color: "#FFFFFF",
  },
  dropdown: {
    alignSelf: "flex-start",
    gap: 4,
  },
  dropdownTrigger: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  dropdownTriggerText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  dropdownChevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  dropdownList: {
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.m,
    justifyContent: "space-between",
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
  },
  dropdownOptionOn: {
    backgroundColor: colors.highlight,
  },
  dropdownDivider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  dropdownOptionText: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  dropdownCheck: {
    width: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  cardTight: {
    paddingVertical: spacing.s,
  },
  showAll: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "center",
    minHeight: minTarget,
  },
  showAllText: {
    color: colors.accentText,
    fontSize: type.body,
    fontWeight: "700",
  },
});
