import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { PixelSprite } from "../components/PixelSprite";
import { useAnimationsOn } from "../motion";
import { strings } from "../strings";
import { colors, minTarget, radius, spacing, type } from "../theme";
import {
  IDENTITY_VIEW,
  MIN_ZOOM,
  clampView,
  doubleTapView,
  panView,
  pinchView,
  type MapView,
  type Point,
  type Size,
} from "./mapLayout";

/** Movement (px) before a one-finger drag on the zoomed map pans instead of tapping a pin. */
const PAN_SLOP = 6;
/** Two taps closer than this (ms, px) on the bare map are a double tap. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;

type Gesture = {
  start: MapView;
  touches: number;
  /** First finger (page px) for a pan. */
  from: Point;
  /** Pinch midpoint (box px) and finger spread at the start. */
  focus: Point;
  spread: number;
};

type Touch = { pageX: number; pageY: number };

function touchesOf(event: GestureResponderEvent): Touch[] {
  const list = event.nativeEvent.touches as unknown as Touch[] | undefined;
  return list && list.length > 0 ? Array.from(list) : [event.nativeEvent];
}

/**
 * The map art and its pins, zoomable 1×–3× with two fingers and pannable once
 * zoomed. Pins ride the art (they are children of the scaled layer) and are
 * scaled back by `counterScale`, so they keep their size and stay tappable.
 * A double tap on the bare map zooms in 2×, or back to the whole map.
 */
export function ZoomableMap({
  size,
  style,
  children,
}: {
  size: Size;
  /** The box on screen: position, size, clipping. */
  style: StyleProp<ViewStyle>;
  children: (counterScale: Animated.AnimatedInterpolation<number> | Animated.Value) => ReactNode;
}) {
  const animationsOn = useAnimationsOn();
  const [scale] = useState(() => new Animated.Value(1));
  const [shiftX] = useState(() => new Animated.Value(0));
  const [shiftY] = useState(() => new Animated.Value(0));
  const [counterScale] = useState(() => Animated.divide(1, scale));
  const [zoomed, setZoomed] = useState(false);

  const frame = useRef<View>(null);
  const live = useRef({ view: IDENTITY_VIEW, size, animationsOn, origin: { x: 0, y: 0 } });
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ at: number; point: Point } | null>(null);

  useEffect(() => {
    live.current.size = size;
    live.current.animationsOn = animationsOn;
    // A new box size (rotation, corrections bar) keeps the zoom but re-clamps the pan.
    const next = clampView(live.current.view, size);
    live.current.view = next;
    scale.setValue(next.scale);
    shiftX.setValue(next.x);
    shiftY.setValue(next.y);
  }, [size, animationsOn, scale, shiftX, shiftY]);

  // PanResponder handlers read refs only when a gesture fires, never during render.
  /* eslint-disable react-hooks/refs */
  const [responder] = useState(() => {
    const measure = () => {
      frame.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
        if (Number.isFinite(pageX) && Number.isFinite(pageY)) live.current.origin = { x: pageX, y: pageY };
      });
    };
    const local = (touch: Touch): Point => ({
      x: touch.pageX - live.current.origin.x,
      y: touch.pageY - live.current.origin.y,
    });
    const apply = (next: MapView, animate = false) => {
      live.current.view = next;
      setZoomed(next.scale > MIN_ZOOM + 0.01);
      if (animate && live.current.animationsOn) {
        Animated.parallel([
          Animated.timing(scale, { toValue: next.scale, duration: 180, useNativeDriver: false }),
          Animated.timing(shiftX, { toValue: next.x, duration: 180, useNativeDriver: false }),
          Animated.timing(shiftY, { toValue: next.y, duration: 180, useNativeDriver: false }),
        ]).start();
        return;
      }
      scale.setValue(next.scale);
      shiftX.setValue(next.x);
      shiftY.setValue(next.y);
    };
    const begin = (event: GestureResponderEvent) => {
      const touches = touchesOf(event);
      const [a, b] = touches;
      const first = a ?? { pageX: 0, pageY: 0 };
      const second = b ?? first;
      gesture.current = {
        start: live.current.view,
        touches: touches.length,
        from: { x: first.pageX, y: first.pageY },
        focus: local({ pageX: (first.pageX + second.pageX) / 2, pageY: (first.pageY + second.pageY) / 2 }),
        spread: Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY),
      };
    };
    const wantsGesture = (event: GestureResponderEvent, dx: number, dy: number) =>
      touchesOf(event).length >= 2 ||
      (live.current.view.scale > MIN_ZOOM + 0.01 && Math.hypot(dx, dy) > PAN_SLOP);

    return PanResponder.create({
      // A tap on the bare map never claims the touch; it only counts toward a double tap.
      onStartShouldSetPanResponder: (event) => {
        const touch = touchesOf(event)[0];
        if (!touch) return false;
        measure();
        const now = Date.now();
        const point = { x: touch.pageX, y: touch.pageY };
        const prev = lastTap.current;
        if (prev && now - prev.at < DOUBLE_TAP_MS && Math.hypot(point.x - prev.point.x, point.y - prev.point.y) < DOUBLE_TAP_PX) {
          lastTap.current = null;
          apply(doubleTapView(live.current.view, local(touch), live.current.size), true);
        } else {
          lastTap.current = { at: now, point };
        }
        return false;
      },
      // Capture so a pinch or a pan that starts on a pin moves the map instead.
      onMoveShouldSetPanResponderCapture: (event, state) => wantsGesture(event, state.dx, state.dy),
      onMoveShouldSetPanResponder: (event, state) => wantsGesture(event, state.dx, state.dy),
      onPanResponderGrant: (event) => {
        lastTap.current = null;
        measure();
        begin(event);
      },
      onPanResponderMove: (event) => {
        const touches = touchesOf(event);
        const current = gesture.current;
        // A finger added or lifted mid-gesture: carry on from where the map is now.
        if (!current || current.touches !== touches.length) {
          begin(event);
          return;
        }
        const [a, b] = touches;
        if (!a) return;
        if (touches.length >= 2 && b) {
          const spread = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          const focus = local({ pageX: (a.pageX + b.pageX) / 2, pageY: (a.pageY + b.pageY) / 2 });
          const ratio = current.spread > 0 ? spread / current.spread : 1;
          apply(pinchView(current.start, current.focus, focus, ratio, live.current.size));
          return;
        }
        apply(panView(current.start, a.pageX - current.from.x, a.pageY - current.from.y, live.current.size));
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => {
        gesture.current = null;
        // A pinch that ends a hair above 1× snaps back to the whole map.
        if (live.current.view.scale < MIN_ZOOM + 0.05) apply(IDENTITY_VIEW, true);
      },
      onPanResponderTerminate: () => {
        gesture.current = null;
      },
    });
  });
  /* eslint-enable react-hooks/refs */

  const reset = () => {
    live.current.view = IDENTITY_VIEW;
    setZoomed(false);
    if (animationsOn) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: false }),
        Animated.timing(shiftX, { toValue: 0, duration: 180, useNativeDriver: false }),
        Animated.timing(shiftY, { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start();
      return;
    }
    scale.setValue(1);
    shiftX.setValue(0);
    shiftY.setValue(0);
  };

  return (
    <>
      <View ref={frame} collapsable={false} style={style} {...responder.panHandlers}>
        <Animated.View
          testID="map-layer"
          style={[
            size.width > 0 && size.height > 0 ? { height: size.height, width: size.width } : StyleSheet.absoluteFill,
            { transform: [{ translateX: shiftX }, { translateY: shiftY }, { scale }] },
          ]}
        >
          {children(counterScale)}
        </Animated.View>
      </View>
      {zoomed ? (
        <Pressable
          role="button"
          aria-label={strings.mapZoomReset}
          onPress={reset}
          style={({ pressed }) => [styles.reset, pressed ? styles.resetPressed : null]}
        >
          <PixelSprite name="map" size={20} />
          <Text style={styles.resetLabel}>{strings.mapZoomReset}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  reset: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.raisedEdge,
    borderRadius: radius.card,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
    position: "absolute",
    right: spacing.m,
    top: spacing.s,
  },
  resetPressed: {
    opacity: 0.7,
  },
  resetLabel: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
  },
});
