import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, AppState, Easing, PanResponder, PixelRatio, Pressable, StyleSheet, View } from "react-native";
import { useLatest } from "../components/useLatest";
import { useAnimationsOn } from "../motion";
import { petStrings } from "../stringsPet";
import { petPixels } from "./assets";
import { poseFromMeters } from "./keys";
import {
  clampOffset,
  clipFrame,
  clipAnimates,
  clipFinished,
  dragBounds,
  idleActionDelay,
  isCalm,
  isDragMove,
  JUMP_AIR_TICKS,
  JUMP_TAKEOFF_TICKS,
  LANDING_MS,
  landingPlan,
  PET_FRAME_MS,
  pickIdleAction,
  pickTapMove,
  planWalk,
  walkSpeed,
  type Offset,
  type PetClip,
} from "./petLife";
import { PixelFrame } from "./PixelFrame";

/**
 * Rounds an animated offset down to whole physical pixels on the native side.
 * A tween passes through fractional offsets; Android then resamples the whole
 * picture between two pixel columns and every hard art edge goes soft.
 */
function snapToPixels(value: Animated.Value | Animated.AnimatedAddition<number>) {
  return Animated.subtract(value, Animated.modulo(value, 1 / PixelRatio.get()));
}

export type LivingPetLook = {
  species: string;
  color: string;
  accessory: string;
  petName: string;
  care: number;
  mood: number;
};

type Shown = { clip: PetClip; tick: number; faceLeft: boolean };

/** A tween in flight, so an interruption knows where the pet is without asking native. */
type Motion = { axis: "x" | "y"; from: number; to: number; startedAt: number; duration: number; easeIn: boolean };

function motionValue(motion: Motion, now: number): number {
  const progress = motion.duration <= 0 ? 1 : Math.min(1, Math.max(0, (now - motion.startedAt) / motion.duration));
  const eased = motion.easeIn ? progress * progress : progress;
  return motion.from + (motion.to - motion.from) * eased;
}

/**
 * The Питомец on Дом. IDLE loops; after a quiet spell it strolls, pushes, or
 * hops (calm moves only when Сытость or Счастье is low). A tap plays JUMP, or
 * now and then a playful ATTACK punch, and says a line. The child can drag it
 * anywhere in the room; on release it falls straight down to the floor where
 * it was let go, shows FALLS, and goes back to IDLE from that spot.
 *
 * Frames change through state at PET_FPS; every movement is an Animated tween
 * on the native driver, rounded to whole physical pixels so the art stays sharp. Timers stop while `active` is false, animations are
 * off in Настройки, or the app is in the background, and everything is cleared
 * on unmount.
 */
export function LivingPet({
  pet,
  size,
  homeLeft,
  homeBottom,
  sceneWidth,
  sceneHeight,
  active,
  talkLabel,
  onTap,
  bubble,
  random = Math.random,
}: {
  pet: LivingPetLook;
  size: number;
  /** Left edge of the home spot. Undefined before the scene is measured: centered, no moving. */
  homeLeft?: number;
  homeBottom: number;
  sceneWidth: number;
  sceneHeight: number;
  /** Дом is on screen. False pauses every timer. */
  active: boolean;
  talkLabel: string;
  onTap: () => void;
  /** Speech bubble drawn above the pet, following it around. */
  bubble?: ReactNode;
  random?: () => number;
}) {
  const [shown, setShown] = useState<Shown>({ clip: "idle", tick: 0, faceLeft: false });
  const [offset] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [hop] = useState(() => new Animated.Value(0));
  // Built once: a new node every frame would re-attach the native animation graph.
  const [shiftX] = useState(() => snapToPixels(offset.x));
  const [lift] = useState(() => snapToPixels(Animated.add(offset.y, hop)));
  const animationsOn = useAnimationsOn();
  const [appActive, setAppActive] = useState(() => AppState.currentState !== "background");
  const live = active && appActive && animationsOn;

  const shownRef = useRef(shown);
  const at = useRef<Offset>({ x: 0, y: 0 });
  const motion = useRef<Motion | null>(null);
  const dragging = useRef(false);
  const dragFrom = useRef<Offset>({ x: 0, y: 0 });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const alive = useRef(true);

  const bounds = dragBounds({
    sceneWidth: homeLeft === undefined ? 0 : sceneWidth,
    sceneHeight: homeLeft === undefined ? 0 : sceneHeight,
    homeLeft: homeLeft ?? 0,
    homeBottom,
    size,
  });
  const latest = useLatest({ bounds, size, calm: isCalm(pet.care, pet.mood), random, onTap });

  const show = useCallback((clip: PetClip, faceLeft?: boolean) => {
    const next = { clip, tick: 0, faceLeft: faceLeft ?? shownRef.current.faceLeft };
    shownRef.current = next;
    setShown(next);
  }, []);

  const later = useCallback((ms: number, run: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      if (alive.current) run();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearLater = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.clear();
  }, []);

  /** Stop any tween and pin the pet where it is right now. */
  const halt = useCallback(() => {
    const running = motion.current;
    if (running) {
      at.current = { ...at.current, [running.axis]: motionValue(running, Date.now()) };
      motion.current = null;
    }
    offset.stopAnimation();
    offset.setValue(at.current);
    hop.stopAnimation();
    hop.setValue(0);
  }, [hop, offset]);

  const tween = useCallback(
    (axis: "x" | "y", to: number, duration: number, easeIn: boolean, done: () => void) => {
      const from = at.current[axis];
      const run: Motion = { axis, from, to, startedAt: Date.now(), duration, easeIn };
      motion.current = run;
      Animated.timing(axis === "x" ? offset.x : offset.y, {
        toValue: to,
        duration,
        easing: easeIn ? Easing.in(Easing.quad) : Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || motion.current !== run || !alive.current) return;
        motion.current = null;
        at.current = { ...at.current, [axis]: to };
        done();
      });
    },
    [offset],
  );

  const jump = useCallback(() => {
    const clip = shownRef.current.clip;
    if (!animationsOn || dragging.current || clip === "held" || clip === "fall") return;
    halt();
    show("jump");
    const air = (JUMP_AIR_TICKS * PET_FRAME_MS) / 2;
    Animated.sequence([
      Animated.delay(JUMP_TAKEOFF_TICKS * PET_FRAME_MS),
      Animated.timing(hop, {
        toValue: -Math.round(latest.current.size * 0.18),
        duration: air,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(hop, { toValue: 0, duration: air, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [animationsOn, halt, hop, latest, show]);

  const punch = useCallback(() => {
    const clip = shownRef.current.clip;
    if (!animationsOn || dragging.current || clip === "held" || clip === "fall") return;
    halt();
    show("attack");
  }, [animationsOn, halt, show]);

  const stroll = useCallback(() => {
    const { bounds: room, size: side, random: roll, calm } = latest.current;
    const start = at.current.x;
    const plan = planWalk(start, room, side, roll);
    if (!plan) {
      show("push");
      return;
    }
    const speed = walkSpeed(side, calm);
    const duration = (distance: number) => Math.round((Math.abs(distance) / speed) * 1000);
    show("walk", plan.faceLeft);
    tween("x", plan.target, duration(plan.target - start), false, () => {
      show("walk", !plan.faceLeft);
      tween("x", start, duration(plan.target - start), false, () => show("idle", false));
    });
  }, [latest, show, tween]);

  // Frame clock: one interval while Дом is visible.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const current = shownRef.current;
      if (!clipAnimates(current.clip)) return;
      const tick = current.tick + 1;
      if (clipFinished(current.clip, tick)) {
        show("idle");
        return;
      }
      const next = { ...current, tick };
      shownRef.current = next;
      setShown(next);
    }, PET_FRAME_MS);
    return () => clearInterval(id);
  }, [live, show]);

  // After a quiet spell in IDLE, do something.
  const idle = shown.clip === "idle";
  useEffect(() => {
    if (!live || !idle) return;
    const { random: roll, calm } = latest.current;
    const id = setTimeout(() => {
      const action = pickIdleAction(latest.current.random, calm);
      if (action === "jump") jump();
      else if (action === "push") show("push");
      else stroll();
    }, idleActionDelay(roll));
    return () => clearTimeout(id);
  }, [idle, jump, latest, live, show, stroll]);

  // Leaving Дом (or the app) freezes the pet in IDLE where it stands.
  useEffect(() => {
    if (live) return;
    clearLater();
    if (dragging.current) return;
    halt();
    if (at.current.y !== 0) {
      at.current = { ...at.current, y: 0 };
      offset.setValue(at.current);
    }
    if (shownRef.current.clip !== "idle") show("idle");
  }, [clearLater, halt, live, offset, show]);

  // The room was measured again (first layout, rotation): keep the pet inside it.
  const { minX, maxX, minY } = bounds;
  useEffect(() => {
    if (dragging.current) return;
    const inside = clampOffset(at.current, { minX, maxX, minY, maxY: 0 });
    if (inside.x === at.current.x && inside.y === at.current.y) return;
    halt();
    at.current = inside;
    offset.setValue(inside);
  }, [halt, maxX, minX, minY, offset]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppActive(state !== "background"));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      for (const id of pending) clearTimeout(id);
      pending.clear();
      offset.stopAnimation();
      hop.stopAnimation();
    };
  }, [hop, offset]);

  const land = useCallback(() => {
    show("fall");
    later(LANDING_MS, () => show("idle"));
  }, [later, show]);

  const drop = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const plan = landingPlan(at.current, latest.current.bounds);
    if (!animationsOn) {
      at.current = { x: plan.x, y: 0 };
      offset.setValue(at.current);
      show("idle");
      return;
    }
    at.current = { x: plan.x, y: plan.fromY };
    offset.setValue(at.current);
    if (plan.durationMs === 0) {
      land();
      return;
    }
    tween("y", 0, plan.durationMs, true, land);
  }, [animationsOn, land, latest, offset, show, tween]);

  // Handlers read refs when a finger moves, not while rendering.
  /* eslint-disable react-hooks/refs */
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) => isDragMove(gesture.dx, gesture.dy),
        onMoveShouldSetPanResponder: (_event, gesture) => isDragMove(gesture.dx, gesture.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          clearLater();
          halt();
          dragging.current = true;
          dragFrom.current = { ...at.current };
          show("held");
        },
        onPanResponderMove: (_event, gesture) => {
          if (!dragging.current) return;
          const next = clampOffset(
            { x: dragFrom.current.x + gesture.dx, y: dragFrom.current.y + gesture.dy },
            latest.current.bounds,
          );
          at.current = next;
          offset.setValue(next);
        },
        onPanResponderRelease: () => drop(),
        onPanResponderTerminate: () => drop(),
      }),
    [clearLater, drop, halt, latest, offset, show],
  );
  /* eslint-enable react-hooks/refs */

  const frame = clipFrame(shown.clip, shown.tick);
  const pose = poseFromMeters(pet.care, pet.mood);

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.body,
        { bottom: homeBottom, width: size, height: size },
        homeLeft === undefined ? styles.centered : { left: homeLeft },
        { transform: [{ translateX: shiftX }, { translateY: lift }] },
      ]}
    >
      {bubble ? (
        <View pointerEvents="box-none" style={[styles.bubbleSlot, { bottom: size }]}>
          {bubble}
        </View>
      ) : null}
      <Pressable
        role="button"
        aria-label={talkLabel}
        onPress={() => {
          if (dragging.current) return;
          if (pickTapMove(latest.current.random) === "attack") punch();
          else jump();
          latest.current.onTap();
        }}
      >
        <View
          accessible
          role="img"
          aria-label={petStrings.petA11y({
            petName: pet.petName,
            species: pet.species,
            color: pet.color,
            accessory: pet.accessory,
            pose,
          })}
          testID={`living-pet-${shown.clip}`}
        >
          <PixelFrame pixels={petPixels(pet)} frame={frame} size={size} flipped={shown.faceLeft} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: {
    position: "absolute",
  },
  centered: {
    alignSelf: "center",
  },
  bubbleSlot: {
    alignItems: "center",
    left: -120,
    marginBottom: 6,
    position: "absolute",
    right: -120,
  },
});
