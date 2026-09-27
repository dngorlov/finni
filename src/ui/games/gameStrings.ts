import type { BudgetBucket } from "../../core/tasks";

/** «1 монета / 3 монеты / 5 монет». */
export function coins(n: number): string {
  const a = Math.abs(n);
  const mod100 = a % 100;
  const mod10 = a % 10;
  const word =
    mod100 >= 11 && mod100 <= 14 ? "монет" : mod10 === 1 ? "монета" : mod10 >= 2 && mod10 <= 4 ? "монеты" : "монет";
  return `${n} ${word}`;
}

function days(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  const word = mod100 >= 11 && mod100 <= 14 ? "дней" : mod10 === 1 ? "день" : mod10 >= 2 && mod10 <= 4 ? "дня" : "дней";
  return `${n} ${word}`;
}

export const BUCKET_COPY: Record<BudgetBucket, { label: string; icon: string; about: string }> = {
  mandatory: { label: "Нужное", icon: "🍱", about: "обязательные расходы" },
  wants: { label: "Желания", icon: "🎈", about: "желания" },
  savings: { label: "Копилка", icon: "🐷", about: "накопления" },
};

export const gameStrings = {
  retry: "Попробовать ещё",
  round: (n: number, total: number) => `Раунд ${n} из ${total}`,
  cleared: (n: number) => `Верно: ${n}`,
  kept: (n: number) => `Сэкономлено: ${coins(n)}`,
  petGlad: (name: string) => `${name} радуется!`,
  petThink: (name: string) => `${name} думает ещё`,
  // Sort board
  sortPickFirst: "Перетащи покупку в корзину. Или выбери её и нажми на корзину.",
  sortPickA11y: (label: string) => `Выбрать: ${label}`,
  sortZoneA11y: (bin: string, count: number) => `Корзина «${bin}», в ней ${count}`,
  sortLeft: (n: number) => (n > 0 ? `Осталось разложить: ${n}` : "Все покупки разложены!"),
  sortHintDefault: "Подумай ещё раз. Можно ли отложить эту покупку?",
  sortRight: "Верно!",
  sortWrong: "Подумай ещё",
  sortStreak: (n: number) => `Серия: ${n}`,
  sortTrick: "Трюк! Три верных подряд.",
  sortHop: "Фишка вернулась. Положи её в другую корзину.",
  previewCare: "Сытость на этом шаге поднимается.",
  previewMood: "Счастье на этом шаге поднимается.",
  confirm: "Подтвердить",
  pickHint: "Выбери карточки покупок.",
  pickSum: (spent: number, left: number) => `Выбрано на ${coins(spent)}. Останется ${coins(left)}.`,
  pickOver: (spent: number, budget: number) => `Выбрано на ${coins(spent)}. У тебя только ${coins(budget)}.`,
  pickBuy: "Купить",
  purse: (left: number, budget: number) => `В кошельке ${coins(left)} из ${coins(budget)}`,
  purseOver: "В кошелёк не влезает",
  repair: "Вернуть и выбрать снова",
  pickReturned: "Покупку вернули. Выбери снова — нужное ещё можно успеть.",
  // Budget board
  more: (bucket: string) => `Больше: ${bucket}`,
  less: (bucket: string) => `Меньше: ${bucket}`,
  allocated: (sum: number, total: number) => `Распределено ${sum} из ${total}`,
  allocLeft: (n: number) => `Осталось распределить: ${coins(n)}`,
  allocOver: (total: number) => `У тебя только ${coins(total)}. Измени план, чтобы сумма совпадала.`,
  allocExact: "Сумма совпала!",
  jarLids: "Крышки закрылись!",
  jarPour: (label: string) => `Налить в «${label}»`,
  jarSteal: (label: string, n: number) => `Забрать ${coins(n)} из «${label}»`,
  jarWorried: (label: string) => `В банке «${label}» пусто`,
  replanSteal: "Нажми банку, из которой забрать монеты на сюрприз.",
  planReady: "План готов!",
  planReadyLine: (m: number, w: number, s: number) =>
    `Посмотри, сколько ты решил потратить и сколько отложить. На нужное — ${m}, на желания — ${w}, в накопления — ${s}.`,
  planDone: "Готово",
  locked: "не меняется",
  replanNeed: (need: number, total: number) =>
    `Теперь по плану нужно ${need}, а есть ${total}. На всё по старому плану денег не хватает. Измени план.`,
  replanReady: "Новый план готов!",
  replanNothingCut: "План сошёлся.",
  // Compare
  plan: "План",
  fact: "Факт",
  diffMore: (bucket: BudgetBucket, n: number) =>
    bucket === "savings"
      ? `В копилку попало на ${coins(n)} больше, чем ты планировал.`
      : `На ${BUCKET_COPY[bucket].about} ушло на ${coins(n)} больше, чем ты планировал.`,
  diffLess: (bucket: BudgetBucket, n: number) =>
    bucket === "savings"
      ? `В копилку попало на ${coins(n)} меньше, чем ты планировал.`
      : `На ${BUCKET_COPY[bucket].about} ушло на ${coins(n)} меньше, чем ты планировал.`,
  diffSame: (bucket: BudgetBucket) => `${BUCKET_COPY[bucket].label}: точно по плану.`,
  compareA11y: (label: string, plan: number, fact: number) => `${label}: план ${plan}, факт ${fact}`,
  // Steps & dream
  progress: (saved: number, goal: number) => `Накоплено: ${saved} из ${goal}`,
  remaining: (n: number) => `Осталось: ${n}`,
  income: (n: number) => `Пришло ${coins(n)}. Сколько отложить?`,
  put: (n: number) => `Отложить ${n}`,
  putResult: (n: number, left: number) =>
    left > 0 ? `Ты отложил ${coins(n)}. Теперь до цели осталось ${left}.` : `Ты отложил ${coins(n)}.`,
  smallStep: "Маленький взнос тоже приближает тебя к цели.",
  visitorHere: "Гость заглянул",
  tempt: (pet: string, name: string, price: number) => `${pet} увидел: ${name.toLowerCase()} за ${coins(price)}. Очень хочется! Что решишь?`,
  temptBuy: "Купить",
  temptKeep: "Копить дальше",
  temptBought: (name: string, price: number, left: number) =>
    `Купили: ${name.toLowerCase()} за ${price}. В этот раз можно отложить только ${coins(left)}.`,
  temptBoughtNothing: (name: string) => `Купили: ${name.toLowerCase()}. В этот раз отложить нечего — но цель никуда не делась.`,
  temptKept: "Ты не стал тратить. Все монеты этого раунда можно отложить!",
  skipRound: "Дальше",
  reached: (goal: number) =>
    `🎉 Цель достигнута! Ты накопил ${goal} из ${goal} монет. Каждый небольшой шаг помог тебе приблизиться к цели.`,
  dreamPickA11y: (name: string, price: number) => `${name}, ${coins(price)}`,
  dreamGoal: (name: string, price: number) => `Твоя цель — ${name}. Стоимость — ${coins(price)}.`,
  dreamDeposit: "Сколько добавить в накопления?",
  dreamAdd: (n: number) => `Добавить ${n}`,
  dreamAdded: (n: number, left: number) => `Отлично! Ты добавил ${coins(n)}. До цели осталось ${left}.`,
  dreamPace: (d: number) => `А если откладывать каждый день — успеешь за ${days(d)}?`,
  dreamPer: (n: number) => `По ${n} в день`,
  dreamPaceResult: (per: number, needDays: number, wanted: number) =>
    needDays <= wanted
      ? `По ${coins(per)} в день — цель через ${days(needDays)}. Успеешь за ${days(wanted)}!`
      : `По ${coins(per)} в день — цель через ${days(needDays)}. За ${days(wanted)} не успеть: попробуй взнос побольше или срок подольше.`,
};
