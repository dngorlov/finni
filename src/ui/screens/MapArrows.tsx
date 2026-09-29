import { StyleSheet } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { missionPrerequisite, type TaskContent } from "../../core/tasks";
import { colors } from "../theme";
import { arrowShape, type Point, type Size } from "./mapLayout";

/** One Карта arrow: from the Урок that leads on to the next one. */
export type MapEdge = { from: TaskContent; to: TaskContent };

/**
 * The path drawn on Карта: each pin's prerequisite leads to it. The first Урок
 * is the start of all three paths, so a topic's first pin that is open from the
 * start still hangs off it. Drawing only — which pins open stays in core/tasks.
 */
export function mapEdges(pins: readonly TaskContent[], tasks: readonly TaskContent[]): MapEdge[] {
  const start = pins[0];
  if (!start) return [];
  return pins.flatMap((task) => {
    if (task === start) return [];
    const before = missionPrerequisite(task, tasks) ?? start;
    return pins.includes(before) ? [{ from: before, to: task }] : [];
  });
}

/**
 * Curved arrows between the pins, under them and inside the zoomed layer so they
 * move with the art. `gap` is the pin radius: every arrow stops at a pin's edge.
 * A walked stretch (its start is done) is drawn solid, the rest dashed and pale.
 */
export function MapArrows({
  edges,
  size,
  gap,
  walked,
}: {
  edges: readonly MapEdge[];
  size: Size;
  gap: number;
  walked: (edge: MapEdge) => boolean;
}) {
  if (size.width <= 0 || size.height <= 0) return null;
  const at = (task: TaskContent): Point => ({
    x: (task.pin?.x ?? 0.5) * size.width,
    y: (task.pin?.y ?? 0.5) * size.height,
  });
  const centre = edges[0] ? at(edges[0].from) : { x: size.width / 2, y: size.height / 2 };
  return (
    <Svg
      testID="map-arrows"
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width={size.width}
      height={size.height}
      style={styles.layer}
    >
      {edges.map((edge) => {
        const shape = arrowShape(at(edge.from), at(edge.to), { gap, head: 10, centre });
        if (!shape) return null;
        const strong = walked(edge);
        const color = strong ? colors.raisedEdge : colors.disabledFace;
        return (
          <G key={`${edge.from.id}>${edge.to.id}`} testID="map-arrow">
            <Path
              d={shape.line}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={strong ? undefined : "6 6"}
              fill="none"
            />
            <Path d={shape.head} fill={color} />
          </G>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  layer: {
    left: 0,
    position: "absolute",
    top: 0,
  },
});
