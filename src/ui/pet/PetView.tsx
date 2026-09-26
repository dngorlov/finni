import { View } from "react-native";
import { petStrings } from "../stringsPet";
import { petPosesSource } from "./assets";
import { poseFromMeters, type PetPose } from "./keys";
import { PET_FRAME_PX, PET_PITCH_PX, PET_POSE_COLUMN, PET_POSE_COLUMNS } from "./petSprites.generated";
import { SheetFrame } from "./SheetFrame";

const DEFAULT_SIZE = 120;
const POSES_WIDTH = PET_POSE_COLUMNS * PET_PITCH_PX;

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
      <SheetFrame
        source={petPosesSource({ species, color, accessory })}
        size={size}
        column={PET_POSE_COLUMN[resolved]}
        fileWidthPx={POSES_WIDTH}
        fileHeightPx={PET_FRAME_PX}
      />
    </View>
  );
}
