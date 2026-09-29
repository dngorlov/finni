import { loadContent } from "../../data/content";
import { taskUnlockOrder } from "../../core/tasks";
import { mapEdges } from "../screens/MapArrows";
import {
  IDENTITY_VIEW,
  arrowShape,
  clampShift,
  clampView,
  clampZoom,
  containedMapSize,
  doubleTapView,
  mapToView,
  panView,
  pinchView,
  viewToMap,
} from "../screens/mapLayout";

describe("Карта заданий layout", () => {
  it("uses the whole slot for a 3:4 map", () => {
    expect(containedMapSize(360, 640)).toEqual({ width: 360, height: 480 });
    expect(containedMapSize(360, 400).height).toBe(400);
    expect(containedMapSize(360, 400).width).toBeCloseTo(300);
  });

  it("fits the map inside a short slot without stretching it", () => {
    const map = containedMapSize(300, 200);
    expect(map.height).toBe(200);
    expect(map.width).toBeCloseTo(150);
    expect(containedMapSize(0, 200)).toEqual({ width: 0, height: 0 });
  });
});

describe("Карта zoom and pan", () => {
  const size = { width: 300, height: 400 };

  it("keeps the zoom between 1× and 3×", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(5)).toBe(3);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("never pans at 1× and stops at the map edge when zoomed", () => {
    expect(clampShift(40, 1, 300)).toBe(0);
    expect(clampShift(500, 2, 300)).toBe(150);
    expect(clampShift(-500, 3, 300)).toBe(-300);
    expect(panView(IDENTITY_VIEW, 50, 50, size)).toEqual(IDENTITY_VIEW);
    expect(panView({ scale: 2, x: 0, y: 0 }, 1000, -1000, size)).toEqual({ scale: 2, x: 150, y: -200 });
  });

  it("keeps the zoomed art over the whole box at every clamp", () => {
    const view = clampView({ scale: 2.5, x: 9999, y: -9999 }, size);
    const topLeft = mapToView({ x: 0, y: 0 }, view, size);
    const bottomRight = mapToView({ x: size.width, y: size.height }, view, size);
    expect(topLeft.x).toBeLessThanOrEqual(0);
    expect(topLeft.y).toBeLessThanOrEqual(0);
    expect(bottomRight.x).toBeGreaterThanOrEqual(size.width);
    expect(bottomRight.y).toBeGreaterThanOrEqual(size.height);
  });

  it("maps a pin to the screen and back", () => {
    const view = { scale: 2, x: 30, y: -20 };
    const pin = { x: 90, y: 120 };
    const onScreen = mapToView(pin, view, size);
    expect(onScreen).toEqual({ x: 150 + 30 + 2 * (90 - 150), y: 200 - 20 + 2 * (120 - 200) });
    const back = viewToMap(onScreen, view, size);
    expect(back.x).toBeCloseTo(pin.x);
    expect(back.y).toBeCloseTo(pin.y);
  });

  it("zooms around the pinch point", () => {
    const focus = { x: 100, y: 120 };
    const under = viewToMap(focus, IDENTITY_VIEW, size);
    const view = pinchView(IDENTITY_VIEW, focus, focus, 2, size);
    expect(view.scale).toBe(2);
    const still = mapToView(under, view, size);
    expect(still.x).toBeCloseTo(focus.x);
    expect(still.y).toBeCloseTo(focus.y);
  });

  it("caps a wide pinch at 3× and follows a moving midpoint", () => {
    const view = pinchView(IDENTITY_VIEW, { x: 150, y: 200 }, { x: 170, y: 210 }, 10, size);
    expect(view).toEqual({ scale: 3, x: 20, y: 10 });
  });

  it("resets on a double tap when zoomed, zooms in 2× otherwise", () => {
    expect(doubleTapView({ scale: 2.4, x: 10, y: 5 }, { x: 0, y: 0 }, size)).toEqual(IDENTITY_VIEW);
    const zoomed = doubleTapView(IDENTITY_VIEW, { x: 150, y: 200 }, size);
    expect(zoomed).toEqual({ scale: 2, x: 0, y: 0 });
  });
});

/** Numbers of an SVG path, as points. */
function pathPoints(d: string): { x: number; y: number }[] {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i], y: numbers[i + 1] });
  return points;
}

describe("Карта arrows", () => {
  const centre = { x: 160, y: 200 };

  it("starts and ends an arrow at the pin edges, never under a pin", () => {
    const from = { x: 160, y: 200 };
    const to = { x: 60, y: 260 };
    const shape = arrowShape(from, to, { gap: 27, head: 10, centre });
    expect(shape).not.toBeNull();
    const [start] = pathPoints(shape!.line);
    const lineEnd = pathPoints(shape!.line).at(-1)!;
    const [tip, ...wings] = pathPoints(shape!.head);
    expect(Math.hypot(start.x - from.x, start.y - from.y)).toBeCloseTo(27, 0);
    // The tip touches the target pin's edge; the line stops at the head's base.
    expect(Math.hypot(tip.x - to.x, tip.y - to.y)).toBeCloseTo(27, 0);
    expect(Math.hypot(lineEnd.x - to.x, lineEnd.y - to.y)).toBeCloseTo(37, 0);
    for (const wing of wings) expect(Math.hypot(wing.x - to.x, wing.y - to.y)).toBeGreaterThan(27);
  });

  it("bows a curve out of the centre, and skips pins too close for an arrow", () => {
    const shape = arrowShape({ x: 200, y: 200 }, { x: 200, y: 300 }, { gap: 27, head: 10, centre });
    const control = pathPoints(shape!.line)[1];
    // Right of the centre, going down: it bends further right.
    expect(control.x).toBeGreaterThan(200);
    expect(arrowShape({ x: 0, y: 0 }, { x: 50, y: 0 }, { gap: 27, head: 10, centre })).toBeNull();
  });

  it("draws one path: «Что такое бюджет?», then «Что такое сбережения», then the other lessons", () => {
    const tasks = loadContent().tasks;
    const edges = mapEdges(taskUnlockOrder(tasks), tasks).map((edge) => `${edge.from.id}>${edge.to.id}`);
    expect(edges).toEqual([
      "savings_what>budget_plan",
      "budget_plan>budget_change",
      "budget_what>savings_what",
      "budget_change>savings_steps",
      "savings_steps>savings_where",
      "savings_where>payments_pay",
      "payments_pay>payments_shop",
      "payments_shop>payments_later",
    ]);
  });
});
