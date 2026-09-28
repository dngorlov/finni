import { PET_CLIPS } from "./petSprites.generated";
import { poseFromMeters } from "./keys";

/**
 * Pure rules for the living Питомец on Дом: which frame to draw, what it does
 * when left alone, and where it lands when dropped. LivingPet only wires them
 * to timers, Animated values, and touches.
 */

/** Frame rate of every clip. Frames change through React state, so keep it low. */
export const PET_FPS = 7;
export const PET_FRAME_MS = Math.round(1000 / PET_FPS);
/** Quiet time before the pet does something on its own. */
export const IDLE_ACTION_MIN_MS = 6000;
export const IDLE_ACTION_MAX_MS = 12000;
/** How long the FALLS frame stays after a landing. */
export const LANDING_MS = 450;
/** Finger travel (dp) that turns a touch into a drag instead of a tap. */
export const DRAG_SLOP = 10;

export type PetClip = "idle" | "walk" | "jump" | "push" | "attack" | "held" | "fall";
export type IdleAction = "walk" | "jump" | "push";
/** What a tap makes the pet do. */
export type TapMove = "jump" | "attack";

/** Ticks a one-shot clip plays before the pet goes back to IDLE. */
const ONE_SHOT_TICKS: Partial<Record<PetClip, number>> = {
  jump: PET_CLIPS.jump.frames,
  push: PET_CLIPS.push.frames * 2,
  // A playful one-two punch.
  attack: PET_CLIPS.attack.frames * 2,
};

/** Share of taps answered with a punch instead of a hop. */
export const TAP_ATTACK_SHARE = 0.35;

/** The frame of the JUMP row where the pet is highest — used while it is held. */
export const JUMP_APEX_FRAME = 4;
/** Ticks of JUMP spent crouching before the pet leaves the floor. */
export const JUMP_TAKEOFF_TICKS = 3;
/** Ticks of JUMP in the air. */
export const JUMP_AIR_TICKS = 3;

/** Index into a look's `frames` for `clip` at `tick`. */
export function clipFrame(clip: PetClip, tick: number): number {
  switch (clip) {
    case "held":
      return PET_CLIPS.jump.start + JUMP_APEX_FRAME;
    case "fall":
      return PET_CLIPS.still.start + 1;
    default: {
      const layout = PET_CLIPS[clip];
      return layout.start + (tick % layout.frames);
    }
  }
}

/** Held and fallen are single frames: the clock does not move them. */
export function clipAnimates(clip: PetClip): boolean {
  return clip !== "held" && clip !== "fall";
}

/** True once a one-shot clip (JUMP, PUSH) has played through at `tick`. */
export function clipFinished(clip: PetClip, tick: number): boolean {
  const length = ONE_SHOT_TICKS[clip];
  return length !== undefined && tick >= length;
}

/** Low Сытость or Счастье: slow, calm moves, no jumping on its own. */
export function isCalm(care: number, mood: number): boolean {
  return poseFromMeters(care, mood) === "sad";
}

function pick<T>(items: readonly T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)));
  return items[index] as T;
}

/** A tap mostly makes the pet hop; now and then it throws a playful punch instead. */
export function pickTapMove(random: () => number): TapMove {
  return random() < TAP_ATTACK_SHARE ? "attack" : "jump";
}

/** Something to do after a quiet spell. Never ATTACK or GOT HURT: a punch only answers a tap. */
export function pickIdleAction(random: () => number, calm: boolean): IdleAction {
  return pick<IdleAction>(calm ? ["walk", "push"] : ["walk", "jump", "push"], random);
}

export function idleActionDelay(random: () => number): number {
  return IDLE_ACTION_MIN_MS + Math.floor(random() * (IDLE_ACTION_MAX_MS - IDLE_ACTION_MIN_MS));
}

/** Offsets (dp) from the pet's home spot. Up is negative y; the floor line is y = 0. */
export type Offset = { x: number; y: number };
export type DragBounds = { minX: number; maxX: number; minY: number; maxY: number };

/** How far the pet may go without leaving the room, measured from its home spot. */
export function dragBounds(input: {
  sceneWidth: number;
  sceneHeight: number;
  homeLeft: number;
  homeBottom: number;
  size: number;
}): DragBounds {
  const maxX = input.sceneWidth - input.size - input.homeLeft;
  const minX = 0 - input.homeLeft;
  const minY = 0 - (input.sceneHeight - input.size - input.homeBottom);
  return {
    minX: Math.min(0, minX),
    maxX: Math.max(0, maxX),
    minY: Math.min(0, minY),
    maxY: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampOffset(offset: Offset, bounds: DragBounds): Offset {
  return { x: clamp(offset.x, bounds.minX, bounds.maxX), y: clamp(offset.y, bounds.minY, bounds.maxY) };
}

export function isDragMove(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > DRAG_SLOP;
}

/** Room gravity in dp/s². Tuned so a drop from the ceiling takes about half a second. */
const GRAVITY = 3200;

/** Where a released pet lands and how long the fall takes. */
export function landingPlan(released: Offset, bounds: DragBounds): { x: number; fromY: number; durationMs: number } {
  const at = clampOffset(released, bounds);
  const height = Math.max(0, -at.y);
  const seconds = Math.sqrt((2 * height) / GRAVITY);
  return { x: at.x, fromY: at.y, durationMs: height === 0 ? 0 : clamp(Math.round(seconds * 1000), 120, 700) };
}

/**
 * A short stroll: a few steps left or right along the floor, turning back at a
 * wall. Returns null when the room is too narrow to walk.
 */
export function planWalk(
  x: number,
  bounds: Pick<DragBounds, "minX" | "maxX">,
  size: number,
  random: () => number,
): { target: number; faceLeft: boolean } | null {
  const distance = Math.round(size * (0.35 + random() * 0.4));
  const room = bounds.maxX - bounds.minX;
  if (room < size * 0.25) return null;
  const preferLeft = random() < 0.5;
  const left = x - distance;
  const right = x + distance;
  let target: number;
  if (preferLeft) target = left >= bounds.minX ? left : right;
  else target = right <= bounds.maxX ? right : left;
  target = clamp(target, bounds.minX, bounds.maxX);
  if (Math.abs(target - x) < size * 0.1) return null;
  return { target, faceLeft: target < x };
}

/** Walking speed in dp per second. */
export function walkSpeed(size: number, calm: boolean): number {
  return size * (calm ? 0.35 : 0.55);
}
