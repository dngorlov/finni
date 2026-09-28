import { ACCESSORY_KEYS } from "../../core/accessories";
import { DRAWN_VARIANTS } from "../pet/assets";
import { COLOR_KEYS, SPECIES_KEYS } from "../pet/keys";
import { PET_ART_PX, PET_CLIPS, PET_SHEETS } from "../pet/petSprites.generated";
import { crispArtSize, frameLayers } from "../pet/pixelArt";
import { resolvePetVariant, variantKey } from "../pet/variants";

const drawn = (...keys: string[]) => new Set(keys);

describe("resolvePetVariant", () => {
  it("uses the requested look when it is drawn", () => {
    expect(resolvePetVariant({ species: "sp2", color: "c3", accessory: "a3" }, drawn("sp2/c3/a3", "sp1/c1/a1"))).toEqual({
      species: "sp2",
      color: "c3",
      accessory: "a3",
    });
  });

  it("drops the accessory before anything else", () => {
    expect(
      resolvePetVariant({ species: "sp1", color: "c2", accessory: "a3" }, drawn("sp1/c2/a1", "sp1/c2/a2")),
    ).toEqual({ species: "sp1", color: "c2", accessory: "a1" });
  });

  it("keeps species and color with another accessory when there is no plain sheet, glasses first", () => {
    expect(
      resolvePetVariant({ species: "sp3", color: "c1", accessory: "a1" }, drawn("sp3/c1/a3", "sp3/c1/a2")),
    ).toEqual({ species: "sp3", color: "c1", accessory: "a2" });
    expect(resolvePetVariant({ species: "sp3", color: "c1", accessory: "a2" }, drawn("sp3/c1/a3"))).toEqual({
      species: "sp3",
      color: "c1",
      accessory: "a3",
    });
  });

  it("falls back to sp1/c1 without an accessory when nothing of that species and color is drawn", () => {
    expect(resolvePetVariant({ species: "sp9", color: "c1", accessory: "a2" }, drawn("sp3/c1/a3"))).toEqual({
      species: "sp1",
      color: "c1",
      accessory: "a1",
    });
  });

  it("resolves every species × color × accessory to a sheet that is bundled", () => {
    const borrowed: string[] = [];
    for (const species of SPECIES_KEYS) {
      for (const color of COLOR_KEYS) {
        for (const accessory of ACCESSORY_KEYS) {
          const requested = { species, color, accessory };
          const resolved = resolvePetVariant(requested, DRAWN_VARIANTS);
          expect(PET_SHEETS[variantKey(resolved)]).toBeDefined();
          // Every species × color is drawn in some form, so the look never changes species or color.
          expect(resolved).toMatchObject({ species, color });
          if (variantKey(resolved) !== variantKey(requested)) borrowed.push(variantKey(requested));
        }
      }
    }
    expect(borrowed).toEqual([]);
  });

  it("bundles all 27 drawn looks with the animations the pet plays", () => {
    expect(DRAWN_VARIANTS.size).toBe(27);
    expect(PET_CLIPS).toMatchObject({
      idle: { frames: 4 },
      walk: { frames: 6 },
      jump: { frames: 8 },
      push: { frames: 6 },
      attack: { frames: 4 },
      still: { frames: 2 },
    });
    const total = Object.values(PET_CLIPS).reduce((sum, clip) => sum + clip.frames, 0);
    for (const sheet of Object.values(PET_SHEETS)) expect(sheet.frames).toHaveLength(total);
  });

  it("draws every frame as whole art-pixel squares inside the 32 px cell, mirrored on request", () => {
    const sheet = PET_SHEETS["sp1/c3/a1"]!;
    for (const flipped of [false, true]) {
      const layers = frameLayers(sheet, PET_CLIPS.idle.start, flipped);
      expect(layers.length).toBeGreaterThan(1);
      for (const layer of layers) {
        expect(sheet.palette).toContain(layer.fill);
        for (const [, x, y, w] of layer.d.matchAll(/M(-?\d+) (-?\d+)h(\d+)v1h-\d+z/g)) {
          expect(Number(x)).toBeGreaterThanOrEqual(0);
          expect(Number(x) + Number(w)).toBeLessThanOrEqual(PET_ART_PX);
          expect(Number(y)).toBeLessThan(PET_ART_PX);
        }
      }
    }
    const pixels = (flipped: boolean) =>
      frameLayers(sheet, PET_CLIPS.idle.start, flipped).reduce(
        (sum, layer) => sum + [...layer.d.matchAll(/h(\d+)/g)].reduce((row, [, w]) => row + Number(w), 0),
        0,
      );
    expect(pixels(true)).toBe(pixels(false));
  });

  it("sizes the art to whole physical pixels per art pixel, never larger than the box", () => {
    // 240 dp at 2.75: 660 px → 20 px per art pixel → 640 px ≈ 232.7 dp.
    expect(crispArtSize(240, 2.75)).toEqual({ side: 640 / 2.75, scale: 20 });
    // 120 dp at 2: 240 px → 7 px per art pixel → 224 px = 112 dp.
    expect(crispArtSize(120, 2)).toEqual({ side: 112, scale: 7 });
    for (const [size, ratio] of [
      [72, 3],
      [160, 2.625],
      [176, 1.5],
      [240, 3.5],
    ] as const) {
      const { side, scale } = crispArtSize(size, ratio);
      expect(Number.isInteger(scale)).toBe(true);
      expect(side).toBeLessThanOrEqual(size);
      expect(side * ratio).toBeCloseTo(scale * PET_ART_PX, 6);
      expect(size - side).toBeLessThan(PET_ART_PX / ratio);
    }
  });
});
