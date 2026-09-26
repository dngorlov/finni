/**
 * Cuts Andrei's sprite sheets (design/pets/andrei/pet_{1,2,3}_{gray,orange,green}[_glasses|_hat].png)
 * into the pet asset contract used by src/ui/pet:
 *
 *   assets/pets/atlas/sp{N}_c{N}_a{N}.png  — every animation the living pet on Дом plays
 *   assets/pets/poses/sp{N}_c{N}_a{N}.png  — three still poses (idle, happy, sad) for PetView
 *   src/ui/pet/petSprites.generated.ts     — typed `require` map so Metro bundles them
 *
 * Sheets are a 15 × 8 grid of 32 px cells. The legend (design/pets/for_animations.png)
 * names the cells; ANIMATIONS below copies it. Frames are scaled up ×8 with
 * nearest-neighbour so the device shows 256 px art instead of blurring 32 px art,
 * and every frame sits in a 272 px cell (16 px transparent gutter) so a frame
 * boundary that lands between physical pixels never bleeds the neighbouring frame.
 *
 * Re-run after a new sheet drop:
 *   node scripts/slice-pet-sheets.mjs
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sheetsDir = join(repoRoot, "design", "pets", "andrei");
const atlasDir = join(repoRoot, "assets", "pets", "atlas");
const posesDir = join(repoRoot, "assets", "pets", "poses");
const generatedFile = join(repoRoot, "src", "ui", "pet", "petSprites.generated.ts");

const CELL = 32;
const SCALE = 8;
const FRAME = CELL * SCALE;
const GUTTER = 16;
const PITCH = FRAME + GUTTER;

/**
 * Atlas rows. `cells` are [row, column] in Andrei's grid, in play order.
 * From the legend: IDLE row 5 cols 0–3, WALK row 1 cols 0–5, JUMP row 1
 * cols 7–14, PUSH row 6 cols 0–5, PIC row 0 col 0, FALLS row 4 col 8.
 * RUN, ATTACK, GOT HURT and 2nd ATTACK are not used by the app.
 */
const ANIMATIONS = [
  { name: "idle", cells: [0, 1, 2, 3].map((col) => [5, col]) },
  { name: "walk", cells: [0, 1, 2, 3, 4, 5].map((col) => [1, col]) },
  { name: "jump", cells: [7, 8, 9, 10, 11, 12, 13, 14].map((col) => [1, col]) },
  { name: "push", cells: [0, 1, 2, 3, 4, 5].map((col) => [6, col]) },
  // One-frame stills share the last row: PIC, then FALLS.
  { name: "still", cells: [[0, 0], [4, 8]] },
];

/** Still poses for PetView: PIC, the top of the jump, and FALLS (a tumble, never a hurt frame). */
const POSES = [
  { name: "idle", cell: [0, 0] },
  { name: "happy", cell: [1, 11] },
  { name: "sad", cell: [4, 8] },
];

const SPECIES = { 1: "sp1", 2: "sp2", 3: "sp3" };
const COLORS = { gray: "c1", orange: "c2", green: "c3" };
const ACCESSORIES = { "": "a1", glasses: "a2", hat: "a3" };
const pattern = /^pet_([123])_(gray|orange|green)(?:_(glasses|hat))?\.png$/;

function blit(sheet, [row, col], out, dx, dy) {
  for (let y = 0; y < FRAME; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      const sx = col * CELL + Math.floor(x / SCALE);
      const sy = row * CELL + Math.floor(y / SCALE);
      const from = (sy * sheet.width + sx) * 4;
      const to = ((dy + y) * out.width + dx + x) * 4;
      sheet.data.copy(out.data, to, from, from + 4);
    }
  }
}

function opaque(sheet, [row, col]) {
  let count = 0;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      if (sheet.data[((row * CELL + y) * sheet.width + col * CELL + x) * 4 + 3] > 0) count += 1;
    }
  }
  return count;
}

function write(png) {
  return PNG.sync.write(png, { deflateLevel: 9, deflateStrategy: 3 });
}

const columns = Math.max(...ANIMATIONS.map((animation) => animation.cells.length));
rmSync(atlasDir, { recursive: true, force: true });
rmSync(posesDir, { recursive: true, force: true });
mkdirSync(atlasDir, { recursive: true });
mkdirSync(posesDir, { recursive: true });

const variants = [];
for (const file of readdirSync(sheetsDir).sort()) {
  const match = pattern.exec(file);
  if (!match) continue;
  const key = `${SPECIES[match[1]]}/${COLORS[match[2]]}/${ACCESSORIES[match[3] ?? ""]}`;
  const sheet = PNG.sync.read(readFileSync(join(sheetsDir, file)));
  if (sheet.width !== 15 * CELL || sheet.height !== 8 * CELL) {
    throw new Error(`${file}: ${sheet.width}×${sheet.height} is not the 15×8 grid of ${CELL}px cells`);
  }
  const atlas = new PNG({ width: columns * PITCH, height: ANIMATIONS.length * PITCH });
  ANIMATIONS.forEach((animation, row) => {
    animation.cells.forEach((cell, col) => {
      if (opaque(sheet, cell) === 0) throw new Error(`${file}: ${animation.name} cell ${cell} is empty`);
      blit(sheet, cell, atlas, col * PITCH, row * PITCH);
    });
  });
  const poses = new PNG({ width: POSES.length * PITCH, height: FRAME });
  POSES.forEach((pose, col) => blit(sheet, pose.cell, poses, col * PITCH, 0));
  const base = key.replaceAll("/", "_");
  writeFileSync(join(atlasDir, `${base}.png`), write(atlas));
  writeFileSync(join(posesDir, `${base}.png`), write(poses));
  variants.push({ key, base });
  console.log(`${file} → ${key}`);
}

const layout = Object.fromEntries(
  ANIMATIONS.map((animation, row) => [animation.name, { row, frames: animation.cells.length }]),
);
const lines = [
  "// Generated by scripts/slice-pet-sheets.mjs — do not edit by hand.",
  'import type { ImageSourcePropType } from "react-native";',
  "",
  `/** Source frame after the ×${SCALE} nearest-neighbour upscale. */`,
  `export const PET_FRAME_PX = ${FRAME};`,
  "/** Distance between frame origins in both files (frame + transparent gutter). */",
  `export const PET_PITCH_PX = ${PITCH};`,
  `export const PET_ATLAS_COLUMNS = ${columns};`,
  `export const PET_ATLAS_ROWS = ${ANIMATIONS.length};`,
  `export const PET_POSE_COLUMNS = ${POSES.length};`,
  "",
  "/** Atlas rows. `still` holds PIC (frame 0) and FALLS (frame 1). */",
  `export const PET_ATLAS_LAYOUT = ${JSON.stringify(layout, null, 2)} as const;`,
  "",
  "/** Column of each still pose in the poses strip. */",
  `export const PET_POSE_COLUMN = ${JSON.stringify(
    Object.fromEntries(POSES.map((pose, col) => [pose.name, col])),
    null,
    2,
  )} as const;`,
  "",
  "export type PetSheet = { atlas: ImageSourcePropType; poses: ImageSourcePropType };",
  "",
  "/** Every species/color/accessory Andrei has drawn, keyed `sp/c/a`. */",
  "export const PET_SHEETS: Readonly<Record<string, PetSheet>> = {",
  ...variants.map(
    ({ key, base }) =>
      `  "${key}": {\n    atlas: require("../../../assets/pets/atlas/${base}.png"),\n    poses: require("../../../assets/pets/poses/${base}.png"),\n  },`,
  ),
  "};",
  "",
];
writeFileSync(generatedFile, lines.join("\n"));
console.log(`${variants.length} variants written`);
