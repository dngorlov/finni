import { PET_ART_PX, type PetPixels } from "./petSprites.generated";

/** One colour of a frame as an SVG path of whole art-pixel rectangles. */
export type PixelLayer = { fill: string; d: string };

const cache = new WeakMap<PetPixels, Map<string, readonly PixelLayer[]>>();

/**
 * Turns one run-length encoded frame into a path per colour, in art pixels
 * (0–`artPx`, 32 for the pet). `flipped` mirrors it left–right (the art faces right), so no view
 * transform is needed. Built once per look, frame, and direction.
 */
export function frameLayers(
  pixels: PetPixels,
  frame: number,
  flipped = false,
  artPx: number = PET_ART_PX,
): readonly PixelLayer[] {
  let perLook = cache.get(pixels);
  if (!perLook) {
    perLook = new Map();
    cache.set(pixels, perLook);
  }
  const key = `${frame}${flipped ? "<" : ">"}`;
  const known = perLook.get(key);
  if (known) return known;

  const encoded = pixels.frames[frame] ?? "";
  const paths = new Map<number, string[]>();
  encoded.split("/").forEach((row, y) => {
    let x = 0;
    for (let i = 0; i + 1 < row.length; i += 2) {
      const colour = row[i]!;
      const length = parseInt(row[i + 1]!, 36);
      if (colour !== ".") {
        const index = Number(colour);
        const left = flipped ? artPx - x - length : x;
        const list = paths.get(index) ?? [];
        list.push(`M${left} ${y}h${length}v1h-${length}z`);
        paths.set(index, list);
      }
      x += length;
    }
  });
  const layers = [...paths.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, parts]) => ({ fill: pixels.palette[index] ?? "#000000", d: parts.join("") }));
  perLook.set(key, layers);
  return layers;
}

/**
 * The largest art size that fits `size` dp and puts every art pixel on a whole
 * number of physical pixels, so no edge ever lands between two screen pixels.
 * Returns the side in dp and the art-pixel scale in physical pixels.
 */
export function crispArtSize(
  size: number,
  pixelRatio: number,
  artPx: number = PET_ART_PX,
): { side: number; scale: number } {
  const scale = Math.max(1, Math.floor((size * pixelRatio + 1e-6) / artPx));
  return { side: (scale * artPx) / pixelRatio, scale };
}
