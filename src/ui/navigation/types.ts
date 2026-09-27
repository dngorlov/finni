export type StubDestination = "plan" | "shop" | "savings";

export type RootStackParamList = {
  FirstRun: undefined;
  Main: undefined;
  Shop: undefined;
  Results: undefined;
  Handbook: undefined;
  Settings: undefined;
  /** Full Достижения catalog, opened from Настройки. */
  Achievements: undefined;
  /** Об авторах и источниках, opened from Настройки. */
  Credits: undefined;
  /** Внешний вид: Вид, Окрас, and the Аксессуары this Этап opened. */
  Appearance: undefined;
  /** Set when the lesson that just ended the day opened a money tool. */
  DaySummary: { openedTool?: "savings" | "plan" | "bank" } | undefined;
  AdultGate: undefined;
  Demo: undefined;
  TaskRun: { taskId: string };
  TaskResult: {
    taskId: string;
    reward: number;
    earned: number;
    points: number;
    sceneCoins: number;
    /** First completion of a pinned Урок: the result leads to Итоги дня. */
    dayEnded: boolean;
  };
  Stub: { destination: StubDestination };
};
