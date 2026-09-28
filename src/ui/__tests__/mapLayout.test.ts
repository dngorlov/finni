import {
  IDENTITY_VIEW,
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
