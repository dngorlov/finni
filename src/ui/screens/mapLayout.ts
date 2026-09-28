/** Moscow map art is 3:4 (width / height). */
export const MAP_ASPECT = 3 / 4;

/** Largest 3:4 map that fits the slot. The art stays fully inside it. */
export function containedMapSize(slotWidth: number, slotHeight: number): { width: number; height: number } {
  if (slotWidth <= 0 || slotHeight <= 0) return { width: 0, height: 0 };
  const height = Math.min(slotHeight, slotWidth / MAP_ASPECT);
  return { width: height * MAP_ASPECT, height };
}

/** Карта zoom range: the whole map up to three times closer. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

/**
 * Zoom and pan of the map box, as RN applies `[translateX, translateY, scale]`:
 * scaled about the box centre, then shifted. A map point p lands at
 * centre + shift + scale · (p − centre).
 */
export type MapView = { scale: number; x: number; y: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export const IDENTITY_VIEW: MapView = { scale: 1, x: 0, y: 0 };

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Furthest shift that still keeps the zoomed art over the whole box (no empty edge). */
export function clampShift(shift: number, scale: number, length: number): number {
  const limit = ((scale - 1) * length) / 2;
  if (limit <= 0) return 0;
  return Math.min(limit, Math.max(-limit, shift));
}

export function clampView(view: MapView, size: Size): MapView {
  const scale = clampZoom(view.scale);
  return {
    scale,
    x: clampShift(view.x, scale, size.width),
    y: clampShift(view.y, scale, size.height),
  };
}

/** Where a map point (box coordinates) shows on screen, relative to the box. */
export function mapToView(point: Point, view: MapView, size: Size): Point {
  const cx = size.width / 2;
  const cy = size.height / 2;
  return { x: cx + view.x + view.scale * (point.x - cx), y: cy + view.y + view.scale * (point.y - cy) };
}

/** The map point under a screen point (box coordinates). Inverse of mapToView. */
export function viewToMap(point: Point, view: MapView, size: Size): Point {
  const cx = size.width / 2;
  const cy = size.height / 2;
  return { x: cx + (point.x - cx - view.x) / view.scale, y: cy + (point.y - cy - view.y) / view.scale };
}

/** A drag moves the zoomed map with the finger, never past its edges. */
export function panView(start: MapView, dx: number, dy: number, size: Size): MapView {
  return clampView({ scale: start.scale, x: start.x + dx, y: start.y + dy }, size);
}

/**
 * Two-finger pinch: the map point that was under the fingers' midpoint stays
 * under the midpoint as it moves, and the zoom follows the finger spread.
 */
export function pinchView(
  start: MapView,
  startFocus: Point,
  focus: Point,
  ratio: number,
  size: Size,
): MapView {
  const scale = clampZoom(start.scale * ratio);
  const anchor = viewToMap(startFocus, start, size);
  const cx = size.width / 2;
  const cy = size.height / 2;
  return clampView(
    { scale, x: focus.x - cx - scale * (anchor.x - cx), y: focus.y - cy - scale * (anchor.y - cy) },
    size,
  );
}

/** Double tap: zoomed → back to the whole map; whole map → 2× around the tap. */
export function doubleTapView(view: MapView, at: Point, size: Size): MapView {
  if (view.scale > MIN_ZOOM + 0.01) return IDENTITY_VIEW;
  return pinchView(view, at, at, 2, size);
}
