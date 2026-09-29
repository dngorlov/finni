import { memo } from "react";
import { PixelRatio, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { crispArtSize, frameLayers } from "../pet/pixelArt";
import { ITEM_ART_PX, ITEM_SPRITES, type ItemSpriteName } from "./itemSprites.generated";

export function isItemSprite(name: string | undefined): name is ItemSpriteName {
  return name != null && Object.prototype.hasOwnProperty.call(ITEM_SPRITES, name);
}

/**
 * A 16 px shop item picture drawn as SVG squares, like the pet (PixelFrame):
 * a scaled bitmap is blurred on Android, squares on whole physical pixels stay
 * hard. The art takes the largest whole-pixel scale that fits `size` and is
 * centred in a `size` box. Decorative: the row around it carries the name.
 */
export const ItemSprite = memo(function ItemSprite({ name, size }: { name: ItemSpriteName; size: number }) {
  const { side } = crispArtSize(size, PixelRatio.get(), ITEM_ART_PX);
  const offset = PixelRatio.roundToNearestPixel((size - side) / 2);
  const layers = frameLayers(ITEM_SPRITES[name], 0, false, ITEM_ART_PX);
  return (
    <View
      testID={`item-sprite-${name}`}
      style={{ width: size, height: size }}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={side}
        height={side}
        viewBox={`0 0 ${ITEM_ART_PX} ${ITEM_ART_PX}`}
        style={{ position: "absolute", left: offset, top: offset }}
      >
        {layers.map((layer) => (
          <Path key={layer.fill} d={layer.d} fill={layer.fill} />
        ))}
      </Svg>
    </View>
  );
});
