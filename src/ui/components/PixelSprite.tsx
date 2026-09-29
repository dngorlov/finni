import { Image, type ImageSourcePropType } from "react-native";

/** Andrei's 12 px pixel icons, stored ×8 (96 px) so they shrink sharp. */
const SPRITES = {
  coin: require("../../../assets/icons/coin.png"),
  "coin-silver": require("../../../assets/icons/coin-silver.png"),
  map: require("../../../assets/icons/map.png"),
  home: require("../../../assets/icons/home.png"),
  gear: require("../../../assets/icons/gear.png"),
  mood: require("../../../assets/icons/mood.png"),
  /** Red frown made from Andrei's mood face: «если отложить: счастье −N». */
  "mood-down": require("../../../assets/icons/mood-down.png"),
  food: require("../../../assets/icons/food.png"),
  check: require("../../../assets/icons/check.png"),
  locked: require("../../../assets/icons/locked.png"),
  shop: require("../../../assets/icons/shop.png"),
  task: require("../../../assets/icons/task.png"),
} satisfies Record<string, ImageSourcePropType>;

export type SpriteName = keyof typeof SPRITES;

/** Decorative pixel icon; the control around it carries the label. */
export function PixelSprite({ name, size = 24 }: { name: SpriteName; size?: number }) {
  return (
    <Image
      source={SPRITES[name]}
      style={{ height: size, width: size }}
      resizeMode="contain"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
