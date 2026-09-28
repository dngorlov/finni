import { useCallback, useMemo, useRef, useState } from "react";
import { useLatest } from "./useLatest";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { colors, minTarget, spacing, type } from "../theme";

const DRAG_THRESHOLD = 8;
const BEAD_SIZE = 20;
const LINE_HEIGHT = 4;

function stopCenters(width: number, count: number, circleSize: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [width / 2];
  }
  const inset = circleSize / 2;
  const span = width - circleSize;
  return Array.from({ length: count }, (_, index) => inset + (index * span) / (count - 1));
}

function nearestStopIndex(x: number, centers: number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < centers.length; index++) {
    const distance = Math.abs(x - centers[index]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    } else if (distance === bestDistance) {
      best = Math.min(best, index);
    }
  }
  return best;
}

export function BeadSlider<K extends string>({
  legend,
  keys,
  value,
  onChange,
  labelOf,
}: {
  legend: string;
  keys: readonly K[];
  value: K;
  onChange: (key: K) => void;
  labelOf: (key: K) => string;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View>(null);
  const onChangeRef = useLatest(onChange);
  const keysRef = useLatest(keys);
  const dragXRef = useRef(0);

  const centers = useMemo(
    () => stopCenters(trackWidth, keys.length, minTarget),
    [trackWidth, keys.length],
  );

  const measureTrackPageX = useCallback(() => {
    trackRef.current?.measureInWindow((x) => {
      trackPageXRef.current = x;
    });
  }, []);

  const clampX = useCallback(
    (x: number) => {
      if (centers.length === 0) {
        return x;
      }
      const min = centers[0]!;
      const max = centers[centers.length - 1]!;
      return Math.max(min, Math.min(max, x));
    },
    [centers],
  );

  const emitNearest = useCallback(
    (x: number) => {
      const index = nearestStopIndex(x, centers);
      const key = keysRef.current[index];
      if (key != null) {
        onChangeRef.current(key);
      }
    },
    [centers, keysRef, onChangeRef],
  );

  const applyPageX = useCallback(
    (pageX: number) => {
      const x = clampX(pageX - trackPageXRef.current);
      dragXRef.current = x;
      setDragX(x);
      emitNearest(x);
    },
    [clampX, emitNearest],
  );

  const finishDrag = useCallback(() => {
    emitNearest(dragXRef.current);
    setDragging(false);
  }, [emitNearest]);

  // PanResponder handlers read refs only when a gesture fires, never during render.
  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > DRAG_THRESHOLD,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > DRAG_THRESHOLD,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const pageX = event.nativeEvent.pageX;
          trackRef.current?.measureInWindow((originX) => {
            trackPageXRef.current = originX;
            setDragging(true);
            applyPageX(pageX);
          });
        },
        onPanResponderMove: (event) => {
          applyPageX(event.nativeEvent.pageX);
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      }),
    [applyPageX, finishDrag],
  );
  /* eslint-enable react-hooks/refs */

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
    measureTrackPageX();
  };

  const selectedIndex = keys.indexOf(value);
  const nearestIndex =
    dragging && centers.length > 0 ? nearestStopIndex(dragX, centers) : selectedIndex;

  const lineLeft = centers[0] ?? minTarget / 2;
  const lineWidth =
    centers.length > 1 ? (centers[centers.length - 1] ?? lineLeft) - lineLeft : 0;

  return (
    <View style={styles.block}>
      <Text style={styles.legend}>{legend}</Text>
      <View
        ref={trackRef}
        style={styles.track}
        onLayout={onTrackLayout}
        {...panResponder.panHandlers}
      >
        {lineWidth > 0 ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={[
              styles.line,
              {
                left: lineLeft,
                width: lineWidth,
              },
            ]}
          />
        ) : null}
        {keys.map((key, index) => {
          const center = centers[index] ?? minTarget / 2;
          const selected = dragging ? index === nearestIndex : value === key;
          const beadColor = dragging || !selected ? colors.disabledFace : colors.accent;
          return (
            <Pressable
              key={key}
              role="button"
              aria-label={labelOf(key)}
              aria-selected={selected}
              onPress={() => onChange(key)}
              style={[
                styles.stop,
                {
                  left: center - minTarget / 2,
                },
              ]}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                aria-hidden
                style={[styles.bead, { backgroundColor: beadColor }]}
              />
            </Pressable>
          );
        })}
        {dragging ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
            style={[
              styles.traveler,
              {
                left: dragX - BEAD_SIZE / 2,
              },
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.s,
  },
  legend: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
  track: {
    height: minTarget,
    position: "relative",
    width: "100%",
  },
  line: {
    backgroundColor: colors.track,
    height: LINE_HEIGHT,
    position: "absolute",
    top: minTarget / 2 - LINE_HEIGHT / 2,
    zIndex: 0,
  },
  stop: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: minTarget / 2,
    borderWidth: 2,
    height: minTarget,
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: minTarget,
    zIndex: 1,
  },
  bead: {
    borderRadius: BEAD_SIZE / 2,
    height: BEAD_SIZE,
    width: BEAD_SIZE,
  },
  traveler: {
    backgroundColor: colors.accent,
    borderRadius: BEAD_SIZE / 2,
    height: BEAD_SIZE,
    position: "absolute",
    top: minTarget / 2 - BEAD_SIZE / 2,
    width: BEAD_SIZE,
    zIndex: 2,
  },
});
