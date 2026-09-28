import type { View } from "react-native";
import type { SpotlightBox } from "./finnyScript";

/** Reports a control’s shell rect so the tour dim can leave that spot bright. */
export function measureSpotlight(
  node: View | null,
  root: View | null,
  id: string,
  onBox: ((id: string, box: SpotlightBox) => void) | undefined,
  radius?: number,
  expand = 0,
) {
  if (!node || !root || !onBox || typeof node.measureLayout !== "function") return;
  node.measureLayout(
    root,
    (x, y, width, height) =>
      onBox(id, {
        x: x - expand,
        y: y - expand,
        width: width + expand * 2,
        height: height + expand * 2,
        radius: radius == null ? undefined : radius + expand,
      }),
    () => {},
  );
}
