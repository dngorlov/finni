/**
 * «Как всё считается» (Настройки): every game rule in plain words. Numbers
 * come in as arguments, built from the code constants in `rules.ts`.
 */

/** «1 монета / 3 монеты / 5 монет». */
function coinsWord(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return "монет";
  if (mod10 === 1) return "монета";
  if (mod10 >= 2 && mod10 <= 4) return "монеты";
  return "монет";
}

/** «1 игровой день / 3 игровых дня / 5 игровых дней». */
function gameDaysWord(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return "игровых дней";
  if (mod10 === 1) return "игровой день";
  if (mod10 >= 2 && mod10 <= 4) return "игровых дня";
  return "игровых дней";
}

/** «1 день / 3 дня / 5 дней». */
function daysWord(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

const coins = (n: number) => `${n} ${coinsWord(n)}`;
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
/** «10–15», or one number when both ends match. */
const range = (min: number, max: number) => (min === max ? `${min}` : `${min}–${max}`);
/** ½ reads better than 0,5 for a child. */
const points = (n: number) => (n === 0.5 ? "½" : String(n).replace(".", ","));

export const rulesStrings = {
  open: "Как всё считается",
  title: "Как всё считается",
  intro: "Здесь все правила игры. Числа берутся прямо из игры, поэтому они всегда такие же, как на экранах.",

  coinsTitle: "1. Откуда монеты",
  startBudget: (n: number) => `Старт: ${coins(n)} один раз, когда появляется питомец.`,
  lessonReward: (min: number, max: number) =>
    `Награда за урок на карте — ${range(min, max)} монет, у каждого урока своя. Первое прохождение урока закрывает игровой день.`,
  lessonFormula: "Монеты за урок = награда × очки за первые ответы ÷ число вопросов",
  lessonPoints: (good: number, warn: number, bad: number) =>
    `Очки: верно — ${points(good)}, «с ценой» — ${points(warn)}, неверно — ${points(bad)}. Считается только первый ответ. Каждая фишка в сортировке — отдельный вопрос. Результат округляется и не бывает больше награды.`,
  lessonUnscored:
    "Учебные карточки и игры на расчёт («распредели», «сравни», «пересобери», «шаг за шагом», «финансовая мечта») в вопросы не входят. Если вопросов нет совсем, награда платится целиком.",
  lessonExample: (
    reward: number,
    questions: number,
    good: number,
    warn: number,
    bad: number,
    total: number,
    earned: number,
  ) =>
    `Пример: урок на ${coins(reward)}, ${questions} вопроса. С первого раза ${good} верно, ${warn} «с ценой», ${bad} неверно. Очки ${points(total)}. Монеты = ${reward} × ${points(total)} ÷ ${questions} ≈ ${earned}.`,
  miniReward: (min: number, max: number) =>
    `Награда за мини-игру — ${range(min, max)} монет, считается по той же формуле. Мини-игра день не закрывает.`,
  correctionReward: (title: string, reward: number) => `«${title}» появляется после ошибки и даёт до ${coins(reward)}.`,
  repeatFormula: "Повтор = новый результат − лучший прошлый (если меньше нуля, то 0)",
  repeatExample: (best: number, now: number, topUp: number) =>
    `Пример: в прошлый раз ${best}, сейчас ${now} → доплата ${signed(topUp)}. Так повтором нельзя «накрутить» монеты, но стараться снова выгодно.`,
  dailyGift: (track: readonly number[]) =>
    `Ежедневный подарок: ${track.join(", ")} монет, потом круг сначала. Один подарок в календарный день. Пропущенный день место на дорожке не сдвигает.`,
  depositReturnFormula: "Вклад вернёт = сумма + сумма × процент ÷ 100 (дробная часть отбрасывается)",

  planTitle: "2. План дня",
  planPromise:
    "План — это обещание. Монеты остаются на балансе, пока ты что-то не купишь или не положишь в копилку или на вклад.",
  planFormula: "Обязательные + Желаемые + Копилка ≤ Баланс",
  planFloor:
    "И ещё: Обязательные должны покрывать сегодняшние счета. Если монет меньше, чем счета, хватит всего баланса.",
  billsIntro: (days: number) =>
    `Счета — это минимум на обязательное (еда и витамины). Подойдёт любой набор из обязательных покупок. Минимум идёт по кругу из ${days} дней:`,
  billsDay: (day: number, total: number, note?: string) =>
    `День ${day}: минимум ${coins(total)}${note ? `. ${note}` : ""}`,
  billsRepeat: (next: number) => `День ${next} снова как день 1, и так далее.`,

  shopTitle: "3. Покупки и шкалы",
  shopRule: "Покупка проходит, только если баланс не меньше цены. Иначе игра покажет, сколько не хватает.",
  itemLine: (name: string, price: number, effects: string, mandatory: boolean) =>
    `${name} (${mandatory ? "обязательное" : "желаемое"}) — ${coins(price)}: ${effects}`,
  careEffect: (delta: number) => `Сытость ${signed(delta)}`,
  moodEffect: (delta: number) => `Счастье ${signed(delta)}`,
  habitIntro:
    "Привычки. «Подряд» — это сколько прошлых игровых дней подряд (вчера, позавчера…) ты покупал этот товар. Сегодняшние покупки не считаются, поэтому все покупки за один день дают одинаково. Пропустил день — счёт с нуля.",
  habitGrow: (name: string, base: number, step: number, max: number) =>
    `${name} — бонус за повтор: Счастье = ${base} + ${step} за каждый день подряд, но не больше ${base + max}.`,
  habitFade: (name: string, base: number, step: number, min: number) =>
    `${name} — уменьшение за повтор: Счастье = ${base} − ${step} за каждый день подряд, но не меньше ${min}.`,
  meterStart: (care: number, mood: number) => `Новый питомец: Сытость ${care}, Счастье ${mood}.`,
  dayEnd: (care: number, mood: number) =>
    `Конец каждого игрового дня: Сытость ${signed(-care)}, Счастье ${signed(-mood)}. Покупка это не отменяет, её прибавка уже на шкале.`,
  overspend: (n: number) => `Потратил на желаемое больше, чем обещал в плане: ещё Счастье ${signed(-n)} в конце дня.`,
  noPlan: (n: number) =>
    `План был открыт, но не подтверждён: ещё Счастье ${signed(-n)} в конце дня. В день, когда урок «Планирование бюджета» только открыл план, штрафа нет.`,
  clamp: (min: number, max: number) => `Шкалы всегда от ${min} до ${max}: больше ${max} и меньше ${min} не бывает.`,
  pose: (sadBelow: number, happyFrom: number) =>
    `Питомец радуется, когда обе шкалы ${happyFrom} и выше. Грустит, когда хоть одна ниже ${sadBelow}.`,

  savingsTitle: "4. Копилка и цели",
  forecastFormula: "Дней до цели = остаток ÷ средний взнос, округление вверх",
  forecastWindow: (n: number) =>
    `Средний взнос берётся по последним ${n} взносам. До первого взноса вместо числа — «—».`,
  forecastExample: (remaining: number, deposits: readonly number[], days: number) =>
    `Пример: осталось ${remaining}, взносы ${deposits.join(", ")}. Средний ${deposits.reduce((a, b) => a + b, 0) / deposits.length}, значит примерно ${days} ${daysWord(days)}.`,
  goalsRule:
    "Цель выбирают из трёх целей своего этапа. Её покупают монетами из копилки. Покупка цели сильно поднимает Счастье и переводит питомца на следующий этап.",
  goalsStage: (stage: string, list: string) => `${stage}: ${list}`,
  goalItem: (name: string, price: number, mood: number) => `${name} ${price} (Счастье ${signed(mood)})`,

  bankTitle: "5. Банк",
  bankUnlock: (lesson: string) => `Банк открывается после урока «${lesson}».`,
  bankMin: (n: number) => `Вклад — от ${coins(n)}. Монеты уходят с баланса сразу, забрать раньше срока нельзя.`,
  bankOffer: (days: number, rate: number) => `${days} ${gameDaysWord(days)} — +${rate}%`,
  bankReturn: "Вклад возвращается на баланс в день «день открытия + срок».",
  bankExample: (amount: number, days: number, rate: number, payout: number) =>
    `Пример: ${coins(amount)} на ${days} ${gameDaysWord(days)} под ${rate}% вернут ${payout}.`,

  stagesTitle: "6. Этапы питомца",
  stagesOrder: (names: readonly string[]) =>
    `${names.join(" → ")}. Этап растёт только от покупки цели из копилки: одна цель — один шаг.`,
  stageFloor: (stage: string, price: number) =>
    `Чтобы уйти с этапа ${stage}, накопи хотя бы ${coins(price)}: столько стоит самая дешёвая цель этапа.`,
  stageLast: (stage: string) =>
    `На этапе ${stage} следующего этапа нет, но цели всё равно можно покупать ради Счастья.`,
  accessory: (stage: string, name: string) => `${stage}: ${name}`,
  accessoryIntro: "Аксессуар открывается вместе с этапом:",
} as const;
