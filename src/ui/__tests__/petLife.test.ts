import {
  atlasCell,
  clampOffset,
  clipFinished,
  dragBounds,
  idleActionDelay,
  IDLE_ACTION_MAX_MS,
  IDLE_ACTION_MIN_MS,
  isCalm,
  isDragMove,
  landingPlan,
  pickIdleAction,
  planWalk,
} from "../pet/petLife";
import { roomDecorations } from "../pet/room";
import { customGoalItemId } from "../../core/customGoal";

const scene = { sceneWidth: 400, sceneHeight: 600, homeLeft: 100, homeBottom: 60, size: 200 };

describe("living pet rules", () => {
  it("keeps the pet inside the room", () => {
    const bounds = dragBounds(scene);
    expect(bounds).toEqual({ minX: -100, maxX: 100, minY: -340, maxY: 0 });
    expect(clampOffset({ x: 500, y: -900 }, bounds)).toEqual({ x: 100, y: -340 });
    expect(clampOffset({ x: -500, y: 50 }, bounds)).toEqual({ x: -100, y: 0 });
  });

  it("does not move before the room is measured", () => {
    expect(dragBounds({ ...scene, sceneWidth: 0, sceneHeight: 0, homeLeft: 0 })).toEqual({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    });
  });

  it("lands a dropped pet on the floor line under the finger, falling longer from higher up", () => {
    const bounds = dragBounds(scene);
    const high = landingPlan({ x: 80, y: -300 }, bounds);
    const low = landingPlan({ x: 80, y: -40 }, bounds);
    expect(high).toMatchObject({ x: 80, fromY: -300 });
    expect(high.durationMs).toBeGreaterThan(low.durationMs);
    expect(high.durationMs).toBeLessThanOrEqual(700);
    expect(low.durationMs).toBeGreaterThanOrEqual(120);
    expect(landingPlan({ x: 999, y: 0 }, bounds)).toEqual({ x: 100, fromY: 0, durationMs: 0 });
  });

  it("tells a tap from a drag by how far the finger moved", () => {
    expect(isDragMove(3, 4)).toBe(false);
    expect(isDragMove(8, 8)).toBe(true);
  });

  it("never jumps on its own when Сытость or Счастье is low, and never uses ATTACK or GOT HURT", () => {
    const rolls = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
    const calm = rolls.map((roll) => pickIdleAction(() => roll, true));
    expect(calm).not.toContain("jump");
    expect(new Set(calm)).toEqual(new Set(["walk", "push"]));
    const lively = rolls.map((roll) => pickIdleAction(() => roll, false));
    expect(new Set(lively)).toEqual(new Set(["walk", "jump", "push"]));
    expect(isCalm(20, 80)).toBe(true);
    expect(isCalm(80, 20)).toBe(true);
    expect(isCalm(50, 50)).toBe(false);
  });

  it("waits 6–12 s between idle actions", () => {
    expect(idleActionDelay(() => 0)).toBe(IDLE_ACTION_MIN_MS);
    expect(idleActionDelay(() => 0.999)).toBeLessThan(IDLE_ACTION_MAX_MS);
    expect(IDLE_ACTION_MIN_MS).toBe(6000);
    expect(IDLE_ACTION_MAX_MS).toBe(12000);
  });

  it("strolls a few steps and turns back at a wall", () => {
    const bounds = { minX: -100, maxX: 100 };
    const left = planWalk(0, bounds, 200, () => 0.1);
    expect(left).toMatchObject({ faceLeft: true });
    expect(left!.target).toBeGreaterThanOrEqual(-100);
    const atWall = planWalk(-100, bounds, 200, () => 0.1);
    expect(atWall).toMatchObject({ faceLeft: false });
    expect(atWall!.target).toBeGreaterThan(-100);
    expect(planWalk(0, { minX: 0, maxX: 0 }, 200, () => 0.1)).toBeNull();
  });

  it("maps clips to atlas cells: JUMP apex while held, FALLS after a drop", () => {
    expect(atlasCell("idle", 5)).toEqual({ row: 0, column: 1 });
    expect(atlasCell("held", 0)).toEqual({ row: 2, column: 4 });
    expect(atlasCell("fall", 3)).toEqual({ row: 4, column: 1 });
    expect(clipFinished("jump", 7)).toBe(false);
    expect(clipFinished("jump", 8)).toBe(true);
    expect(clipFinished("idle", 100)).toBe(false);
    expect(clipFinished("walk", 100)).toBe(false);
  });
});

describe("room decorations", () => {
  it("shows bought preset Цели with their icons and a Своя цель with a star", () => {
    const goals = [
      { id: "skateboard", name: "Скейтборд", icon: "🛹" },
      { id: "smartwatch", name: "Смарт-часы", icon: "⌚" },
    ];
    const custom = customGoalItemId("cg_1", 30, "Рюкзак");
    expect(roomDecorations(["skateboard", custom, "unknown"], goals)).toEqual([
      { id: "skateboard", name: "Скейтборд", icon: "🛹" },
      { id: custom, name: "Рюкзак", icon: "⭐" },
    ]);
  });
});
