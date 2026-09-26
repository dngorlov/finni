import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { APP_BUILD, APP_VERSION } from "../appInfo";
import { BackButton } from "../components/BackButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SettingsAchievements } from "../components/AchievementBoard";
import { VolumeControl } from "../components/VolumeControl";
import { META_KEYS } from "../../data/metaKeys";
import { clampVolume, readSoundVolume } from "../sound/cues";
import { playCue } from "../sound/playCue";
import { useSession } from "../session/SessionProvider";
import {
  AI_MODELS,
  TEAM,
  DEV_TOOLS,
  EDUCATIONAL_CONTENT,
  FONTS,
  ICONS,
  IMAGES,
  REFERENCES,
  RUNTIME_LIBRARIES,
  type Credit,
  type LibraryCredit,
} from "../credits";
import type { RootStackParamList } from "../navigation/types";
import { strings } from "../strings";
import { homeStrings } from "../stringsHome";
import { petStrings } from "../stringsPet";
import { colors, spacing, type } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const CREDIT_GROUPS: { title: string; items: readonly Credit[] }[] = [
  { title: homeStrings.creditsTeam, items: TEAM },
  { title: homeStrings.creditsAi, items: AI_MODELS },
  { title: homeStrings.creditsFonts, items: FONTS },
  { title: homeStrings.creditsIcons, items: ICONS },
  { title: homeStrings.creditsImages, items: IMAGES },
  { title: homeStrings.creditsReferences, items: REFERENCES },
  { title: homeStrings.creditsContent, items: EDUCATIONAL_CONTENT },
];

export default function SettingsScreen({ navigation }: Props) {
  return (
    <Screen>
      <BackButton />
      <Card>
        <ScreenTitle style={styles.title}>{strings.appName}</ScreenTitle>
        <Text style={styles.body}>{strings.versionLine(APP_VERSION, APP_BUILD)}</Text>
      </Card>
      <PrimaryButton label={petStrings.appearanceOpen} onPress={() => navigation.navigate("Appearance")} />
      <SoundSettings />
      <SettingsAchievements />
      <PrimaryButton label={strings.navAdult} onPress={() => navigation.navigate("AdultGate")} />
      <Text role="heading" style={styles.heading}>
        {homeStrings.creditsTitle}
      </Text>
      {CREDIT_GROUPS.slice(0, 1).map((group) => (
        <Card key={group.title}>
          <Text role="heading" style={styles.groupTitle}>
            {group.title}
          </Text>
          {group.items.map((item) => (
            <View key={item.what} style={styles.row}>
              <Text style={styles.rowName}>{item.what}</Text>
              <Text style={styles.rowMeta}>{item.source}</Text>
            </View>
          ))}
        </Card>
      ))}
      <LibraryGroup title={homeStrings.creditsLibraries} items={RUNTIME_LIBRARIES} />
      <LibraryGroup title={homeStrings.creditsDevTools} items={DEV_TOOLS} />
      {CREDIT_GROUPS.slice(1).map((group) => (
        <Card key={group.title}>
          <Text role="heading" style={styles.groupTitle}>
            {group.title}
          </Text>
          {group.items.map((item) => (
            <View key={item.what} style={styles.row}>
              <Text style={styles.rowName}>{item.what}</Text>
              <Text style={styles.rowMeta}>{item.source}</Text>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
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

function LibraryGroup({ title, items }: { title: string; items: readonly LibraryCredit[] }) {
  return (
    <Card>
      <Text role="heading" style={styles.groupTitle}>
        {title}
      </Text>
      {items.map((item) => (
        <View key={item.pkg} style={styles.row}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowMeta}>{homeStrings.creditsLibraryLine(item.version, item.license)}</Text>
        </View>
      ))}
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
  heading: {
    color: colors.text,
    fontSize: type.section,
    fontWeight: "700",
    marginTop: spacing.s,
  },
  groupTitle: {
    color: colors.accentText,
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    borderTopColor: colors.track,
    borderTopWidth: 1,
    gap: 2,
    paddingTop: 6,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  rowMeta: {
    color: colors.subtle,
    fontSize: 14,
  },
});
