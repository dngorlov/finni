import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ACHIEVEMENT_RULES, type AchievementId } from "../../core/achievements";
import type { EarnedAchievement } from "../../data/repositories/gameRepository";
import { META_KEYS } from "../../data/metaKeys";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { ACHIEVEMENT_COPY, ACHIEVEMENT_TOTAL, achievementStrings } from "../stringsAchievements";
import { colors, spacing, type } from "../theme";
import { AchievementModal } from "./AchievementModal";
import { MoneyCard, SectionTitle, ShowAllButton } from "../screens/moneyParts";

function copyFor(id: string) {
  if (Object.prototype.hasOwnProperty.call(ACHIEVEMENT_COPY, id)) {
    return ACHIEVEMENT_COPY[id as AchievementId];
  }
  return null;
}

const NO_ACHIEVEMENTS: EarnedAchievement[] = [];

function sameEarned(left: readonly EarnedAchievement[], right: readonly EarnedAchievement[]) {
  return (
    left.length === right.length &&
    left.every((row, index) => {
      const other = right[index];
      return other != null && row.id === other.id && row.dayN === other.dayN && row.celebrated === other.celebrated;
    })
  );
}

/**
 * The active profile is read on every snapshot, not once at mount: the host
 * mounts before Первый запуск writes the profile, and nothing re-renders it
 * after. Reading it once left the first profile's rewards silent until the
 * next launch.
 */
function useEarned() {
  const { game, meta } = useSession();
  const cache = useRef<{ key: string; rows: EarnedAchievement[] }>({ key: "", rows: NO_ACHIEVEMENTS });

  const subscribe = useCallback((listener: () => void) => game.subscribe(listener), [game]);
  const getSnapshot = useCallback(() => {
    const profileId = meta.get(META_KEYS.activeProfileId);
    if (!profileId) return NO_ACHIEVEMENTS;
    let next: EarnedAchievement[];
    try {
      next = game.listAchievements(profileId);
    } catch {
      // Удалить профиль leaves the id behind for a moment.
      return NO_ACHIEVEMENTS;
    }
    if (cache.current.key === profileId && sameEarned(cache.current.rows, next)) return cache.current.rows;
    cache.current = { key: profileId, rows: next };
    return next;
  }, [game, meta]);
  const rows = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { profileId: meta.get(META_KEYS.activeProfileId), rows, game };
}

function AchievementRow({
  id,
  earned,
  dayN,
}: {
  id: AchievementId;
  earned: boolean;
  dayN?: number;
}) {
  const copy = ACHIEVEMENT_COPY[id];
  const line = earned
    ? dayN != null
      ? `${copy.detail} ${strings.journalDay(dayN)}`
      : copy.detail
    : copy.hint;
  return (
    <View
      accessible
      aria-label={achievementStrings.rowA11y(
        copy.title,
        earned ? `${achievementStrings.earned}. ${line}` : line,
      )}
      style={styles.row}
    >
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.tile, { backgroundColor: earned ? colors.highlight : colors.track }]}
      >
        <Text style={styles.emoji}>{copy.emoji}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.line}>{line}</Text>
      </View>
      {earned ? (
        <View aria-hidden style={styles.tag}>
          <Text style={styles.tagText}>{achievementStrings.earned}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function useEarnedAchievementCount() {
  return useEarned().rows.length;
}

/** Full catalog: «N/16» beside the title, then every Достижение. */
export function AchievementCatalog() {
  const { rows } = useEarned();
  const earned = new Map(rows.map((row) => [row.id, row]));
  return (
    <>
      <View style={styles.titleRow}>
        <Text role="heading" style={styles.heading}>
          {achievementStrings.section}
        </Text>
        <Text
          accessibilityLabel={achievementStrings.progressA11y(rows.length, ACHIEVEMENT_TOTAL)}
          style={styles.count}
        >
          {achievementStrings.progressCompact(rows.length, ACHIEVEMENT_TOTAL)}
        </Text>
      </View>
      <MoneyCard tight>
        {ACHIEVEMENT_RULES.map((rule, index) => (
          <View key={rule.id} style={index === ACHIEVEMENT_RULES.length - 1 ? null : styles.divider}>
            <AchievementRow id={rule.id} earned={earned.has(rule.id)} />
          </View>
        ))}
      </MoneyCard>
    </>
  );
}

/**
 * Earned Достижения on Журнал, Итоги, and Итоги дня.
 * `dayN` keeps only the ones earned that Игровой день; `collapseAfter` shows
 * that many and folds the rest behind «Показать все».
 */
export function EarnedAchievements({ dayN, collapseAfter }: { dayN?: number; collapseAfter?: number }) {
  const { rows } = useEarned();
  const [expanded, setExpanded] = useState(false);
  const shown = rows.filter((row) => (dayN == null ? true : row.dayN === dayN));
  if (dayN != null && shown.length === 0) return null;
  const foldable = collapseAfter != null && shown.length > collapseAfter;
  const visible = foldable && !expanded ? shown.slice(0, collapseAfter) : shown;
  return (
    <>
      <SectionTitle>{achievementStrings.section}</SectionTitle>
      {shown.length === 0 ? <Text style={styles.empty}>{achievementStrings.empty}</Text> : null}
      {shown.length > 0 ? (
        <MoneyCard tight>
          {visible.map((row, index) => {
            const copy = copyFor(row.id);
            if (!copy) return null;
            return (
              <View key={row.id} style={index === visible.length - 1 && !foldable ? null : styles.divider}>
                <AchievementRow id={row.id as AchievementId} earned dayN={row.dayN} />
              </View>
            );
          })}
          {foldable ? (
            <ShowAllButton expanded={expanded} total={shown.length} onPress={() => setExpanded((was) => !was)} />
          ) : null}
        </MoneyCard>
      ) : null}
    </>
  );
}

/** Pops the reward modal for each Достижение not yet dismissed. */
export function AchievementHost() {
  const { profileId, rows, game } = useEarned();
  const pending = rows.filter((row) => !row.celebrated && copyFor(row.id) != null);
  const current = pending[0];
  const copy = current ? copyFor(current.id) : null;
  if (!profileId || !current || !copy) return null;
  return (
    <AchievementModal
      copy={copy}
      more={pending.length > 1}
      onDismiss={() => game.celebrateAchievement(profileId, current.id)}
    />
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.m,
  },
  heading: {
    color: colors.text,
    flex: 1,
    fontSize: type.section,
    fontWeight: "700",
  },
  count: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingVertical: spacing.s,
  },
  tile: {
    alignItems: "center",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 34,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  line: {
    color: colors.subtle,
    fontSize: type.body,
  },
  tag: {
    backgroundColor: colors.badgeFill,
    borderRadius: 12,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    borderBottomColor: colors.track,
    borderBottomWidth: 1,
  },
  empty: {
    color: colors.subtle,
    fontSize: type.body,
  },
});
