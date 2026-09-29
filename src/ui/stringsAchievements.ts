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
  sweets: {
    emoji: "🍦",
    title: "Два вкуса",
    hint: "Купи и Мороженое, и Пиццу.",
    detail: "Мороженое и пицца куплены.",
  },
  sick_day: {
    emoji: "💊",
    title: "Питомец здоров",
    hint: "В один день купи Суп, Чай и Витамины.",
    detail: "В один день куплены Суп, Чай и Витамины.",
  },
  piggy: {
    emoji: "🐷",
    title: "Копилка по чуть-чуть",
    hint: "Положи монеты в Копилку в шесть разных дней.",
    detail: "Шесть дней копилка пополнялась.",
  },
  plans: {
    emoji: "📋",
    title: "Три плана",
    hint: "Подтверди План три раза.",
    detail: "Три Плана подтверждены.",
  },
  ten_days: {
    emoji: "📅",
    title: "Десять дней с Финни",
    hint: "Закрой 10 Игровых дней.",
    detail: "Десять дней с Финни.",
  },
  lessons: {
    emoji: "📘",
    title: "Четыре задания",
    hint: "Закончи 4 Задания.",
    detail: "Четыре Задания позади.",
  },
  interest: {
    emoji: "🏦",
    title: "Проценты пришли",
    hint: "Дождись, пока Вклад вернётся с процентами.",
    detail: "Вклад вернулся с процентами.",
  },
  kept_word: {
    emoji: "🤝",
    title: "Пять обещаний",
    hint: "Пять дней закрой и уложись в План.",
    detail: "Пять дней уложился в План.",
  },
  bills_week: {
    emoji: "🧾",
    title: "Неделя со счетами",
    hint: "Семь дней закрой, оплатив Счета.",
    detail: "Семь дней Счета оплачены.",
  },
  steady: {
    emoji: "🌟",
    title: "Три образцовых дня",
    hint: "Три дня: Счета оплачены, уложился в План и положил в Копилку.",
    detail: "Три дня всё сошлось.",
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
