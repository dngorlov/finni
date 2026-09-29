/**
 * Copy for the Главная scene, the compact Карта заданий, the Словарик redesign
 * and the Об авторах block in Настройки. Kept apart from strings.ts so parallel
 * screen work does not collide.
 */
import { coins } from "./games/gameStrings";

export const homeStrings = {
  /** Spoken name of the pet button on Главная (the pet picture keeps its own label). */
  petTalk: (petName: string) => (petName ? `Поговорить с питомцем ${petName}` : "Поговорить с питомцем"),
  /** Pet lines on Дом: the pool for the pet's mood comes first, then goal, time of day, and any-mood lines. */
  petLinesHungry: ["Я бы что-нибудь съел…", "Животик урчит!", "Может, купим супа?", "Еда — важная покупка!"],
  petLinesSad: ["Мне немного грустно.", "Давай поиграем?", "Побудь со мной немножко.", "Вместе всегда веселее!"],
  petLinesHappy: [
    "Ура, я так рад!",
    "Ты лучший друг!",
    "Сегодня отличный день!",
    "Мне так весело с тобой!",
    "Прыг-скок!",
  ],
  petLinesIdle: ["Привет!", "Пойдём на карту?", "Что купим сегодня?", "Пощекочи меня!", "Сначала нужное, потом приятное."],
  petLinesAny: [
    "Копим на мечту?",
    "Монетка к монетке!",
    "Иногда лучше подождать.",
    "План помогает не потратить лишнее.",
    "Копилка любит терпеливых.",
    "Хочу научиться считать деньги!",
    "На карте нас ждут уроки!",
    "Спасибо, что заботишься обо мне!",
  ],
  /** Spoken label of the shelf with the Цели already bought. */
  shelfA11y: (names: readonly string[]) => `Полка: ${names.join(", ")}`,
  petLineMorning: "Доброе утро!",
  petLineDay: "Хорошего тебе дня!",
  petLineEvening: "Добрый вечер!",
  petLineNight: "Уже поздно, я зеваю…",
  petLinePickGoal: "Давай выберем цель!",
  petLineGoalStart: (goal: string) => `Начнём копить на «${goal}»?`,
  petLineGoalLeft: (left: number) => `До цели ещё ${coins(left)}!`,
  petLineGoalHalf: "Уже половина пути к цели!",
  petLineGoalReady: "Монет хватает на цель!",
  /** Hint on the speech bubble: a tap there asks for another line. */
  petBubbleHint: "Нажми, чтобы услышать другую фразу",
  goalA11y: (name: string, have: number, cost: number) => `Цель: ${name}, ${have} из ${cost}`,
  mapMore: "Подробнее",
  mapMoreA11y: (title: string) => `Подробнее: ${title}`,
  handbookWordsHint: "Нажми на слово",
  handbookLessonsHint: "Нажми на урок",
  handbookEmptyWords: "Слова появятся, когда пройдёшь урок.",
  handbookEmptyLessons: "Уроки появятся, когда пройдёшь их.",
  creditsTitle: "Об авторах и источниках",
  creditsLibraries: "Библиотеки",
  creditsDevTools: "Инструменты разработки",
  creditsTeam: "HSE SPb Team",
  creditsAi: "ИИ-модели",
  creditsFonts: "Шрифты",
  creditsIcons: "Иконки",
  creditsImages: "Изображения",
  creditsReferences: "Референсы",
  creditsContent: "Образовательный контент",
  creditsLibraryLine: (version: string, license: string) => `${version} · ${license}`,
  giftButton: "Подарок",
  giftTitle: "Подарки",
  giftHint: "Один подарок в день. Пропущенный день не сбрасывает.",
  giftTake: "Забрать",
  giftClaim: (coins: number) => `Забрать подарок, ${coins} монет`,
  giftClaimed: (day: number) => `День ${day}, уже получен`,
  giftLocked: (day: number) => `День ${day}, закрыт`,
  giftGotTitle: "Вот твой подарок",
  giftGot: (coins: number) => `Тебе ${coins} монет`,
} as const;
