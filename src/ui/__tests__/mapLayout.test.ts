import { containedMapSize } from "../screens/mapLayout";

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
