import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type PlayTab = "home" | "map" | "money";
export type MoneySection = "savings" | "plan" | "journal" | "bank";

/** Where a tap on Текущая задача should land, and which control to mark. */
export type TaskFocus =
  | null
  | { kind: "shop-bills" }
  | { kind: "lesson"; taskId: string }
  | { kind: "goal" }
  | { kind: "buy-goal" }
  | { kind: "plan" }
  | { kind: "withdraw" };

type PlayChromeValue = {
  tab: PlayTab;
  setTab: (tab: PlayTab) => void;
  money: MoneySection;
  setMoney: (section: MoneySection) => void;
  focus: TaskFocus;
  setFocus: (focus: TaskFocus) => void;
  /** Home asked Копилка to open the Цель picker. SavingsScreen consumes it. */
  goalPrompt: boolean;
  setGoalPrompt: (open: boolean) => void;
  /** Bumped after a money action so the shell's status strip re-reads the profile. */
  revision: number;
  touchChrome: () => void;
};

const PlayChromeContext = createContext<PlayChromeValue | null>(null);

/** Tab and Деньги choice for this visit. A fresh launch mounts a new provider. */
export function PlayChromeProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<PlayTab>("home");
  const [money, setMoney] = useState<MoneySection>("savings");
  const [focus, setFocus] = useState<TaskFocus>(null);
  const [goalPrompt, setGoalPrompt] = useState(false);
  const [revision, setRevision] = useState(0);
  const touchChrome = useCallback(() => setRevision((n) => n + 1), []);
  const value = useMemo(
    () => ({ tab, setTab, money, setMoney, focus, setFocus, goalPrompt, setGoalPrompt, revision, touchChrome }),
    [tab, money, focus, goalPrompt, revision, touchChrome],
  );
  return <PlayChromeContext.Provider value={value}>{children}</PlayChromeContext.Provider>;
}

export function usePlayChrome(): PlayChromeValue {
  const value = useContext(PlayChromeContext);
  if (!value) throw new Error("PlayChrome missing");
  return value;
}
