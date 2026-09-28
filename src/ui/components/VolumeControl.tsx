import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { clampVolume, stepVolume } from "../sound/cues";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import { useLatest } from "./useLatest";

/** Hold −/+: the first step lands on press, repeats start after this delay… */
export const VOLUME_REPEAT_DELAY_MS = 400;
/** …and then step every this many ms until release or 0 / 100. */
export const VOLUME_REPEAT_EVERY_MS = 120;

/**
 * Громкость: −/+ step by 10 (hold to keep stepping), and a drag along the track.
 * `onChange` follows the finger and every held step. `onCommit` is the release
 * of a button or the end of a drag, which is when Настройки plays a preview.
 */
export function VolumeControl({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (next: number) => void;
  onCommit: (next: number) => void;
}) {
  // The held button stays enabled until the finger lifts, so its release still commits.
  const [held, setHeld] = useState<-1 | 0 | 1>(0);
  const quieterDisabled = value <= 0 && held !== -1;
  const louderDisabled = value >= 100 && held !== 1;
  const fillWidth = `${clampVolume(value)}%` as const;
  const liveRef = useRef(value);
  useEffect(() => {
    liveRef.current = value;
  }, [value]);
  const onChangeRef = useLatest(onChange);
  const onCommitRef = useLatest(onCommit);
  const trackWidthRef = useRef(0);
  // Window X of the track, locked when the finger goes down. Later locationX
  // values are local to whichever view is under the finger (the fill, the
  // label, the card), so they jump. pageX stays in window space.
  const trackPageXRef = useRef(0);

  const setFromPageX = useCallback(
    (pageX: number) => {
      const width = trackWidthRef.current;
      const origin = trackPageXRef.current;
      if (width <= 0 || !Number.isFinite(pageX) || !Number.isFinite(origin)) return;
      const x = Math.max(0, Math.min(width, pageX - origin));
      const next = clampVolume((x / width) * 100);
      liveRef.current = next;
      onChangeRef.current(next);
    },
    [onChangeRef],
  );

  // Handlers read refs when a finger moves, not while rendering.
  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const { pageX, locationX } = event.nativeEvent;
          if (Number.isFinite(pageX) && Number.isFinite(locationX)) {
            trackPageXRef.current = pageX - locationX;
          }
          setFromPageX(pageX);
        },
        onPanResponderMove: (event: GestureResponderEvent) => {
          setFromPageX(event.nativeEvent.pageX);
        },
        onPanResponderRelease: () => {
          onCommitRef.current(liveRef.current);
        },
      }),
    [onCommitRef, setFromPageX],
  );
  /* eslint-enable react-hooks/refs */

  const onTrackLayout = (event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  };

  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A touch press: pressIn stepped already, so the onPress that follows must not step again.
  const touchRef = useRef<{ out: boolean; pressed: boolean } | null>(null);

  const stopRepeat = useCallback(() => {
    if (delayRef.current != null) clearTimeout(delayRef.current);
    if (repeatRef.current != null) clearInterval(repeatRef.current);
    delayRef.current = null;
    repeatRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stopRepeat();
      if (clearRef.current != null) clearTimeout(clearRef.current);
    },
    [stopRepeat],
  );

  /** One step from the live value. False when already at 0 / 100. */
  const step = useCallback(
    (direction: -1 | 1): boolean => {
      const current = liveRef.current;
      const next = stepVolume(current, direction);
      if (next === current) return false;
      liveRef.current = next;
      onChangeRef.current(next);
      return next > 0 && next < 100;
    },
    [onChangeRef],
  );

  const pressIn = (direction: -1 | 1) => {
    stopRepeat();
    if (clearRef.current != null) clearTimeout(clearRef.current);
    touchRef.current = { out: false, pressed: false };
    setHeld(direction);
    if (!step(direction)) return;
    delayRef.current = setTimeout(() => {
      delayRef.current = null;
      repeatRef.current = setInterval(() => {
        if (!step(direction)) stopRepeat();
      }, VOLUME_REPEAT_EVERY_MS);
    }, VOLUME_REPEAT_DELAY_MS);
  };

  const pressOut = () => {
    stopRepeat();
    setHeld(0);
    const touch = touchRef.current;
    if (touch == null || touch.out) return;
    touch.out = true;
    onCommitRef.current(liveRef.current);
    if (touch.pressed) {
      touchRef.current = null;
      return;
    }
    // onPress, if it comes, arrives in the same release; after that a bare
    // onPress (screen reader activation) is a step of its own again.
    clearRef.current = setTimeout(() => {
      clearRef.current = null;
      touchRef.current = null;
    }, 0);
  };

  /** A tap with no pressIn (screen reader activation): one step and commit, as before. */
  const press = (direction: -1 | 1) => {
    const touch = touchRef.current;
    if (touch != null) {
      touch.pressed = true;
      if (touch.out) touchRef.current = null;
      return;
    }
    const next = stepVolume(liveRef.current, direction);
    liveRef.current = next;
    onCommitRef.current(next);
  };

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text style={styles.label}>{strings.soundVolume}</Text>
        <Text style={styles.value}>{strings.soundLevel(value)}</Text>
      </View>
      <View style={styles.trackRow}>
        <Pressable
          role="button"
          aria-label={strings.soundQuieter}
          aria-disabled={quieterDisabled}
          disabled={quieterDisabled}
          onPressIn={() => pressIn(-1)}
          onPressOut={pressOut}
          onPress={() => press(-1)}
          style={styles.step}
        >
          <Text style={styles.stepLabel}>−</Text>
        </Pressable>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          collapsable={false}
          pointerEvents="box-only"
          onLayout={onTrackLayout}
          style={styles.trackHit}
          {...panResponder.panHandlers}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: fillWidth }]} />
          </View>
        </View>
        <Pressable
          role="button"
          aria-label={strings.soundLouder}
          aria-disabled={louderDisabled}
          disabled={louderDisabled}
          onPressIn={() => pressIn(1)}
          onPressOut={pressOut}
          onPress={() => press(1)}
          style={styles.step}
        >
          <Text style={styles.stepLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.s,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    justifyContent: "space-between",
  },
  label: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  value: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  trackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
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
  fill: {
    backgroundColor: colors.fill,
    borderRadius: radius.card,
    height: spacing.l,
  },
});
