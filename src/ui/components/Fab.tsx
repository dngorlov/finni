import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, minTarget, spacing } from "../theme";

const SIZE = 64;
const EDGE = 5;

/**
 * Round raised game button with a short caption under it (Главная: Магазин,
 * Итоги, Подарок; Карта: Словарик). Place several inside <FabStack>.
 */
export function Fab({
  label,
  icon,
  onPress,
  disabled,
  accessibilityHint,
  badge,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Small counter dot, e.g. unpaid Счета. */
  badge?: number;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={Boolean(disabled)}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={styles.hit}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.shell,
              disabled ? styles.shellOff : null,
              pressed && !disabled ? styles.shellPressed : null,
            ]}
          >
            <View style={[styles.face, disabled ? styles.faceOff : null]}>{icon}</View>
            {badge ? (
              <View style={styles.badge} aria-hidden>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text aria-hidden style={styles.caption}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Column of FABs floating over a screen corner. Карта keeps Словарик on the right; Дом keeps Подарок on the left. */
export function FabStack({
  children,
  bottom = spacing.m,
  side = "right",
  testID,
}: {
  children: ReactNode;
  bottom?: number;
  side?: "left" | "right";
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={[styles.stack, side === "left" ? styles.stackLeft : styles.stackRight, { bottom }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: "center",
    gap: spacing.m,
    position: "absolute",
  },
  stackLeft: {
    left: spacing.m,
  },
  stackRight: {
    right: spacing.m,
  },
  hit: {
    alignItems: "center",
    minHeight: minTarget,
    minWidth: minTarget,
  },
  shell: {
    backgroundColor: colors.raisedEdge,
    borderRadius: SIZE / 2,
    paddingBottom: EDGE,
  },
  shellPressed: {
    paddingBottom: 0,
    paddingTop: EDGE,
  },
  shellOff: {
    backgroundColor: colors.disabledFace,
  },
  face: {
    alignItems: "center",
    backgroundColor: colors.raisedFace,
    borderColor: colors.card,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    height: SIZE,
    justifyContent: "center",
    width: SIZE,
  },
  faceOff: {
    backgroundColor: colors.track,
  },
  caption: {
    backgroundColor: colors.card,
    borderRadius: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    overflow: "hidden",
    paddingHorizontal: 6,
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#BA1A1A",
    borderColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    position: "absolute",
    right: -4,
    top: -4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
