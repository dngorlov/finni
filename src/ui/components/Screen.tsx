import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";
import { useBottomInset } from "./safeBottom";

export function Screen({
  children,
  footer,
  header,
  keyboardShouldPersistTaps,
}: {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  keyboardShouldPersistTaps?: "always" | "handled" | "never";
}) {
  // Inside a modal the navigation bar overlaps the window; lift the buttons above it.
  const bottomInset = useBottomInset();
  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={styles.grow}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        style={styles.scroll}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, bottomInset > 0 ? { paddingBottom: spacing.l + bottomInset } : null]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.m,
    padding: spacing.l,
  },
  footer: {
    backgroundColor: colors.background,
    gap: spacing.s,
    paddingBottom: spacing.l,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
});
