import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { buttonIcon } from "../buttonIcon";
import { colors, minTarget, spacing, type } from "../theme";
import { CoinText } from "./CoinText";
import { PixelIcon } from "./Pictogram";

const EDGE = 4;

export function PrimaryButton({
  label,
  disabled,
  highlighted,
  alignStart,
  onPress,
  ...rest
}: { label: string; highlighted?: boolean; alignStart?: boolean } & PressableProps) {
  return (
    <Pressable
      {...rest}
      role="button"
      aria-label={label}
      aria-disabled={Boolean(disabled)}
      aria-selected={highlighted ? true : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        disabled ? styles.shellDisabled : styles.shellRaised,
        !disabled && pressed ? styles.shellPressed : null,
      ]}
    >
      <View
        style={[
          styles.face,
          disabled ? styles.faceDisabled : styles.faceRaised,
          highlighted ? styles.faceMarked : null,
          alignStart ? styles.faceStart : null,
        ]}
      >
        <PixelIcon name={buttonIcon(label)} color={disabled ? colors.subtle : colors.onRaised} />
        <CoinText
          inline
          labelled={false}
          text={label}
          style={[styles.label, disabled ? styles.labelDisabled : null]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 12,
  },
  shellRaised: {
    backgroundColor: colors.raisedEdge,
    paddingBottom: EDGE,
  },
  shellPressed: {
    paddingBottom: 0,
    paddingTop: EDGE,
  },
  shellDisabled: {
    backgroundColor: colors.disabledFace,
  },
  face: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "center",
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  // A column of answers: every icon on one vertical line.
  faceStart: {
    justifyContent: "flex-start",
  },
  faceRaised: {
    backgroundColor: colors.raisedFace,
  },
  faceMarked: {
    backgroundColor: colors.highlight,
  },
  faceDisabled: {
    backgroundColor: colors.disabledFace,
  },
  label: {
    color: colors.onRaised,
    flexShrink: 1,
    fontSize: type.button,
    fontWeight: "700",
  },
  labelDisabled: {
    color: colors.subtle,
  },
});
