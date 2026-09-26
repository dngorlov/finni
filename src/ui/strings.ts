/**
 * Single home for RU user-facing strings (ROADMAP §3). Vocabulary must match
 * CONTEXT.md; body text stays ≥16 sp per the UX constraints.
 */
const SPECIES_NAMES: Record<string, string> = {
  sp1: "Вид 1",
  sp2: "Вид 2",
  sp3: "Вид 3",
};

const COLOR_NAMES: Record<string, string> = {
  c1: "Окрас 1",
  c2: "Окрас 2",
  c3: "Окрас 3",
};

const ACCESSORY_NAMES: Record<string, string> = {
  a1: "Аксессуар 1",
  a2: "Аксессуар 2",
  a3: "Аксессуар 3",
};

const POSE_NAMES = {
  idle: "спокойный",
  happy: "весёлый",
  sad: "грустный",
} as const;

export const strings = {
  appName: "Финни",
  versionLine: (version: string, build: number) => `версия ${version} (${build})`,

  next: "Дальше",
  play: "Играть!",
  playTask: "Играть",
  gotIt: "Понятно",
  done: "Готово",
  close: "Закрыть",
  sheetClose: "Закрыть окно",
  back: "Назад",
  backIcon: "←",
  settings: "Настройки",
  settingsIcon: "⚙",
  soundTitle: "Звук",
  soundHint: "Так звучат верный ответ, ошибка и конец задания.",
  soundVolume: "Громкость",
  soundQuieter: "Тише",
  soundLouder: "Громче",
  soundLevel: (n: number) => {
    if (n <= 0) return "Выключен";
    const word = n <= 40 ? "Тихо" : n <= 70 ? "Средне" : "Громко";
    return `${word} ${n}%`;
  },
  deleteProfile: "Удалить профиль",
  devSection: "Dev",
  finishDay: "Закончить день",
  composePlanHint: "Составь план дня",
  planReady: "План готов",
  finishDayNeedPlan: "Сначала составь план дня",
  daySummaryTitle: "Итоги дня",
  daySummarySpent: "Потрачено",
  daySummaryPlanned: "В плане",
  daySummaryPlan: "План и факт",
  daySummaryChart: (parts: readonly { label: string; n: number }[]) =>
    `Факт дня: ${parts.map((part) => `${part.label} ${part.n}`).join(", ")}`,
  dayAdvance: (from: number, to: number) => `День ${from} → День ${to}`,
  waitTomorrow: "Ждём завтра!",
  nextDay: "Следующий день",
  waitingBanner: "Новый день откроется завтра",
  waitingEconomyHint: "Откроется завтра",
  waitingLockIcon: "⏳",
  scoreMandatory: "Обязательные",
  scoreWithinPlan: "По плану",
  scoreDeposit: "Копилка",
  scoreYesIcon: "✅",
  scoreNoIcon: "⚠️",
  scoreFact: (word: string, points: number) => `${word} ${points > 0 ? `+${points}` : "+0"}`,
  nextDayPlanNeeds: "Завтра сначала запланируй необходимое.",

  feedbackBalance: (n: number) => `Баланс ${n > 0 ? "+" : ""}${n}`,
  feedbackSavings: (n: number) => `Копилка ${n > 0 ? "+" : ""}${n}`,
  feedbackCare: (n: number) => `Сытость ${n > 0 ? "+" : ""}${n}`,
  feedbackMood: (n: number) => `Счастье ${n > 0 ? "+" : ""}${n}`,
  feedbackCausePurchase: "Потому что ты купил вещь для питомца.",
  feedbackNextPurchase: "Что дальше: сверься с планом или отложи в копилку.",
  feedbackCauseSavingsIn: "Потому что ты положил монеты в копилку.",
  feedbackNextSavingsIn: "Что дальше: копи дальше или вернись к плану дня.",
  feedbackCauseSavingsOut: "Потому что ты забрал монеты из копилки.",
  feedbackNextSavingsOut: "Что дальше: подумай, нужна ли трата сегодня.",
  feedbackCauseGoal: "Потому что копилка дошла до цели.",
  feedbackNextGoal: "Что дальше: выбери новую цель, если хочешь копить снова.",
  feedbackCauseTaskScene: "Потому что в задании нашлись монеты.",
  feedbackNextTaskScene: "Что дальше: проверь сдачу и иди дальше.",

  taskTopicBudget: "Бюджет",
  taskTopicSavings: "Копилки",
  taskTopicPayments: "Платежи",
  taskTopicBudgetIcon: "📋",
  taskTopicSavingsIcon: "🐷",
  taskTopicPaymentsIcon: "🪙",
  mapTitle: "Карта заданий",
  mapHint: "Нажми на точку, чтобы узнать о задании.",
  missionStart: "Начать",
  missionReplay: "Пройти ещё раз",
  missionDistrict: (district: string) => `Район: ${district}`,
  missionDifficultyLabel: "Сложность:",
  missionDifficulty: (n: number) => `Сложность: ${n} из 3`,
  missionRewardMax: (max: number) => `Награда: до ${max} монет`,
  missionRewardBest: (best: number, max: number) => `Лучший результат: ${best} из ${max} монет`,
  missionRewardLeft: (left: number) =>
    left > 0 ? `За лучший ответ можно получить ещё ${left}` : "Ты собрал все монеты за это задание",
  missionLockedAfter: (title: string) => `Откроется после «${title}»`,
  missionPinA11y: (title: string, state: "locked" | "open" | "done" | "soon") =>
    `${title}, ${state === "locked" ? "закрыто" : state === "done" ? "пройдено" : state === "soon" ? "скоро" : "открыто"}`,
  missionSoon: "Урок скоро появится.",
  missionGames: "Мини-игры",
  missionGamesLead: "Каждая игра относится к уроку и открывается, когда этот урок пройден.",
  missionGameLesson: (title: string) => `Урок: ${title}`,
  missionPlayGame: (title: string) => `Играть: ${title}`,
  missionCorrections: "Исправить ошибку",
  taskCardNext: "Дальше",
  taskSortPrompt: "Куда это отнести?",
  taskSortProgress: (n: number, total: number) => `${n} из ${total}`,
  taskScore: (points: string, total: number) => `Верно с первого раза: ${points} из ${total}`,
  taskEarned: (n: number) => `+${n} ${coinsWord(n)}`,
  taskNoTopUp: "Новых монет нет — это не лучше прошлого результата.",
  taskBalanceWas: "Было",
  taskResultRun: "Результат",
  taskResultRecord: "Лучший",
  taskResultMore: "Ещё можно",
  taskResultCollected: "Собрано",
  taskResultStat: (label: string, n: number) => `${label}: ${n} монет`,
  taskBackToMap: "На карту",
  toolOpenedKicker: "Открылось",
  toolOpened: {
    savings: {
      name: "Копилка",
      glyph: "🐷",
      where: "В «Деньгах» можно копить на цель.",
      spoken: "Открылось: Копилка. В «Деньгах» можно копить на цель.",
    },
    plan: {
      name: "План",
      glyph: "📋",
      where: "В «Деньгах» можно разделить монеты на сегодня.",
      spoken: "Открылось: План. В «Деньгах» можно разделить монеты на сегодня.",
    },
    bank: {
      name: "Банк",
      glyph: "🏦",
      where: "В «Деньгах» можно открыть вклад.",
      spoken: "Открылось: Банк. В «Деньгах» можно открыть вклад.",
    },
  },
  taskSpawned: "Новое задание появилось в списке!",
  verdictLabel: (verdict: "good" | "warn" | "bad") => {
    if (verdict === "good") return "Верно";
    if (verdict === "warn") return "Есть цена";
    return "Попробуй ещё";
  },
  verdictGlyph: (verdict: "good" | "warn" | "bad") => {
    if (verdict === "good") return "✅";
    if (verdict === "warn") return "🤔";
    return "⚠️";
  },

  shopMandatoryTab: "Необходимое",
  shopOptionalTab: "Желаемое",
  shopPrice: (n: number) => `${n} монет`,
  shopAfterBuy: (n: number) => `после покупки: ${n} монет`,
  shopMeterDelta: (n: number) => `+${n}`,
  shopMeterA11y: (meter: string, delta: number) => `${meter} +${delta}`,
  shopGoalChip: "Цель",
  shopOnceChip: "Один раз",
  shopShortfall: (n: number) => `Не хватает ${n}`,
  shopBought: "Куплено",
  shopBuy: "Купить",
  shopPostpone: "Отложить",
  shopMakeGoal: "Сделать целью",
  shopBuyFromSavings: "Купить из копилки",
  shopOnceLabel: "Можно купить один раз",
  shopConfirmBuy: (name: string, price: number) => `Купить ${name} за ${price}?`,
  shopConfirmReplaceGoal: (name: string, pot: number) => `Цель станет ${name}. В копилке останется ${pot}.`,
  shopBuyActiveGoalWarn: (pot: number) => `Это твоя Цель. После покупки Цель снимется, в копилке останется ${pot}.`,
  shopBlockedAlreadyGoal: "Это уже твоя Цель. Копи дальше в Копилке.",
  shopDoTask: "Выполнить задание",

  goalPickerTitle: "Выбери цель",
  customGoal: "Своя цель",
  customGoalName: "Название цели",
  customGoalNameHint: "Например, мяч",
  customGoalPrice: "Цена",
  goalIcon: (emoji: string) => `Значок ${emoji}`,
  goalIconPick: (emoji: string) => `Выбрать значок ${emoji}`,
  stageThreshold: (credit: number, floor: number) => `До следующего этапа: ${credit} из ${floor}`,
  cheapGoalHeld: "Одна такая цель не открывает следующий этап. Купи ещё, чтобы набрать сумму.",
  goalDrop: "Без цели",
  goalEmptyPrompt: "Выбери цель",
  currentTaskCaption: "Текущая задача",
  currentTaskSetGoal: "Текущая задача: выбрать цель",
  currentTaskBuyGoal: (name: string) => `Текущая задача: купить «${name}»`,
  currentTaskPlan: "Текущая задача: спланировать день",
  currentTaskShop: "Текущая задача: купить нужное в Магазине",
  currentTaskLesson: (title: string) => `Текущая задача: урок «${title}»`,
  pickNewGoal: "Выбрать новую цель",

  savingsPot: (n: number) => `В копилке ${n}`,
  savingsEstimateNone: "—",
  savingsEstimate: (n: number) => `примерно ${n} дн.`,
  savingsDeposit: "Положить",
  savingsWithdraw: "Забрать",
  savingsDepositAmount: "Сумма",
  savingsConfirmDeposit: (n: number) => `Положить ${n}?`,
  savingsConfirmWithdraw: (n: number) => `Забрать ${n}?`,
  savingsWithdrawPreview: (potAfter: number, days: number) =>
    `В копилке станет ${potAfter} ${coinsWord(potAfter)}. Мечта отодвинется на ${days} дн.`,
  savingsWithdrawPreviewNone: (potAfter: number) => `В копилке станет ${potAfter}.`,
  savingsAchieved: "Мечта сбылась!",
  savingsConfetti: "🎉",
  savingsPickGoal: "Выбери цель",
  savingsChooseGoal: "Выбери цель",
  savingsChooseNewGoal: "Выбрать новую цель",
  savingsBuyFromSavings: "Купить из копилки",
  savingsLater: "Позже",
  savingsConfirmReplace: (name: string, pot: number) => `Цель станет ${name}. В копилке останется ${pot}.`,
  savingsAchievedBadge: "сбылась",
  savingsRemaining: (n: number) => `осталось ${n}`,

  tabResults: "Итоги",
  tabJournal: "Журнал",
  tabGlossary: "Словарик",
  resultsEmpty: "Итоги появятся после первого закрытого игрового дня.",
  resultsLastDay: (n: number) => `Игровой день ${n}`,
  resultsScore: (n: number) => `Итог ${n}`,
  resultsOverall: "Всего",
  resultsDaysPlayed: (n: number) => `Игровых дней: ${n}`,
  resultsTasksDone: (done: number, total: number) => `Задания ${done}/${total}`,
  resultsGoalsAchieved: (n: number) => `Целей: ${n}`,
  resultsScoreMandatory: (earned: boolean) => (earned ? "Обязательные +2" : "Обязательные 0"),
  resultsScoreWithinPlan: (earned: boolean) => (earned ? "По плану +1" : "По плану 0"),
  scoreDeposited: (earned: boolean) => (earned ? "Копилка +1" : "Копилка 0"),
  /** «Каждый день: Сытость -15» — the drop always lands. A purchase offsets it separately. */
  meterDailyApplied: (meter: string, n: number) => `Каждый день: ${meter} ${n}`,
  meterReasonOverspend: (n: number) => `Счастье ${n}: желаемое сверх плана.`,
  meterReasonNoPlan: (n: number) => `Счастье ${n}: плана на день не было.`,
  journalStart: "Старт",
  journalDay: (n: number) => `День ${n}`,
  journalStartingGrant: "Стартовый бюджет",
  journalDailyReward: "Ежедневный подарок",
  journalAllowance: "Пособие",
  journalPurchase: (name: string) => `Покупка: ${name}`,
  journalSavingsIn: "Перевод в копилку",
  journalSavingsOut: "Из копилки",
  journalBankIn: "Вклад в банк",
  journalBankOut: "Вклад вернулся",
  journalTaskReward: (title: string) => `Задание: ${title}`,
  journalTaskScene: "Задание",
  journalAmount: (n: number) => `${n > 0 ? "+" : ""}${n}`,

  planAvailable: (n: number) => `Можно распределить: ${n}`,
  planIncomeToday: (n: number) => `Сегодня пришло: +${n}`,
  planBillsTitle: "Счета на сегодня",
  planBillsLine: (parts: readonly { name: string; price: number }[], total: number) =>
    `${parts.map((part) => `${part.name} ${part.price}`).join(" · ")} = ${total}`,
  planBillsFloor: (n: number) => `Обязательных не меньше ${n} — это счета.`,
  planBillsShort: (missing: number) => `На все счета не хватает ${missing}. Сделай Задание — за него дают монеты.`,
  planGoalForecast: (goal: string, days: number) =>
    `${goal}: накопишь через ${days} ${daysWord(days)}, если откладывать столько каждый день.`,
  planGoalNoSavings: (goal: string) => `Если ничего не отложить, ${goal} не станет ближе.`,
  planWantsHint: (names: readonly string[]) =>
    names.length > 0 ? `Хватит на: ${names.join(", ")}` : "Пока ни на что из желаемого не хватит.",
  planRemainder: (n: number) => `Останется свободных: ${n}`,
  planOverBudget: "В плане больше монет, чем есть. Убавь суммы.",
  planPromise: "Это обещание на сегодня. Монеты пока в Балансе.",
  planSavingsExtra: "Положишь их отдельно — в Копилке.",
  confirmPlan: "Подтвердить план",
  confirmPlanTitle: "Подтвердить план дня?",
  confirmPlanBody:
    "Это обещание. Монеты останутся в Балансе, пока ты не купишь в Магазине или не положишь в Копилку. Потом план не меняется.",
  planYesterday: (n: number) => `вчера ${n}`,
  planLeftover: (n: number) => `В плане осталось ${n}`,
  planOvershoot: (n: number) => `сверх плана ${n}`,
  planLeftoverA11y: (label: string, leftover: number) =>
    leftover >= 0 ? `${label}: в плане осталось ${leftover}` : `${label}: сверх плана ${Math.abs(leftover)}`,
  planAfterTap: (n: number) => `в плане останется ${n}`,
  planOverWarn: "Это сверх плана.",
  planColPlan: "план",
  planColActual: "потрачено",
  bucketMandatory: "Обязательные",
  bucketOptional: "Желаемые",
  bucketSavings: "Копилка",
  bucketMinus: (label: string) => `${label}, меньше`,
  bucketPlus: (label: string) => `${label}, больше`,
  bucketValue: (label: string, n: number) => `${label} ${n}`,
  planVsActual: (plan: number, actual: number) => `план ${plan} · потрачено ${actual}`,

  firstRunPet: "Питомец",
  namePrompt: "Меня зовут",
  nameBlank: "____",
  namePen: "✏️",
  nameValidation: "Введи от 1 до 20 символов",
  firstRunSaveFailed: "Не получилось начать игру. Попробуй ещё раз.",
  speciesLegend: "Вид",
  speciesPictogram: "🐣",
  colorLegend: "Окрас",
  colorPictogram: "🎨",
  accessoryLegend: "Аксессуар",
  accessoryPictogram: "🎀",
  speciesName: (key: string) => SPECIES_NAMES[key] ?? key,
  colorName: (key: string) => COLOR_NAMES[key] ?? key,
  accessoryName: (key: string) => ACCESSORY_NAMES[key] ?? key,

  care: "Сытость",
  careIcon: "🍗",
  mood: "Счастье",
  moodIcon: "☺",
  needsMissedIcon: "!",
  meterLine: (label: string, value: number) => `${label} ${value}`,
  balanceWord: "Баланс",
  savingsWord: "Копилка",
  stageWord: "Этап",
  stagePlace: (current: number, total: number) => `${current} из ${total}`,
  stageA11y: (name: string, current: number, total: number, progress: string) =>
    progress.length > 0 ? `Этап ${current} из ${total}, ${name}. ${progress}` : `Этап ${current} из ${total}, ${name}`,
  balanceBadge: (n: number) => `Баланс ${n}`,
  savingsBadge: (n: number) => `Копилка ${n}`,
  goalRatio: (have: number, cost: number) => `${have} / ${cost}`,
  goalRemaining: (n: number) => `осталось ${n}`,
  selectedCheck: "✓",
  stageIcon: "⭐",
  starFilled: "★",
  starEmpty: "☆",
  balanceIcon: "🪙",
  savingsIcon: "🐷",
  navPlanPictogram: "📋",
  navShopPictogram: "🛒",
  navSavingsPictogram: "🐷",
  navTasksPictogram: "🎯",
  navProgressPictogram: "📚",
  navAdultPictogram: "👤",
  navBankPictogram: "🏦",
  poseIdle: POSE_NAMES.idle,
  poseHappy: POSE_NAMES.happy,
  poseSad: POSE_NAMES.sad,
  petA11y: (input: {
    petName?: string;
    species: string;
    color: string;
    accessory: string;
    pose: keyof typeof POSE_NAMES;
  }) => {
    const who = input.petName ? `Питомец ${input.petName}` : "Питомец";
    return `${who}, ${SPECIES_NAMES[input.species] ?? input.species}, ${COLOR_NAMES[input.color] ?? input.color}, ${ACCESSORY_NAMES[input.accessory] ?? input.accessory}, ${POSE_NAMES[input.pose]}`;
  },

  navPlan: "План",
  navShop: "Магазин",
  navSavings: "Копилка",
  navTasks: "Задания",
  navProgress: "Прогресс",
  navAdult: "Взрослый раздел",
  navBank: "Банк",
  tabHome: "Дом",
  tabMap: "Карта",
  tabMoney: "Деньги",
  moneyMenu: "Раздел денег",
  moneyChevronClosed: "▼",
  moneyChevronOpen: "▲",
  tabWords: "Слова",
  tabLessons: "Уроки",
  bankTitle: "Банк",
  bankIntro: "Вклад: кладёшь монеты на срок, а банк возвращает их с процентами. Забрать раньше нельзя.",
  bankOfferLabel: (days: number, rate: number) => `${days} ${daysWord(days)} · +${rate}%`,
  bankAmount: "Сумма",
  bankPreview: (amount: number, payout: number, days: number) =>
    `Положишь ${amount} — через ${days} ${daysWord(days)} вернётся ${payout}.`,
  bankMin: (min: number) => `Вклад — от ${min} монет.`,
  bankOpen: "Открыть вклад",
  bankConfirmTitle: "Открыть вклад?",
  bankConfirmBody: (amount: number, day: number) =>
    `${amount} монет уйдут из Баланса и вернутся с процентами в Игровой день ${day}. Раньше забрать нельзя.`,
  bankOpened: "Вклад открыт",
  bankActive: "Мои вклады",
  bankEmpty: "Пока вкладов нет.",
  bankDepositLine: (amount: number, rate: number, payout: number) => `${amount} монет · +${rate}% → ${payout}`,
  bankDaysLeft: (n: number) => (n <= 0 ? "Вернётся сегодня" : `Вернётся через ${n} ${daysWord(n)}`),
  bankPaid: "Вернулся",
  bankLocked: "Банк откроется после урока «Где живут накопления?».",
  feedbackCauseBankIn: "Потому что ты открыл вклад в банке.",
  feedbackNextBankIn: "Что дальше: монеты вернутся с процентами в конце срока.",
  feedbackBankReturned: (paid: number, interest: number) => `Вклад вернулся: +${paid} (из них ${interest} — проценты).`,
  adultGatePrompt: (a: number, b: number) => `Сколько будет ${a} × ${b}?`,
  adultGateAnswer: "Ответ",
  adultGateEnter: "Войти",

  demoMode: "Демо-режим",
  demoName: "Демо",
  demoConfirmBody: "Демо создаёт отдельный тестовый профиль",
  demoResetConfirmBody: "Демо вернётся к первому игровому дню",
  demoReset: "Сбросить демо",
  adultDaysEmpty: "Игровых дней пока нет — это нормально.",
  adultAnswersEmpty: "Верных ответов пока нет — это нормально.",
  adultAnswersLine: (percent: number, correct: number, scored: number) =>
    `Верных ответов: ${percent}%, ${correct} из ${scored}`,
  adultLessonsEmpty: "Уроков по календарю пока нет — это нормально.",
  adultLessonsLine: (lessons: number, days: number) => `Уроки по календарю: ${lessons} за ${days} ${daysWord(days)}`,
  adultLastLesson: (when: string) => `Последний урок: ${when}`,
  adultLastLessonWhen: (daysAgo: number) => {
    if (daysAgo <= 0) return "сегодня";
    if (daysAgo === 1) return "вчера";
    return `${daysAgo} ${daysWord(daysAgo)} назад`;
  },
  adultTopicLine: (topic: string, done: number, total: number) => {
    if (done === 0) return `${topic}: ещё впереди`;
    if (done >= total) return `${topic}: все задания сделаны`;
    return `${topic}: сделано ${done} из ${total}`;
  },
  resetProgress: "Сбросить прогресс",
  resetProgressBody: "Прогресс сбросится, имена и вид питомца останутся.",
  resetProgressTypedLabel: "Введи: сбросить",
  resetProgressWord: "сбросить",
  deleteProfileBody: "Питомец и все игровые дни пропадут с устройства.",
  deleteProfileTypedLabel: "Введи: удалить",
  deleteProfileWord: "удалить",

  glossaryTitle: "Словарик",
  stubPlan: "Скоро: план дня. Пока вернись на главный экран.",
  stubShop: "Скоро: магазин. Пока вернись на главный экран.",
  stubSavings: "Скоро: копилка. Пока вернись на главный экран.",
  stubTasks: "Скоро: задания. Пока вернись на главный экран.",
  stubAdult: "Скоро: взрослый раздел. Пока вернись на главный экран.",
} as const;

/** «1 день / 3 дня / 5 дней». */
function daysWord(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

/** Итоги lines for a closed day. The daily drop always lands; a purchase does not cancel it. */
export function dayCloseLines(deltas: {
  care: number;
  dailyMood: number;
  overspend: number;
  noPlan: number;
}): string[] {
  const lines = [
    strings.meterDailyApplied(strings.care, deltas.care),
    strings.meterDailyApplied(strings.mood, deltas.dailyMood),
  ];
  if (deltas.overspend < 0) lines.push(strings.meterReasonOverspend(deltas.overspend));
  if (deltas.noPlan < 0) lines.push(strings.meterReasonNoPlan(deltas.noPlan));
  return lines;
}

/** «1 монета / 3 монеты / 5 монет». */
function coinsWord(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return "монет";
  if (mod10 === 1) return "монета";
  if (mod10 >= 2 && mod10 <= 4) return "монеты";
  return "монет";
}
