import type { Insight } from "../core/dayInsights";

/**
 * RU strings of the closed-day report (Итоги дня and Итоги), the day's
 * «Разбор дня» insights, and the План board. Kept apart from strings.ts.
 */
function coinsWord(n: number): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return "монета";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "монеты";
  return "монет";
}

/** «потратить 1 монету / 3 монеты / 5 монет» — the accusative after a verb. */
function coinsAcc(n: number): string {
  const word = coinsWord(n);
  return `${n} ${word === "монета" ? "монету" : word}`;
}

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

/** Kind, specific sentence for one insight. Never «плохо» or «ошибка». */
export function insightText(insight: Insight): string {
  switch (insight.id) {
    case "billsPaid":
      return "Все счета оплачены — питомцу хорошо!";
    case "planKept":
      return "Ты сдержал обещание: день прошёл по плану.";
    case "goalReady":
      return "В Копилке хватает на Цель — её уже можно купить!";
    case "saved": {
      const head = `Ты отложил ${coinsAcc(insight.amount)} в Копилку.`;
      if (insight.goalRemaining == null || insight.goalDays == null) return `${head} Так и копят на Цель.`;
      return `${head} До Цели ${insight.goalRemaining} — если откладывать так же, ещё ${insight.goalDays} ${daysWord(insight.goalDays)}.`;
    }
    case "lesson":
      return `Урок пройден: +${insight.coins} ${coinsWord(insight.coins)}. Знания приносят монеты!`;
    case "dayDone":
      return "День прожит! Завтра — новый шанс.";
    case "wantsOverNeeds":
      return `Ты мог потратить ${coinsAcc(insight.amount)} на обязательное — ${
        insight.missedFood ? "питомец был бы сыт" : "все счета были бы оплачены"
      }, — но потратил их на желаемое.`;
    case "billsMissed":
      return insight.missedFood
        ? `Питомцу не хватило еды: на обязательное не хватило ${insight.missing} ${coinsWord(insight.missing)}. Завтра начни с обязательного.`
        : `На счета не хватило ${insight.missing} ${coinsWord(insight.missing)}. Завтра начни с обязательного.`;
    case "overspentWants":
      return `На желаемое ушло на ${insight.over} ${coinsWord(insight.over)} больше плана. Завтра заложи на него чуть больше — или купи что-то одно.`;
    case "noPlan":
      return "Завтра подтверди План — тогда питомец не расстроится.";
    case "savedLess":
      return `В Копилку легло на ${insight.short} ${coinsWord(insight.short)} меньше, чем в плане. Положи их завтра — Цель станет ближе.`;
    case "nothingSaved":
      return insight.hasGoal
        ? "Сегодня в Копилку ничего не легло. Даже 5 монет в день приближают Цель."
        : "Сегодня в Копилку ничего не легло. Выбери Цель — копить станет интереснее.";
    case "overPlan":
      return `Покупок вышло на ${insight.over} ${coinsWord(insight.over)} больше плана. Завтра загляни в План перед Магазином.`;
  }
}

export const dayStrings = {
  insightsTitle: "Разбор дня",
  insightGood: "Получилось",
  insightTip: "Совет",
  insightA11y: (kind: Insight["kind"], text: string) => `${kind === "good" ? "Получилось" : "Совет"}: ${text}`,
  petTitle: "Питомец",

  showAll: (n: number) => `Показать все (${n})`,
  showLess: "Свернуть",

  // План
  planAllPlaced: "Все монеты разложены!",
  planTooMuch: (n: number) => `Разложено на ${n} больше, чем есть. Убавь суммы.`,
};
