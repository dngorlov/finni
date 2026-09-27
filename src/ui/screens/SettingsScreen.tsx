import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { APP_BUILD, APP_VERSION } from "../appInfo";
import { BackButton } from "../components/BackButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { Card } from "../components/Card";
import { PixelIcon } from "../components/Pictogram";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useEarnedAchievementCount } from "../components/AchievementBoard";
import { VolumeControl } from "../components/VolumeControl";
import { META_KEYS } from "../../data/metaKeys";
import { clampVolume, readSoundVolume } from "../sound/cues";
import { playCue } from "../sound/playCue";
import { useSession } from "../session/SessionProvider";
import type { RootStackParamList } from "../navigation/types";
import { strings } from "../strings";
import { ACHIEVEMENT_TOTAL, achievementStrings } from "../stringsAchievements";
import { homeStrings } from "../stringsHome";
import { petStrings } from "../stringsPet";
import { colors, minTarget, radius, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const earned = useEarnedAchievementCount();
  return (
    <Screen>
      <BackButton />
      <Card>
        <ScreenTitle style={styles.title}>{strings.appName}</ScreenTitle>
        <Text style={styles.body}>{strings.versionLine(APP_VERSION, APP_BUILD)}</Text>
      </Card>
      <PrimaryButton label={strings.navAdult} onPress={() => navigation.navigate("AdultGate")} />
      <PrimaryButton label={petStrings.appearanceOpen} onPress={() => navigation.navigate("Appearance")} />
      <SoundSettings />
      <View style={styles.links}>
        <SettingsLink
          label={achievementStrings.section}
          value={achievementStrings.progressCompact(earned, ACHIEVEMENT_TOTAL)}
          accessibilityLabel={`${achievementStrings.section}. ${achievementStrings.progressA11y(earned, ACHIEVEMENT_TOTAL)}`}
          onPress={() => navigation.navigate("Achievements")}
        />
        <SettingsLink
          label={homeStrings.creditsTitle}
          bordered
          onPress={() => navigation.navigate("Credits")}
        />
      </View>
    </Screen>
  );
}

function SettingsLink({
  label,
  value,
  accessibilityLabel,
  bordered,
  onPress,
}: {
  label: string;
  value?: string;
  accessibilityLabel?: string;
  bordered?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, bordered ? styles.linkBorder : null, pressed ? styles.linkPressed : null]}
    >
      <Text style={styles.linkLabel}>{label}</Text>
      <View style={styles.linkTrail}>
        {value ? <Text style={styles.linkValue}>{value}</Text> : null}
        <PixelIcon name="arrow-right" size={20} color={colors.accentText} />
      </View>
    </Pressable>
  );
}

function SoundSettings() {
  const { meta } = useSession();
  const [volume, setVolume] = useState(() => readSoundVolume(meta.get(META_KEYS.soundVolume)));

  const save = (next: number) => {
    const value = clampVolume(next);
    setVolume(value);
    meta.set(META_KEYS.soundVolume, String(value));
    return value;
  };

  return (
    <Card>
      <Text role="heading" style={styles.groupTitle}>
        {strings.soundTitle}
      </Text>
      <Text style={styles.body}>{strings.soundHint}</Text>
      <VolumeControl
        value={volume}
        onChange={save}
        onCommit={(next) => {
          const value = save(next);
          if (value > 0) void playCue("correct", value);
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
  body: {
    color: colors.subtle,
    fontSize: type.body,
  },
  groupTitle: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: "700",
  },
  links: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  link: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
    minHeight: minTarget,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  linkBorder: {
    borderTopColor: colors.track,
    borderTopWidth: 1,
  },
  linkPressed: {
    backgroundColor: colors.track,
  },
  linkLabel: {
    color: colors.text,
    flex: 1,
    fontSize: type.body,
    fontWeight: "700",
  },
  linkTrail: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.s,
  },
  linkValue: {
    color: colors.subtle,
    fontSize: type.body,
    fontWeight: "700",
  },
});
