import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DailyRewardCell } from "../../core/dailyReward";
import { AppModal } from "../components/AppModal";
import { BottomSheet } from "../components/BottomSheet";
import { CoinAmount, CoinText } from "../components/CoinText";
import { PixelSprite } from "../components/PixelSprite";
import { PixelIcon } from "../components/Pictogram";
import { PrimaryButton } from "../components/PrimaryButton";
import { homeStrings } from "../stringsHome";
import { strings } from "../strings";
import { colors, radius, spacing, type } from "../theme";

/** The round of gifts. Only the current step shows its coins and can be taken. */
export function DailyRewardCalendar({
  cells,
  onClose,
  onClaim,
}: {
  cells: readonly DailyRewardCell[];
  onClose: () => void;
  onClaim: () => void;
}) {
  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.title}>{homeStrings.giftTitle}</Text>
      <Text style={styles.hint}>{homeStrings.giftHint}</Text>
      <View style={styles.grid}>
        {cells.map((cell) => (
          <RewardCell key={cell.day} cell={cell} onClaim={onClaim} />
        ))}
      </View>
    </BottomSheet>
  );
}

function RewardCell({ cell, onClaim }: { cell: DailyRewardCell; onClaim: () => void }) {
  const day = (
    <Text aria-hidden style={styles.day}>
      {cell.day}
    </Text>
  );
  const face =
    cell.status === "current" ? (
      <CoinAmount value={cell.coins} style={styles.prizeText} size={18} />
    ) : (
      <PixelIcon
        name={cell.status === "claimed" ? "check" : "lock"}
        size={28}
        color={cell.status === "claimed" ? colors.fill : colors.subtle}
      />
    );

  if (cell.status === "current") {
    return (
      <Pressable
        role="button"
        aria-label={homeStrings.giftClaim(cell.coins)}
        aria-selected={true}
        onPress={onClaim}
        style={[styles.cell, styles.current]}
      >
        {day}
        {face}
        <Text aria-hidden style={styles.claim}>
          {homeStrings.giftTake}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      accessible
      aria-label={cell.status === "claimed" ? homeStrings.giftClaimed(cell.day) : homeStrings.giftLocked(cell.day)}
      style={[styles.cell, cell.status === "claimed" ? styles.claimed : styles.locked]}
    >
      {day}
      {face}
    </View>
  );
}

/** What this claim added to Баланс. */
export function DailyRewardGot({ coins, onDismiss }: { coins: number; onDismiss: () => void }) {
  return (
    <AppModal animation="fade" transparent visible onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{homeStrings.giftGotTitle}</Text>
          <View style={styles.got}>
            <PixelSprite name="coin" size={48} />
            <CoinText text={homeStrings.giftGot(coins)} style={styles.gotText} inline />
          </View>
          <PrimaryButton label={strings.gotIt} onPress={onDismiss} />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  hint: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    justifyContent: "center",
  },
  cell: {
    alignItems: "center",
    borderRadius: 16,
    height: 92,
    justifyContent: "center",
    width: 72,
  },
  current: {
    backgroundColor: colors.highlight,
    borderColor: colors.raisedEdge,
    borderWidth: 3,
  },
  claimed: {
    backgroundColor: colors.card,
    borderColor: colors.fill,
    borderWidth: 3,
  },
  locked: {
    backgroundColor: colors.track,
  },
  day: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: "700",
  },
  prizeText: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  claim: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: "700",
  },
  backdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.l,
  },
  sheet: {
    alignSelf: "stretch",
    backgroundColor: colors.background,
    borderRadius: radius.card + 4,
    gap: spacing.m,
    maxWidth: 400,
    padding: spacing.m,
  },
  got: {
    alignItems: "center",
    backgroundColor: colors.highlight,
    borderRadius: radius.card,
    gap: spacing.s,
    padding: spacing.m,
  },
  gotText: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
});
