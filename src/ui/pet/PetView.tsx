import { View } from "react-native";
import { petStrings } from "../stringsPet";
import { petPixels } from "./assets";
import { poseFromMeters, type PetPose } from "./keys";
import { PET_POSE_FRAME } from "./petSprites.generated";
import { PixelFrame } from "./PixelFrame";

const DEFAULT_SIZE = 120;

/** A still Питомец: one pose of Andrei's art for this Вид, Окрас, and Аксессуар. */
export function PetView({
  species,
  color,
  accessory,
  petName,
  care,
  mood,
  pose,
  size = DEFAULT_SIZE,
  accessibilityHidden = false,
}: {
  species: string;
  color: string;
  accessory: string;
  petName?: string;
  care?: number;
  mood?: number;
  pose?: PetPose;
  size?: number;
  accessibilityHidden?: boolean;
}) {
  const resolved: PetPose =
    pose ?? (care !== undefined && mood !== undefined ? poseFromMeters(care, mood) : "idle");
  return (
    <View
      accessible={!accessibilityHidden}
      role={accessibilityHidden ? undefined : "img"}
      aria-hidden={accessibilityHidden}
      aria-label={
        accessibilityHidden
          ? undefined
          : petStrings.petA11y({ petName, species, color, accessory, pose: resolved })
      }
      style={{ height: size, width: size }}
    >
      <PixelFrame pixels={petPixels({ species, color, accessory })} frame={PET_POSE_FRAME[resolved]} size={size} />
    </View>
  );
}
