import { ACHIEVEMENT_RULES, type AchievementId } from "../core/achievements";

export type AchievementCopy = {
  emoji: string;
  title: string;
  /** How to earn it. Shown while it is still locked. */
  hint: string;
  /** Shown once it is earned, including in the reward modal. */
  detail: string;
};

export const ACHIEVEMENT_COPY: Record<AchievementId, AchievementCopy> = {
  first_buy: {
    emoji: "🛒",
    title: "Первая покупка",
    hint: "Купи что-нибудь в Магазине.",
    detail: "Ты купил в Магазине.",
  },
  treat: {
    emoji: "🍬",
    title: "Маленькая радость",
    hint: "Купи Желаемое.",
    detail: "Ты купил Желаемое.",
  },
  first_save: {
    emoji: "🐷",
    title: "Первая копилка",
    hint: "Положи монеты в Копилку.",
    detail: "Монеты в Копилке.",
  },
  save_50: {
    emoji: "💰",
    title: "Полтинник",
    hint: "Положи в Копилку 50 монет.",
    detail: "В Копилку положено 50 монет.",
  },
  plan: {
    emoji: "📋",
    title: "План есть",
    hint: "Подтверди План.",
    detail: "План подтверждён.",
  },
  week: {
    emoji: "📅",
    title: "Неделя с Финни",
    hint: "Закрой 7 Игровых дней.",
    detail: "Семь дней с Финни.",
  },
  lesson: {
    emoji: "📘",
    title: "Первый урок",
    hint: "Закончь Урок.",
    detail: "Урок пройден.",
  },
  goal: {
    emoji: "⭐",
    title: "Цель куплена",
    hint: "Купи Цель.",
    detail: "Цель куплена из Копилки.",
  },
  bank: {
    emoji: "🏦",
    title: "Вклад открыт",
    hint: "Открой Вклад.",
    detail: "Вклад в Банке открыт.",
  },
  word: {
    emoji: "🤝",
    title: "Держу слово",
    hint: "Закрой день и уложись в План.",
    detail: "Потратил не больше Плана.",
  },
  bills: {
    emoji: "🧾",
    title: "Счета оплачены",
    hint: "Закрой день, оплатив Счета.",
    detail: "Счета дня оплачены.",
  },
  pro: {
    emoji: "🚀",
    title: "Этап Про",
    hint: "Перейди на этап Про.",
    detail: "Теперь этап Про.",
  },
  millionaire: {
    emoji: "👑",
    title: "Миллионер",
    hint: "Перейди на этап Миллионер.",
    detail: "Теперь этап Миллионер.",
  },
};

export const achievementStrings = {
  section: "Достижения",
  earned: "Получено",
  empty: "Пока нет достижений.",
  modalCaption: "Новое достижение",
  celebrate: "Ура!",
  more: "Есть ещё.",
  progressCompact: (earned: number, total: number) => `${earned}/${total}`,
  progressA11y: (earned: number, total: number) => `Получено ${earned} из ${total}`,
  rowA11y: (title: string, line: string) => `${title}. ${line}`,
};

export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_RULES.length;
