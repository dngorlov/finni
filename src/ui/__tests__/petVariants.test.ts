import { ACCESSORY_KEYS } from "../../core/accessories";
import { DRAWN_VARIANTS } from "../pet/assets";
import { COLOR_KEYS, SPECIES_KEYS } from "../pet/keys";
import { PET_ATLAS_LAYOUT, PET_SHEETS } from "../pet/petSprites.generated";
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
    // Вид 3 green still has only the hat sheet.
    expect(borrowed).toEqual(["sp3/c3/a1", "sp3/c3/a2"]);
  });

  it("bundles all 25 drawn looks with the animations the pet plays", () => {
    expect(DRAWN_VARIANTS.size).toBe(25);
    expect(PET_ATLAS_LAYOUT).toMatchObject({
      idle: { frames: 4 },
      walk: { frames: 6 },
      jump: { frames: 8 },
      push: { frames: 6 },
      still: { frames: 2 },
    });
  });
});
