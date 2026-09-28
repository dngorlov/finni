import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { strings } from "../strings";
import { colors, radius, spacing } from "../theme";
import { AppModal } from "./AppModal";

/**
 * Bottom drawer: slides up over a dimmed screen. Tap on the dim area or the
 * system Back closes it. `footer` holds the action buttons.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!visible) return null;
  return (
    <AppModal animation="slide" transparent visible onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          role="button"
          aria-label={strings.sheetClose}
          onPress={onClose}
          style={styles.scrim}
        />
        <View style={styles.sheet}>
          <View aria-hidden style={styles.grabber} />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "rgba(34, 26, 18, 0.45)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.card + 4,
    borderTopRightRadius: radius.card + 4,
    maxHeight: "85%",
    paddingBottom: spacing.l,
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: colors.disabledFace,
    borderRadius: 3,
    height: 6,
    marginTop: spacing.s,
    width: 48,
  },
  scroll: {
    flexGrow: 0,
  },
  body: {
    gap: spacing.m,
    padding: spacing.l,
  },
  footer: {
    gap: spacing.s,
    paddingHorizontal: spacing.l,
  },
});
