/** Moscow map art is 3:4 (width / height). */
export const MAP_ASPECT = 3 / 4;

/** Largest 3:4 map that fits the slot. The art stays fully inside it. */
export function containedMapSize(slotWidth: number, slotHeight: number): { width: number; height: number } {
  if (slotWidth <= 0 || slotHeight <= 0) return { width: 0, height: 0 };
  const height = Math.min(slotHeight, slotWidth / MAP_ASPECT);
  return { width: height * MAP_ASPECT, height };
}
