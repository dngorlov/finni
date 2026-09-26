import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { META_KEYS } from "../../data/metaKeys";
import DaySummaryScreen from "../screens/DaySummaryScreen";
import FirstRunScreen from "../screens/FirstRunScreen";
import HandbookScreen from "../screens/HandbookScreen";
import MainScreen from "../screens/MainScreen";
import ResultsScreen from "../screens/ResultsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ShopScreen from "../screens/ShopScreen";
import AdultGateScreen from "../screens/AdultGateScreen";
import AppearanceScreen from "../screens/AppearanceScreen";
import DemoScreen from "../screens/DemoScreen";
import StubScreen from "../screens/StubScreen";
import TaskResultScreen from "../screens/TaskResultScreen";
import TaskRunScreen from "../screens/TaskRunScreen";
import { useSession } from "../session/SessionProvider";
import { AchievementHost } from "../components/AchievementBoard";
import { BuyGoalPrompt } from "../components/BuyGoalPrompt";
import { PlayChromeProvider } from "./playChrome";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function closedDayWaiting(profileId: string | null, game: ReturnType<typeof useSession>["game"]): boolean {
  if (!profileId) return false;
  try {
    return !game.dayState(profileId).open;
  } catch {
    return false;
  }
}

export function RootNavigator() {
  const { meta, game } = useSession();
  const profileId = meta.get(META_KEYS.activeProfileId);
  const initialRouteName = !profileId ? "FirstRun" : closedDayWaiting(profileId, game) ? "DaySummary" : "Main";

  return (
    <PlayChromeProvider>
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FirstRun" component={FirstRunScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Handbook" component={HandbookScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Appearance" component={AppearanceScreen} />
        <Stack.Screen name="DaySummary" component={DaySummaryScreen} />
        <Stack.Screen name="AdultGate" component={AdultGateScreen} />
        <Stack.Screen name="Demo" component={DemoScreen} />
        <Stack.Screen name="TaskRun" component={TaskRunScreen} />
        <Stack.Screen name="TaskResult" component={TaskResultScreen} />
        <Stack.Screen name="Stub" component={StubScreen} />
      </Stack.Navigator>
      <BuyGoalPrompt />
      <AchievementHost />
    </PlayChromeProvider>
  );
}
