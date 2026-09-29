/**
 * Copy for the Главная scene, the compact Карта заданий, the Словарик redesign
 * and the Об авторах block in Настройки. Kept apart from strings.ts so parallel
 * screen work does not collide.
 */
export const homeStrings = {
  /** Spoken name of the pet button on Главная (the pet picture keeps its own label). */
  petTalk: (petName: string) => (petName ? `Поговорить с питомцем ${petName}` : "Поговорить с питомцем"),
  /** Lines the pet says on a tap, and on its own after a quiet gap. One pool per mood. */
  petLinesHungry: ["Я бы что-нибудь съел…", "Животик урчит!"],
  petLinesSad: ["Мне немного грустно.", "Давай поиграем?"],
  petLinesHappy: ["Ура, я так рад!", "Ты лучший друг!", "Копим на мечту?", "Сегодня отличный день!"],
  petLinesIdle: ["Привет!", "Открывай карту!", "Копим на мечту?", "Что купим сегодня?"],
  /** Shown in the quiet gap while the pet is hungry, between spoken lines. */
  petHungryEmoji: "🍽️",
  petHungryEmojiLabel: "Голоден",
  /** Shown in the quiet gap while the pet is sad, between spoken lines. */
  petSadEmoji: "😢",
  petSadEmojiLabel: "Грустно",
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
