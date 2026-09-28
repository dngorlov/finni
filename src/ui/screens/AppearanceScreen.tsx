import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ACCESSORY_KEYS, ACCESSORY_STAGE, accessoryUnlocked, type AccessoryKey } from "../../core/accessories";
import type { ProfileView } from "../../data/repositories/gameRepository";
import { META_KEYS } from "../../data/metaKeys";
import { BackButton } from "../components/BackButton";
import { BeadSlider } from "../components/BeadSlider";
import { Pictogram } from "../components/Pictogram";
import { Screen } from "../components/Screen";
import { ScreenTitle } from "../components/ScreenTitle";
import type { RootStackParamList } from "../navigation/types";
import { COLOR_KEYS, SPECIES_KEYS, type ColorKey, type SpeciesKey } from "../pet/keys";
import { PetView } from "../pet/PetView";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { petStrings } from "../stringsPet";
import { colors, minTarget, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Appearance">;

function asKey<K extends string>(keys: readonly K[], value: string): K {
  return (keys as readonly string[]).includes(value) ? (value as K) : keys[0]!;
}

/**
 * Внешний вид: the child changes Вид and Окрас at any time, and picks among
 * the Аксессуары their Этап has opened. Closed ones show a lock and the Этап
 * that opens them. Every choice is saved at once.
 */
export default function AppearanceScreen(_props: Props) {
  const { game, meta } = useSession();
  const profileId = meta.get(META_KEYS.activeProfileId);
  const [profile, setProfile] = useState<ProfileView | null>(() => (profileId ? game.getProfile(profileId) : null));

  if (!profileId || !profile) {
    return (
      <Screen>
        <BackButton />
      </Screen>
    );
  }

  const species = asKey<SpeciesKey>(SPECIES_KEYS, profile.species);
  const color = asKey<ColorKey>(COLOR_KEYS, profile.color);
  const save = (change: Partial<{ species: string; color: string; accessory: string }>) => {
    const next = { species: profile.species, color: profile.color, accessory: profile.accessory, ...change };
    game.setAppearance(profileId, next);
    setProfile(game.getProfile(profileId));
  };

  return (
    <Screen>
      <BackButton />
      <ScreenTitle style={styles.title}>{petStrings.appearanceTitle}</ScreenTitle>
      <View style={styles.preview}>
        <PetView
          species={profile.species}
          color={profile.color}
          accessory={profile.accessory}
          petName={profile.petName}
          pose="idle"
          size={160}
        />
      </View>
      <View style={styles.sliders}>
        <BeadSlider
          legend={petStrings.appearanceSpecies}
          keys={SPECIES_KEYS}
          labelOf={strings.speciesName}
          value={species}
          onChange={(next) => save({ species: next })}
        />
        <BeadSlider
          legend={petStrings.appearanceColor}
          keys={COLOR_KEYS}
          labelOf={strings.colorName}
          value={color}
          onChange={(next) => save({ color: next })}
        />
      </View>
      <Text role="heading" style={styles.heading}>
        {petStrings.appearanceAccessory}
      </Text>
      <View style={styles.tiles}>
        {ACCESSORY_KEYS.map((key) => (
          <AccessoryTile
            key={key}
            accessory={key}
            profile={profile}
            onPick={() => save({ accessory: key })}
          />
        ))}
      </View>
    </Screen>
  );
}

function AccessoryTile({
  accessory,
  profile,
  onPick,
}: {
  accessory: AccessoryKey;
  profile: ProfileView;
  onPick: () => void;
}) {
  const open = accessoryUnlocked(accessory, profile.stage);
  const selected = profile.accessory === accessory;
  const name = petStrings.accessoryName(accessory);
  const opensOn = ACCESSORY_STAGE[accessory];
  return (
    <Pressable
      role="button"
      aria-label={open ? name : petStrings.appearanceLockedA11y(name, opensOn)}
      aria-selected={selected}
      aria-disabled={!open}
      disabled={!open}
      onPress={onPick}
      style={[styles.tile, selected ? styles.tileOn : null, open ? null : styles.tileLocked]}
    >
      <View style={open ? null : styles.dim}>
        <PetView
          species={profile.species}
          color={profile.color}
          accessory={accessory}
          pose="idle"
          size={72}
          accessibilityHidden
        />
      </View>
      <Text style={styles.tileName}>{name}</Text>
      {open ? (
        selected ? (
          <Pictogram glyph={strings.selectedCheck} />
        ) : null
      ) : (
        <View style={styles.lockRow}>
          <Pictogram glyph={petStrings.appearanceLockIcon} />
          <Text style={styles.lockText}>{petStrings.appearanceLocked(opensOn)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  preview: {
    alignItems: "center",
  },
  sliders: {
    gap: spacing.l,
  },
  heading: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  tile: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.track,
    borderRadius: radius.card,
    borderWidth: 2,
    flexBasis: 96,
    flexGrow: 1,
    gap: 4,
    minHeight: minTarget,
    padding: spacing.s,
  },
  tileOn: {
    backgroundColor: colors.highlight,
    borderColor: colors.accent,
  },
  tileLocked: {
    backgroundColor: colors.disabledFace,
  },
  dim: {
    opacity: 0.35,
  },
  tileName: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: "700",
    textAlign: "center",
  },
  lockRow: {
    alignItems: "center",
    gap: 2,
  },
  lockText: {
    color: colors.text,
    fontSize: 14,
    textAlign: "center",
  },
});
