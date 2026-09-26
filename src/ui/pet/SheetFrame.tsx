import { memo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { PET_FRAME_PX, PET_PITCH_PX } from "./petSprites.generated";

/**
 * One frame of a pre-upscaled sprite file, clipped by a square window.
 * The whole file stays one decoded bitmap, so changing frames only moves it:
 * no reload and no flicker. `fadeDuration={0}` stops Android fading the
 * picture in when the look changes.
 */
export const SheetFrame = memo(function SheetFrame({
  source,
  size,
  column,
  row = 0,
  fileWidthPx,
  fileHeightPx,
  flipped = false,
}: {
  source: ImageSourcePropType;
  size: number;
  column: number;
  row?: number;
  fileWidthPx: number;
  fileHeightPx: number;
  /** Mirror left–right (the art faces right). */
  flipped?: boolean;
}) {
  const scale = size / PET_FRAME_PX;
  const pitch = PET_PITCH_PX * scale;
  return (
    <View style={[styles.window, { width: size, height: size }, flipped ? styles.flipped : null]}>
      <Image
        source={source}
        fadeDuration={0}
        resizeMode="stretch"
        resizeMethod="scale"
        style={{
          position: "absolute",
          left: -column * pitch,
          top: -row * pitch,
          width: fileWidthPx * scale,
          height: fileHeightPx * scale,
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  window: {
    overflow: "hidden",
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
