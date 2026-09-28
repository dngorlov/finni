/**
 * Cuts Andrei's sprite sheets (design/pets/andrei/pet_{1,2,3}_{gray,orange,green}[_glasses|_hat].png)
 * into the pet pixel data used by src/ui/pet:
 *
 *   src/ui/pet/petSprites.generated.ts — per look: its palette and every frame the
 *   pet plays, as run-length encoded 32 × 32 pixel rows.
 *
 * The app draws those pixels as SVG squares (PixelFrame), not as a bitmap. A
 * bitmap on Android is always drawn with bilinear filtering, so any scale that is
 * not exactly 1:1 — and every sub-pixel step of a moving pet — blends the edge
 * of each art pixel into its neighbour. Squares on a whole-pixel grid have hard
 * edges at any size.
 *
 * Sheets are a 15 × 8 grid of 32 px cells. The legend (design/pets/for_animations.png)
 * names the cells; CLIPS below copies it.
 *
 * Encoding of one frame: 32 rows joined by "/"; a row is runs of `<colour><length>`,
 * where colour is "." (transparent) or a digit indexing the palette, and length is
 * one base-36 digit (1–32). A transparent tail of a row is left out.
 *
 * Re-run after a new sheet drop:
 *   node scripts/slice-pet-sheets.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sheetsDir = join(repoRoot, "design", "pets", "andrei");
const generatedFile = join(repoRoot, "src", "ui", "pet", "petSprites.generated.ts");

const CELL = 32;

/**
 * Clips in play order. `cells` are [row, column] in Andrei's grid. From the
 * legend: IDLE row 5 cols 0–3, WALK row 1 cols 0–5, JUMP row 1 cols 7–14,
 * PUSH row 6 cols 0–5, ATTACK row 3 cols 0–3, PIC row 0 col 0, FALLS row 4 col 8.
 * RUN, RUN + ATTACK, GOT HURT and 2nd ATTACK are not used by the app.
 */
const CLIPS = [
  { name: "idle", cells: [0, 1, 2, 3].map((col) => [5, col]) },
  { name: "walk", cells: [0, 1, 2, 3, 4, 5].map((col) => [1, col]) },
  { name: "jump", cells: [7, 8, 9, 10, 11, 12, 13, 14].map((col) => [1, col]) },
  { name: "push", cells: [0, 1, 2, 3, 4, 5].map((col) => [6, col]) },
  { name: "attack", cells: [0, 1, 2, 3].map((col) => [3, col]) },
  // One-frame stills: PIC, then FALLS.
  { name: "still", cells: [[0, 0], [4, 8]] },
];

/** Still poses for PetView, as [clip, frame]: PIC, the top of the jump, and FALLS (a tumble, never a hurt frame). */
const POSES = { idle: ["still", 0], happy: ["jump", 4], sad: ["still", 1] };

const SPECIES = { 1: "sp1", 2: "sp2", 3: "sp3" };
const COLORS = { gray: "c1", orange: "c2", green: "c3" };
const ACCESSORIES = { "": "a1", glasses: "a2", hat: "a3" };
const pattern = /^pet_([123])_(gray|orange|green)(?:_(glasses|hat))?\.png$/;

function hex(value) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function encodeFrame(sheet, [row, col], palette) {
  const rows = [];
  let opaque = 0;
  for (let y = 0; y < CELL; y += 1) {
    const runs = [];
    let x = 0;
    while (x < CELL) {
      const at = (sx) => ((row * CELL + y) * sheet.width + col * CELL + sx) * 4;
      const colourAt = (sx) => {
        const i = at(sx);
        if (sheet.data[i + 3] === 0) return ".";
        if (sheet.data[i + 3] !== 255) throw new Error(`half-transparent pixel at cell ${row},${col}`);
        const key = `#${hex(sheet.data[i])}${hex(sheet.data[i + 1])}${hex(sheet.data[i + 2])}`;
        let index = palette.indexOf(key);
        if (index < 0) {
          palette.push(key);
          index = palette.length - 1;
        }
        if (index > 9) throw new Error("more than 10 colours in one sheet");
        return String(index);
      };
      const colour = colourAt(x);
      let length = 1;
      while (x + length < CELL && colourAt(x + length) === colour) length += 1;
      if (colour !== ".") opaque += length;
      runs.push(colour + length.toString(36));
      x += length;
    }
    // A transparent tail says nothing: the decoder stops at the end of the runs.
    if (runs.length > 0 && runs[runs.length - 1].startsWith(".")) runs.pop();
    rows.push(runs.join(""));
  }
  if (opaque === 0) throw new Error(`cell ${row},${col} is empty`);
  return rows.join("/");
}

const variants = [];
for (const file of readdirSync(sheetsDir).sort()) {
  const match = pattern.exec(file);
  if (!match) continue;
  const key = `${SPECIES[match[1]]}/${COLORS[match[2]]}/${ACCESSORIES[match[3] ?? ""]}`;
  const sheet = PNG.sync.read(readFileSync(join(sheetsDir, file)));
  if (sheet.width !== 15 * CELL || sheet.height !== 8 * CELL) {
    throw new Error(`${file}: ${sheet.width}×${sheet.height} is not the 15×8 grid of ${CELL}px cells`);
  }
  const palette = [];
  const frames = [];
  for (const clip of CLIPS) {
    for (const cell of clip.cells) {
      try {
        frames.push(encodeFrame(sheet, cell, palette));
      } catch (error) {
        throw new Error(`${file}: ${clip.name}: ${error.message}`);
      }
    }
  }
  variants.push({ key, palette, frames });
  console.log(`${file} → ${key}`);
}

let start = 0;
const layout = {};
for (const clip of CLIPS) {
  layout[clip.name] = { start, frames: clip.cells.length };
  start += clip.cells.length;
}
const poseFrames = Object.fromEntries(
  Object.entries(POSES).map(([pose, [clip, frame]]) => [pose, layout[clip].start + frame]),
);

const lines = [
  "// Generated by scripts/slice-pet-sheets.mjs — do not edit by hand.",
  "",
  "/** Side of one frame of Andrei's art, in art pixels. */",
  `export const PET_ART_PX = ${CELL};`,
  "",
  "/** Where each clip sits in a look's `frames`. `still` holds PIC (frame 0) and FALLS (frame 1). */",
  `export const PET_CLIPS = ${JSON.stringify(layout, null, 2)} as const;`,
  "",
  "/** Frame of each still pose in a look's `frames`. */",
  `export const PET_POSE_FRAME = ${JSON.stringify(poseFrames, null, 2)} as const;`,
  "",
  "/** A look: its colours and every frame, run-length encoded (see the script). */",
  "export type PetPixels = { palette: readonly string[]; frames: readonly string[] };",
  "",
  "/** Every species/color/accessory Andrei has drawn, keyed `sp/c/a`. */",
  "export const PET_SHEETS: Readonly<Record<string, PetPixels>> = {",
  ...variants.map(
    ({ key, palette, frames }) =>
      `  "${key}": {\n    palette: ${JSON.stringify(palette)},\n    frames: [\n${frames
        .map((frame) => `      "${frame}",`)
        .join("\n")}\n    ],\n  },`,
  ),
  "};",
  "",
];
writeFileSync(generatedFile, lines.join("\n"));
console.log(`${variants.length} variants written`);
