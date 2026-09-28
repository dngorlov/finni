import { useContext, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { useAnimationsOn } from "../motion";
import { strings } from "../strings";
import { colors, radius, spacing } from "../theme";
import { AppModal } from "./AppModal";
import { useLatest } from "./useLatest";

/** A pull this far down (dp), or a quarter of the sheet when that is shorter, closes it. */
const CLOSE_DISTANCE = 96;
/** A flick at this speed (dp/ms) closes it even when the pull was short. */
const CLOSE_VELOCITY = 0.8;

/** Whether a finished downward drag should close the sheet or let it snap back. */
export function shouldCloseSheet(dy: number, vy: number, sheetHeight: number): boolean {
  if (dy <= 0) return false;
  if (vy >= CLOSE_VELOCITY) return true;
  const distance = sheetHeight > 0 ? Math.min(CLOSE_DISTANCE, sheetHeight / 4) : CLOSE_DISTANCE;
  return dy >= distance;
}

/**
 * Bottom drawer: slides up over a dimmed screen. Tap on the dim area, the
 * system Back, or a pull down on the grabber closes it. `footer` holds the
 * action buttons and stays above the system navigation bar.
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
    <AppModal animation="slide" transparent visible statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <SheetBody onClose={onClose} footer={footer}>
        {children}
      </SheetBody>
    </AppModal>
  );
}

function SheetBody({ onClose, children, footer }: { onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  // Context, not the hook: a sheet rendered without a SafeAreaProvider (a lone screen in a test) has no insets.
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  const animate = useAnimationsOn();
  const [offset] = useState(() => new Animated.Value(0));
  const height = useRef(0);
  // The responder is made once; these keep it reading the latest props.
  const latest = useLatest({ onClose, animate });

  /* eslint-disable react-hooks/refs */
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        offset.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => {
        const { onClose: close, animate: moving } = latest.current;
        if (shouldCloseSheet(gesture.dy, gesture.vy, height.current)) {
          if (!moving) {
            close();
            return;
          }
          Animated.timing(offset, {
            toValue: Math.max(height.current, gesture.dy),
            duration: 160,
            useNativeDriver: true,
          }).start(() => close());
          return;
        }
        if (!moving) {
          offset.setValue(0);
          return;
        }
        Animated.spring(offset, { toValue: 0, bounciness: 4, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        offset.setValue(0);
      },
    }),
  );
  /* eslint-enable react-hooks/refs */

  const onLayout = (event: LayoutChangeEvent) => {
    height.current = event.nativeEvent.layout.height;
  };

  return (
    <View style={styles.root}>
      <Pressable role="button" aria-label={strings.sheetClose} onPress={onClose} style={styles.scrim} />
      <Animated.View
        testID="bottom-sheet"
        onLayout={onLayout}
        style={[
          styles.sheet,
          { paddingBottom: Math.max(bottomInset, 0) + spacing.m, transform: [{ translateY: offset }] },
        ]}
      >
        <View testID="bottom-sheet-grabber" aria-hidden style={styles.grabZone} {...responder.panHandlers}>
          <View style={styles.grabber} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
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
    maxHeight: "88%",
  },
  // Full width and 28 tall, so the pull starts anywhere across the top edge.
  grabZone: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
  },
  grabber: {
    backgroundColor: colors.disabledFace,
    borderRadius: 3,
    height: 6,
    width: 48,
  },
  scroll: {
    flexGrow: 0,
  },
  body: {
    gap: 12,
    paddingBottom: spacing.s,
    paddingHorizontal: spacing.l,
  },
  footer: {
    gap: 4,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
  },
});
