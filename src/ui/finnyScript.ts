import type { PlayTab } from "./navigation/playChrome";

/** Acquaintance script. Screen titles, Finny’s lines, and buttons stay verbatim. */

export const finnyScript = {
  petTitle: "Настрой своего питомца",
  petLine: "Сначала давай познакомимся поближе. Выбери, как будет выглядеть твой питомец.",
  nameTitle: "Придумай имя своему питомцу",
  nameLine: "Он будет проходить финансовое путешествие вместе с тобой.",
  nameSays: "Меня зовут",
  budgetTitle: "Твой первый бюджет",
  budgetLine:
    "Вот твои первые монеты. Это твой стартовый бюджет. С ними ты начнёшь принимать первые финансовые решения.",
  budgetMore: "В дальнейшем ты сможешь получать новые монеты за задания и другие активности.",
  homeIntro: "Давай быстро разберёмся, что здесь находится.",
  wallet: "Здесь хранится информация о твоих монетах. Ты всегда можешь посмотреть, сколько денег у тебя сейчас есть.",
  map: "На карте находятся твои задания и следующие этапы игры. Выполняй их, чтобы двигаться дальше.",
  health: "Здесь ты можешь посмотреть голод питомца. Забота о нём - одна из обязательных частей твоих расходов.",
  happiness:
    "А здесь — его настроение. Некоторые покупки могут сделать питомца счастливее, но важно учитывать их стоимость.",
  goalBlock:
    "Здесь будет показана твоя текущая финансовая цель. Это покупка, на которую ты постепенно будешь копить деньги.",
  pickTitle: "Выбери финансовую цель",
  pickLine: "Теперь выбери вещь, которую ты хочешь получить. Это будет твоя первая финансовая цель.",
  pickedLine:
    "Отличный выбор! Теперь у тебя есть цель. Чтобы её достичь, нужно научиться правильно распоряжаться монетами.",
  pickedGoal: (name: string) => `Твоя цель: ${name}`,
  pickedCost: (coins: number) => `Стоимость: ${coins} монет`,
  learnTitle: "А теперь давай узнаем, как проходит обучение",
  learnLine:
    "В “Питомце Финни” ты не просто выполняешь задания и тратишь монеты. По ходу игры ты будешь учиться принимать финансовые решения.",
  learnButton: "Узнать больше",
  programLessons: "Образовательная программа состоит из небольших уроков и игровых заданий.",
  programTry: "Сначала ты узнаёшь новое, а потом сразу пробуешь применить свои знания в игре.",
  periodSplit: "Игра разделена на игровые периоды.",
  periodThree: "Один игровой период соответствует одной миссии.",
  periodDone: "Пройдёшь миссию — перейдёшь к следующему игровому дню.",
  afterDone: "После прохождения образовательной части и мини-игры миссия считается выполненной.",
  afterReward: "За прохождение миссии ты можешь получить награду и продолжить свой игровой путь.",
  afterAll: "",
  forgetOk: "Если что-то забудешь — ничего страшного.",
  forgetApply: "Главное — не просто запоминать правила, а пробовать применять их во время игры.",
  forgetGames: "Мини-игры помогут тебе потренироваться и увидеть, к чему приводят разные решения.",
} as const;

export type TourSpotlight = "wallet" | "map" | "health" | "happiness" | "goal";

/** Live-screen rect of the control a tour step is ringing, in shell coordinates. */
export type SpotlightBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corner radius of the control, so the ring matches a circle or a card. */
  radius?: number;
};

export type TourStep = {
  id: string;
  title?: string;
  lines: readonly string[];
  button: string;
  spotlight?: TourSpotlight;
  /** Where the coach card sits so the highlighted control stays in view. */
  dock?: "top" | "bottom";
  tab?: PlayTab;
  /** Light dim so the map pins stay readable. */
  map?: boolean;
  pickGoal?: boolean;
  confirmGoal?: boolean;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "budget",
    title: finnyScript.budgetTitle,
    lines: [finnyScript.budgetLine, finnyScript.budgetMore],
    button: "Дальше",
    spotlight: "wallet",
    dock: "bottom",
    tab: "home",
  },
  { id: "home", lines: [finnyScript.homeIntro], button: "Дальше", dock: "bottom", tab: "home" },
  {
    id: "wallet",
    lines: [finnyScript.wallet],
    button: "Дальше",
    spotlight: "wallet",
    dock: "bottom",
    tab: "home",
  },
  { id: "map", lines: [finnyScript.map], button: "Дальше", spotlight: "map", dock: "top", tab: "home" },
  {
    id: "health",
    lines: [finnyScript.health],
    button: "Дальше",
    spotlight: "health",
    dock: "bottom",
    tab: "home",
  },
  {
    id: "happiness",
    lines: [finnyScript.happiness],
    button: "Дальше",
    spotlight: "happiness",
    dock: "bottom",
    tab: "home",
  },
  {
    id: "goal",
    lines: [finnyScript.goalBlock],
    button: "Дальше",
    spotlight: "goal",
    dock: "top",
    tab: "home",
  },
  {
    id: "pick",
    title: finnyScript.pickTitle,
    lines: [finnyScript.pickLine],
    button: "Дальше",
    dock: "bottom",
    tab: "home",
    pickGoal: true,
  },
  {
    id: "picked",
    lines: [finnyScript.pickedLine],
    button: "Дальше",
    dock: "bottom",
    tab: "home",
    confirmGoal: true,
  },
  {
    id: "learn",
    title: finnyScript.learnTitle,
    lines: [finnyScript.learnLine],
    button: finnyScript.learnButton,
    dock: "bottom",
    tab: "home",
  },
  {
    id: "program",
    lines: [finnyScript.programLessons, finnyScript.programTry],
    button: "Понятно",
    dock: "bottom",
    tab: "home",
  },
  {
    id: "period",
    lines: [finnyScript.periodSplit, finnyScript.periodThree, finnyScript.periodDone],
    button: "Понятно",
    dock: "bottom",
    tab: "map",
    map: true,
  },
  {
    id: "after",
    lines: [finnyScript.afterDone, finnyScript.afterReward, finnyScript.afterAll],
    button: "Дальше",
    dock: "bottom",
    tab: "map",
    map: true,
  },
  {
    id: "remember",
    lines: [finnyScript.forgetOk, finnyScript.forgetApply, finnyScript.forgetGames],
    button: "Понятно",
    dock: "bottom",
    tab: "map",
    map: true,
  },
];

export function tourStep(id: string | null): TourStep | null {
  if (!id) return null;
  return TOUR_STEPS.find((step) => step.id === id) ?? null;
}

export function nextTourStep(id: string): string | null {
  const index = TOUR_STEPS.findIndex((step) => step.id === id);
  if (index < 0) return null;
  return TOUR_STEPS[index + 1]?.id ?? null;
}
