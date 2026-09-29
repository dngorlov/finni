/**
 * RU strings of the Деньги screens (Копилка, План, Журнал, Банк) in their
 * bank-app look. Kept apart from strings.ts so the sections can grow on their own.
 */
function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

function coinsWord(n: number): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return "монета";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "монеты";
  return "монет";
}

function timesWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "раза";
  return "раз";
}

export type ShareLine = { label: string; amount: number; percent: number };

function shareList(parts: readonly ShareLine[]): string {
  // Coins only: percents are not taught to 7–11 year olds (Т/З 8.3, age-appropriate maths).
  return parts.map((part) => `${part.label} ${part.amount} ${coinsWord(part.amount)}`).join("; ");
}

export const moneyStrings = {
  sections: "Разделы денег",

  // Shared bits
  day: (n: number) => (n <= 0 ? "Старт" : `День ${n}`),
  signed: (n: number) => (n > 0 ? `+${n}` : `${n}`),
  coins: (n: number) => `${n} монет`,
  legendRow: (label: string, amount: number) => `${label}: ${amount} ${coinsWord(amount)}`,

  // Копилка
  savingsCaption: "Копилка",
  savingsGoalCaption: "Цель",
  savingsNoGoal: "Цели пока нет",
  savingsForecast: "Накопишь",
  savingsGoalProgress: (have: number, cost: number) => `Цель: собрано ${have} из ${cost}`,
  actionGoal: "Цель",
  statTotal: "Отложено всего",
  statCount: "Взносов",
  statAverage: "В среднем за раз",
  statCountA11y: (n: number) => `Взносов: ${n} ${timesWord(n)}`,
  statA11y: (label: string, n: number) => `${label}: ${n} монет`,
  savingsHistory: "Операции Копилки",
  savingsHistoryEmpty: "Пока пусто. Положи первые монеты!",
  opIn: "Пополнение",
  opOut: "Снятие",
  opGoal: (name: string) => `Покупка: ${name}`,
  opRowA11y: (title: string, day: string, amount: number) => `${title}, ${day}, ${amount > 0 ? "+" : ""}${amount} монет`,

  // План
  planStepMandatory: "Сначала то, без чего не обойтись.",
  planStepSavings: "Сколько отложить в Копилку.",
  planJobOptional: "Что хочется купить.",
  /** Step 1 requirement: today's Счета minimum for Обязательные. */
  planNeedMin: (n: number) => `Нужно минимум ${n} на обязательное: еда и витамины`,
  planNeedMore: (n: number) => `Добавь ещё ${n} — на счета`,
  planFreeNow: (n: number) => `Свободно: ${n}`,
  planNext: "Далее",
  planBack: "Назад",
  planStepOf: (step: number, total: number, label: string) => `Шаг ${step} из ${total}: ${label}`,
  planStepGo: (step: number, label: string) => `Вернуться к шагу ${step}: ${label}`,
  planEdit: "Изменить план",
  planEditDone: "Готово",
  planFactA11y: (label: string, plan: number, actual: number) => `${label}: план ${plan} · потрачено ${actual}`,
  planLocked: "Обещание на сегодня. Менять уже нельзя.",
  planRevise: "Пока не было покупок, план можно изменить.",
  planYesterday: (n: number) => `Вчера: ${n}`,
  planCompareMore: (d: number) => `сегодня на ${d} больше`,
  planCompareLess: (d: number) => `сегодня на ${d} меньше`,
  planCompareSame: "сегодня столько же",

  // Журнал
  periodToday: "Сегодня",
  periodYesterday: "Вчера",
  periodThree: "3 дня",
  periodAll: "Всё время",
  periodMenu: (label: string) => `${label}, другие дни`,
  flowSpend: "Траты",
  flowIncome: "Доходы",
  catMandatory: "Необходимое",
  catOptional: "Желаемое",
  catGoal: "Цель",
  catSavings: "Копилка",
  catBank: "Банк",
  catOther: "Другое",
  incTasks: "Задания",
  incStart: "Стартовый бюджет",
  incBank: "Банк",
  incFromSavings: "Из Копилки",
  tileIn: "Пришло",
  tileOut: "Ушло",
  tileNet: "Итого",
  journalChartA11y: (flow: string, period: string, parts: readonly ShareLine[]) =>
    parts.length === 0 ? `${flow}, ${period}: ничего` : `${flow}, ${period}: ${shareList(parts)}`,
  journalChartEmpty: "Здесь пока пусто",
  journalOps: "Операции",
  journalEmpty: "За эти дни операций нет.",
  journalFromSavings: "из Копилки",
  journalRowA11y: (title: string, amountText: string) => `${title} ${amountText}`,
  journalDayTotal: (n: number) => (n > 0 ? `+${n}` : `${n}`),

  // Банк
  bankOffers: "Вклады",
  bankRate: (rate: number) => `+${rate}%`,
  bankTerm: (days: number) => `${days} ${daysWord(days)}`,
  bankExample: (amount: number, payout: number) => `${amount} → ${payout}`,
  bankNew: "Новый вклад",
  bankProgressA11y: (passed: number, days: number) => `Прошло ${passed} из ${days} ${daysWord(days)}`,
  bankActiveTotal: (n: number) => `В банке ${n}`,
  bankActiveCaption: "Во вкладах",
};
