import { memo } from "react";
import { PixelRatio, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { crispArtSize, frameLayers } from "./pixelArt";
import { PET_ART_PX, type PetPixels } from "./petSprites.generated";

/**
 * One frame of Andrei's 32 px art, drawn as SVG squares instead of a scaled
 * bitmap. Android always samples a scaled bitmap bilinearly, which smears the
 * edge of each art pixel; squares whose edges sit on whole physical pixels
 * stay hard at any size.
 *
 * The art takes the largest whole-pixel scale that fits `size`, stands on the
 * bottom edge (the floor), and is centred left–right. The box keeps `size`.
 */
export const PixelFrame = memo(function PixelFrame({
  pixels,
  frame,
  size,
  flipped = false,
}: {
  pixels: PetPixels;
  frame: number;
  size: number;
  /** Mirror left–right (the art faces right). */
  flipped?: boolean;
}) {
  const ratio = PixelRatio.get();
  const { side } = crispArtSize(size, ratio);
  const left = PixelRatio.roundToNearestPixel((size - side) / 2);
  const layers = frameLayers(pixels, frame, flipped);
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={side}
        height={side}
        viewBox={`0 0 ${PET_ART_PX} ${PET_ART_PX}`}
        style={{ position: "absolute", left, bottom: 0 }}
      >
        {layers.map((layer) => (
          <Path key={layer.fill} d={layer.d} fill={layer.fill} />
        ))}
      </Svg>
    </View>
  );
});
