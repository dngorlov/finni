import { useCallback } from "react";
import { BackHandler, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { META_KEYS } from "../../data/metaKeys";
import { EarnedAchievements } from "../components/AchievementBoard";
import { BackButton } from "../components/BackButton";
import { ScreenTitle } from "../components/ScreenTitle";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { StatusStrip } from "../components/StatusStrip";
import type { RootStackParamList } from "../navigation/types";
import { usePlayChrome } from "../navigation/playChrome";
import { useSession } from "../session/SessionProvider";
import { strings } from "../strings";
import { colors, type } from "../theme";
import { ClosedDayReport, readDayInsights } from "./dayReport";
import { OpenedToolCard, openedToolOnDay, type OpenedTool } from "./openedTool";

type Props = NativeStackScreenProps<RootStackParamList, "DaySummary">;

export default function DaySummaryScreen({ navigation, route }: Props) {
  const { game, meta, content } = useSession();
  const { setTab } = usePlayChrome();
  const profileId = meta.get(META_KEYS.activeProfileId);
  const profile = profileId ? game.getProfile(profileId) : null;
  const summary = profileId ? game.lastClosedDay(profileId) : null;
  const openedFromDay =
    profileId && summary ? openedToolOnDay(game.listJournal(profileId), summary.n) : null;
  const openedTool: OpenedTool | null = profile?.isDemo ? null : (route.params?.openedTool ?? openedFromDay);
  const insights = profileId && summary ? readDayInsights(game, content, profileId, summary) : [];

  const beginNextDay = useCallback(() => {
    setTab("home");
    if (navigation.canGoBack()) {
      navigation.popTo("Main");
      return;
    }
    navigation.navigate("Main");
  }, [navigation, setTab]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        beginNextDay();
        return true;
      });
      return () => subscription.remove();
    }, [beginNextDay]),
  );

  if (!summary) {
    return (
      <Screen header={<StatusStrip />}>
        <BackButton />
        <ScreenTitle style={styles.title}>{strings.daySummaryTitle}</ScreenTitle>
      </Screen>
    );
  }

  return (
    <Screen header={<StatusStrip />} footer={<PrimaryButton label={strings.nextDay} onPress={beginNextDay} />}>
      <BackButton onPress={beginNextDay} />
      {openedTool ? <OpenedToolCard tool={openedTool} /> : null}
      <ScreenTitle style={styles.title}>{strings.daySummaryTitle}</ScreenTitle>
      <ClosedDayReport summary={summary} mode="advance" insights={insights} pet={profile} />
      <EarnedAchievements dayN={summary.n} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: type.title,
    fontWeight: "700",
  },
});
