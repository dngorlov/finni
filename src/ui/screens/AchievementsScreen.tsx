import { BackButton } from "../components/BackButton";
import { AchievementCatalog } from "../components/AchievementBoard";
import { Screen } from "../components/Screen";

/** Достижения, opened from the Настройки row. */
export default function AchievementsScreen() {
  return (
    <Screen>
      <BackButton />
      <AchievementCatalog />
    </Screen>
  );
}
