import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from "react-native";
import { strings } from "../strings";
import { colors, minTarget } from "../theme";
import { useLatest } from "./useLatest";

const HOLD_DELAY_MS = 400;
const HOLD_INTERVAL_MS = 120;
const BAR_HEIGHT = 20;
const KNOB = 28;
/** Enough diagonal strokes to cover the widest phone track. */
const HATCH = Array.from({ length: 48 }, (_, index) => index);

function percent(part: number, whole: number): `${number}%` {
  return `${whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0}%`;
}

/**
 * One slider over the whole Баланс: what earlier piles already took sits on
 * the left as a hatched, locked block; the handle moves this pile over the
 * rest. −/+ beside it step by one (hold to repeat) for exact amounts.
 */
export function PileSlider({
  label,
  value,
  min,
  max,
  total,
  locked,
  color,
  valueText,
  onChange,
}: {
  /** Pile name: the −/+ buttons say «<label>, меньше / больше». */
  label: string;
  value: number;
  min: number;
  /** Highest amount this pile may take (what earlier piles left). */
  max: number;
  /** The whole track: today's Баланс. */
  total: number;
  /** Earlier piles, left to right. */
  locked: readonly { id: string; value: number; color: string }[];
  color: string;
  /** Spoken value, e.g. «Обязательные 20». */
  valueText: string;
  onChange: (next: number) => void;
}) {
  const before = locked.reduce((sum, part) => sum + part.value, 0);
  const scale = Math.max(total, before + value, 1);
  const minusDisabled = value <= min;
  const plusDisabled = value >= max;

  const valueRef = useLatest(value);
  const minRef = useLatest(min);
  const maxRef = useLatest(max);
  const beforeRef = useLatest(before);
  const scaleRef = useLatest(scale);
  const onChangeRef = useLatest(onChange);

  const repeatingRef = useRef(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (delayRef.current != null) clearTimeout(delayRef.current);
    if (intervalRef.current != null) clearInterval(intervalRef.current);
    delayRef.current = null;
    intervalRef.current = null;
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const stepBy = useCallback(
    (delta: number) => {
      const next = valueRef.current + delta;
      // An amount below the floor (an old draft) may still climb; it never steps further down.
      if (delta < 0 && next < minRef.current) return false;
      if (delta > 0 && next > maxRef.current) return false;
      onChangeRef.current(Math.max(minRef.current, next));
      return true;
    },
    [maxRef, minRef, onChangeRef, valueRef],
  );

  const startHold = useCallback(
    (delta: number) => {
      repeatingRef.current = false;
      clearHold();
      delayRef.current = setTimeout(() => {
        repeatingRef.current = true;
        if (!stepBy(delta)) return;
        intervalRef.current = setInterval(() => {
          if (!stepBy(delta)) clearHold();
        }, HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [clearHold, stepBy],
  );

  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);
  const trackWidthRef = useRef(0);

  const setFromPageX = useCallback(
    (pageX: number) => {
      const width = trackWidthRef.current;
      if (width <= 0) return;
      const x = Math.max(0, Math.min(width, pageX - trackXRef.current));
      const raw = Math.round((x / width) * scaleRef.current) - beforeRef.current;
      const next = Math.max(minRef.current, Math.min(maxRef.current, raw));
      if (next !== valueRef.current) onChangeRef.current(next);
    },
    [beforeRef, maxRef, minRef, onChangeRef, scaleRef, valueRef],
  );

  // PanResponder handlers read refs only when a gesture fires, never during render.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const pageX = event.nativeEvent.pageX;
          trackRef.current?.measureInWindow((x, _y, width) => {
            trackXRef.current = x;
            trackWidthRef.current = width;
            setFromPageX(pageX);
          });
        },
        onPanResponderMove: (event: GestureResponderEvent) => setFromPageX(event.nativeEvent.pageX),
      }),
    [setFromPageX],
  );
  /* eslint-enable react-hooks/refs */

  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") stepBy(1);
    if (event.nativeEvent.actionName === "decrement") stepBy(-1);
  };

  const step = (delta: 1 | -1) => (
    <Pressable
      role="button"
      aria-label={delta > 0 ? strings.bucketPlus(label) : strings.bucketMinus(label)}
      aria-disabled={delta > 0 ? plusDisabled : minusDisabled}
      disabled={delta > 0 ? plusDisabled : minusDisabled}
      onPressIn={() => startHold(delta)}
      onPressOut={clearHold}
      onPress={() => {
        if (repeatingRef.current) return;
        stepBy(delta);
      }}
      style={({ pressed }) => [styles.step, pressed ? styles.stepPressed : null]}
    >
      <Text style={[styles.stepLabel, (delta > 0 ? plusDisabled : minusDisabled) ? styles.stepOff : null]}>
        {delta > 0 ? "+" : "−"}
      </Text>
    </Pressable>
  );

  const starts = locked.map((_, index) => locked.slice(0, index).reduce((sum, part) => sum + part.value, 0));
  return (
    <View style={styles.row}>
      {step(-1)}
      <View
        ref={trackRef}
        accessible
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAction}
        onLayout={(event) => {
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
        style={styles.hit}
        {...pan.panHandlers}
      >
        <View style={styles.bar}>
          {locked.map((part, index) => {
            const start = starts[index] ?? 0;
            return part.value <= 0 ? null : (
              <View
                key={part.id}
                style={[
                  styles.segment,
                  { backgroundColor: part.color, left: percent(start, scale), width: percent(part.value, scale) },
                ]}
              />
            );
          })}
          {before > 0 ? (
            <View style={[styles.hatch, { width: percent(before, scale) }]}>
              {HATCH.map((index) => (
                <View key={index} style={[styles.stroke, { left: index * 10 - BAR_HEIGHT }]} />
              ))}
            </View>
          ) : null}
          <View
            style={[
              styles.segment,
              { backgroundColor: color, left: percent(before, scale), width: percent(value, scale) },
            ]}
          />
          {before > 0 ? <View style={[styles.divider, { left: percent(before, scale) }]} /> : null}
        </View>
        <View style={[styles.knob, { borderColor: color, left: percent(before + value, scale) }]} />
      </View>
      {step(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  step: {
    alignItems: "center",
    backgroundColor: colors.track,
    borderRadius: minTarget / 2,
    height: minTarget,
    justifyContent: "center",
    width: minTarget,
  },
  stepPressed: {
    backgroundColor: colors.highlight,
  },
  stepLabel: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  stepOff: {
    color: colors.disabledFace,
  },
  hit: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: KNOB / 2,
    minHeight: minTarget,
  },
  bar: {
    backgroundColor: colors.track,
    borderRadius: BAR_HEIGHT / 2,
    height: BAR_HEIGHT,
    overflow: "hidden",
  },
  segment: {
    bottom: 0,
    position: "absolute",
    top: 0,
  },
  hatch: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  stroke: {
    backgroundColor: colors.card,
    height: BAR_HEIGHT * 2,
    opacity: 0.45,
    position: "absolute",
    top: -BAR_HEIGHT / 2,
    transform: [{ rotate: "45deg" }],
    width: 3,
  },
  divider: {
    backgroundColor: colors.text,
    bottom: 0,
    marginLeft: -1,
    position: "absolute",
    top: 0,
    width: 2,
  },
  knob: {
    backgroundColor: colors.card,
    borderRadius: KNOB / 2,
    borderWidth: 4,
    height: KNOB,
    marginLeft: -KNOB / 2,
    position: "absolute",
    top: (minTarget - KNOB) / 2,
    width: KNOB,
  },
});
