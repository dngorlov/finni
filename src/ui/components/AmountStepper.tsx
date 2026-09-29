import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLatest } from "./useLatest";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { Pictogram } from "./Pictogram";
import { CoinText } from "./CoinText";

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 120;

type AmountStepperProps = {
  label: string;
  pictogram: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Floor for −, hold-repeat, and the track (default 0). */
  min?: number;
  /** Spoken amount when it should include the coin count, not only the visible label. */
  amountLabel?: string;
  /** Track fill. Defaults to the shared green. */
  trackColor?: string;
  /** Tighter label and a thin track. The −/+ targets stay at the minimum size. */
  dense?: boolean;
} & ({ showTrack?: false; max?: number } | { showTrack: true; max: number });

export function AmountStepper({
  label,
  pictogram,
  value,
  onChange,
  disabled,
  max,
  showTrack,
  min = 0,
  amountLabel,
  trackColor,
  dense,
}: AmountStepperProps) {
  const plusDisabled = Boolean(disabled) || (max != null && value >= max);
  const minusDisabled = Boolean(disabled) || value <= min;
  const trackOn = showTrack === true;
  const fillWidth = `${Math.max(0, Math.min(100, trackOn && max > 0 ? (value / max) * 100 : 0))}%` as const;

  const valueRef = useLatest(value);
  const onChangeRef = useLatest(onChange);
  const maxRef = useLatest(max);
  const minRef = useLatest(min);
  const disabledRef = useLatest(disabled);

  const repeatingRef = useRef(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (delayRef.current != null) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const stepBy = useCallback(
    (delta: number) => {
      if (disabledRef.current) {
        return false;
      }
      const next = valueRef.current + delta;
      const cap = maxRef.current;
      if (next < minRef.current || (cap != null && next > cap)) {
        return false;
      }
      onChangeRef.current(next);
      return true;
    },
    [disabledRef, maxRef, minRef, onChangeRef, valueRef],
  );

  const startHold = useCallback(
    (delta: number) => {
      if (showTrack !== true) {
        return;
      }
      repeatingRef.current = false;
      clearHold();
      delayRef.current = setTimeout(() => {
        repeatingRef.current = true;
        if (!stepBy(delta)) {
          return;
        }
        intervalRef.current = setInterval(() => {
          if (!stepBy(delta)) {
            clearHold();
          }
        }, HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [clearHold, showTrack, stepBy],
  );

  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View>(null);

  const setFromPageX = useCallback(
    (pageX: number) => {
      if (disabledRef.current) {
        return;
      }
      const cap = maxRef.current;
      if (cap == null) {
        return;
      }
      const width = trackWidthRef.current;
      if (width <= 0) {
        return;
      }
      const x = Math.max(0, Math.min(width, pageX - trackPageXRef.current));
      const raw = cap === 0 ? 0 : Math.round((x / width) * cap);
      onChangeRef.current(Math.max(minRef.current, raw));
    },
    [disabledRef, maxRef, minRef, onChangeRef],
  );

  // PanResponder handlers read refs only when a gesture fires, never during render.
  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const pageX = event.nativeEvent.pageX;
          trackRef.current?.measureInWindow((originX) => {
            trackPageXRef.current = originX;
            setFromPageX(pageX);
          });
        },
        onPanResponderMove: (event: GestureResponderEvent) => {
          setFromPageX(event.nativeEvent.pageX);
        },
      }),
    [disabledRef, setFromPageX],
  );
  /* eslint-enable react-hooks/refs */

  const onTrackLayout = (event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  };

  const minus = (
    <Pressable
      role="button"
      aria-label={strings.bucketMinus(label)}
      aria-disabled={minusDisabled}
      disabled={minusDisabled}
      onPressIn={() => startHold(-1)}
      onPressOut={clearHold}
      onPress={() => {
        if (repeatingRef.current) {
          return;
        }
        onChange(value - 1);
      }}
      style={styles.step}
    >
      <Text style={[styles.stepLabel, dense ? styles.stepLabelDense : null]}>−</Text>
    </Pressable>
  );

  const plus = (
    <Pressable
      role="button"
      aria-label={strings.bucketPlus(label)}
      aria-disabled={plusDisabled}
      disabled={plusDisabled}
      onPressIn={() => startHold(1)}
      onPressOut={clearHold}
      onPress={() => {
        if (repeatingRef.current) {
          return;
        }
        onChange(value + 1);
      }}
      style={styles.step}
    >
      <Text style={[styles.stepLabel, dense ? styles.stepLabelDense : null]}>+</Text>
    </Pressable>
  );

  const valueText = <CoinText coin text={strings.bucketValue("", value)} style={styles.value} />;

  const heading = (
    <>
      <Pictogram glyph={pictogram} size={dense ? 20 : 24} />
      <Text
        style={[styles.label, dense ? styles.labelDense : null]}
        aria-label={amountLabel}
        numberOfLines={dense ? 1 : undefined}
      >
        {label}
      </Text>
    </>
  );

  if (!trackOn) {
    return (
      <View style={styles.row}>
        {heading}
        {minus}
        {valueText}
        {plus}
      </View>
    );
  }

  return (
    <View style={[styles.block, dense ? styles.blockDense : null]}>
      <View style={[styles.row, dense ? styles.rowDense : null]}>
        {heading}
        {valueText}
      </View>
      <View style={styles.trackRow}>
        {minus}
        <View
          ref={trackRef}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          onLayout={onTrackLayout}
          style={styles.trackHit}
          {...panResponder.panHandlers}
        >
          <View style={[styles.track, dense ? styles.trackDense : null]}>
            <View
              style={[
                styles.fill,
                dense ? styles.fillDense : null,
                { width: fillWidth },
                trackColor ? { backgroundColor: trackColor } : null,
              ]}
            />
          </View>
        </View>
        {plus}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.s,
  },
  blockDense: {
    gap: 4,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  rowDense: {
    flexWrap: "nowrap",
  },
  trackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  label: {
    color: colors.text,
    flexGrow: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  labelDense: {
    flexShrink: 1,
  },
  step: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: minTarget,
    minWidth: minTarget,
  },
  stepLabel: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  stepLabelDense: {
    fontSize: type.section,
  },
  value: {
    color: colors.text,
    fontSize: type.body,
    minWidth: 48,
    textAlign: "center",
  },
  trackHit: {
    flex: 1,
    justifyContent: "center",
    minHeight: minTarget,
  },
  track: {
    backgroundColor: colors.track,
    borderRadius: radius.card,
    height: spacing.l,
    overflow: "hidden",
  },
  trackDense: {
    borderRadius: 8,
    height: 16,
  },
  fill: {
    backgroundColor: colors.fill,
    borderRadius: radius.card,
    height: spacing.l,
  },
  fillDense: {
    borderRadius: 8,
    height: 16,
  },
});
