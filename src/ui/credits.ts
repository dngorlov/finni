/**
 * Об авторах и источниках (hackathon Т/З): libraries, models, fonts, art and
 * references used to build finni. Versions are the ones installed from
 * package.json; a test checks that every dependency there is listed here.
 */

export type LibraryCredit = {
  /** npm package name. */
  pkg: string;
  /** Human name shown in Настройки. */
  name: string;
  version: string;
  license: string;
};

export type Credit = {
  /** What was used. */
  what: string;
  /** Who made it, where it came from, license. */
  source: string;
};

/** Runtime dependencies (package.json "dependencies"). */
export const RUNTIME_LIBRARIES: readonly LibraryCredit[] = [
  { pkg: "react-native", name: "React Native", version: "0.86.3", license: "MIT" },
  { pkg: "react", name: "React", version: "19.2.3", license: "MIT" },
  { pkg: "expo", name: "Expo", version: "57.0.24", license: "MIT" },
  { pkg: "expo-asset", name: "Expo Asset", version: "57.0.18", license: "MIT" },
  { pkg: "expo-build-properties", name: "Expo Build Properties", version: "57.0.21", license: "MIT" },
  { pkg: "expo-constants", name: "Expo Constants", version: "57.0.19", license: "MIT" },
  { pkg: "expo-font", name: "Expo Font", version: "57.0.4", license: "MIT" },
  { pkg: "expo-audio", name: "Expo Audio", version: "57.0.5", license: "MIT" },
  { pkg: "expo-sqlite", name: "Expo SQLite", version: "57.0.3", license: "MIT" },
  { pkg: "expo-status-bar", name: "Expo Status Bar", version: "57.0.1", license: "MIT" },
  { pkg: "@react-navigation/native", name: "React Navigation", version: "7.4.1", license: "MIT" },
  {
    pkg: "@react-navigation/native-stack",
    name: "React Navigation Native Stack",
    version: "7.19.2",
    license: "MIT",
  },
  { pkg: "drizzle-orm", name: "Drizzle ORM", version: "0.45.2", license: "Apache-2.0" },
  { pkg: "zod", name: "Zod", version: "4.6.5", license: "MIT" },
  { pkg: "react-native-svg", name: "react-native-svg", version: "15.15.4", license: "MIT" },
  { pkg: "react-native-screens", name: "react-native-screens", version: "4.26.2", license: "MIT" },
  {
    pkg: "react-native-safe-area-context",
    name: "react-native-safe-area-context",
    version: "5.7.0",
    license: "MIT",
  },
  {
    pkg: "@expo-google-fonts/press-start-2p",
    name: "@expo-google-fonts/press-start-2p",
    version: "0.4.1",
    license: "MIT (шрифт — OFL-1.1)",
  },
  {
    pkg: "@expo-google-fonts/nunito",
    name: "@expo-google-fonts/nunito",
    version: "0.4.2",
    license: "MIT (шрифт — OFL-1.1)",
  },
  {
    pkg: "@expo-google-fonts/unbounded",
    name: "@expo-google-fonts/unbounded",
    version: "0.4.1",
    license: "MIT (шрифт — OFL-1.1)",
  },
  {
    pkg: "@expo-google-fonts/cormorant-garamond",
    name: "@expo-google-fonts/cormorant-garamond",
    version: "0.4.1",
    license: "MIT (шрифт — OFL-1.1)",
  },
];

/** Build and test tooling (devDependencies, plus ESLint which package.json keeps in dependencies). */
export const DEV_TOOLS: readonly LibraryCredit[] = [
  { pkg: "typescript", name: "TypeScript", version: "6.0.3", license: "Apache-2.0" },
  { pkg: "jest", name: "Jest", version: "29.7.0", license: "MIT" },
  { pkg: "jest-expo", name: "jest-expo", version: "57.0.5", license: "MIT" },
  {
    pkg: "@testing-library/react-native",
    name: "React Native Testing Library",
    version: "14.0.1",
    license: "MIT",
  },
  { pkg: "test-renderer", name: "test-renderer", version: "1.3.0", license: "MIT" },
  { pkg: "eslint", name: "ESLint", version: "9.39.5", license: "MIT" },
  { pkg: "eslint-config-expo", name: "eslint-config-expo", version: "57.0.2", license: "MIT" },
  { pkg: "eslint-plugin-import", name: "eslint-plugin-import", version: "2.32.0", license: "MIT" },
  {
    pkg: "eslint-import-resolver-typescript",
    name: "eslint-import-resolver-typescript",
    version: "4.4.5",
    license: "ISC",
  },
  { pkg: "better-sqlite3", name: "better-sqlite3", version: "13.0.3", license: "MIT" },
  { pkg: "@types/better-sqlite3", name: "@types/better-sqlite3", version: "9.6.0", license: "MIT" },
  { pkg: "@types/jest", name: "@types/jest", version: "29.5.14", license: "MIT" },
  { pkg: "@types/react", name: "@types/react", version: "19.2.18", license: "MIT" },
];

/*
 * TODO(hsespbteam): add every other AI model the team used (for art, texts,
 * research, etc.) with what it was used for, before submitting the Т/З.
 */
/**
 * HSE SPb Team. TODO(команда): проверьте фамилии и роли — здесь только
 * то, что известно из переписки.
 */
export const TEAM: readonly Credit[] = [
  { what: "Сергей Гончаров", source: "разработка: код приложения, карта заданий, мини-игры, банк, экраны" },
  { what: "Дмитрий Горлов", source: "разработка: архитектура, данные, экраны" },
  { what: "Андрей Мужевлёв", source: "дизайн: пиксель-арт, питомцы, иконки, карта Москвы, палитра" },
  { what: "Савва Власов", source: "образовательный сценарий: уроки, карточки, тесты, мини-игры" },
  { what: "Александр Лузин", source: "продукт: требования и постановка задач" },
];

export const AI_MODELS: readonly Credit[] = [
  { what: "Claude (Anthropic)", source: "помощник разработчиков: код, тесты, правка текстов" },
];

export const FONTS: readonly Credit[] = [
  {
    what: "Press Start 2P",
    source: "CodeMan38, SIL Open Font License 1.1 (через Google Fonts)",
  },
  {
    what: "Nunito",
    source: "The Nunito Project Authors, SIL Open Font License 1.1 (через Google Fonts)",
  },
  {
    what: "Unbounded",
    source: "The Unbounded Project Authors, SIL Open Font License 1.1 (через Google Fonts)",
  },
  {
    what: "Cormorant Garamond",
    source: "Cormorant Project Authors, SIL Open Font License 1.1 (через Google Fonts)",
  },
];

export const ICONS: readonly Credit[] = [
  { what: "pixelarticons", source: "Gerrit Halfmann, MIT" },
  { what: "Пиксельные иконки и питомцы", source: "Андрей Мужевлёв (HSE SPb Team)" },
  { what: "Эмодзи", source: "системные шрифты устройства" },
];

export const IMAGES: readonly Credit[] = [
  {
    what: "Карта Москвы",
    source: "Wikipedia (административные округа Москвы), перерисовка в пиксель-арт — Андрей Мужевлёв",
  },
  { what: "Питомцы и иконки", source: "Андрей Мужевлёв (HSE SPb Team)" },
];

export const REFERENCES: readonly Credit[] = [
  { what: "Duolingo", source: "стиль интерфейса" },
  { what: "«Говорящий Том»", source: "главный экран" },
  { what: "Material Design 3", source: "палитра" },
  {
    what: "Звуки верного ответа, ошибки и конца задания",
    source: "оригинальный синтез, HSE SPb Team (scripts/generate-sfx.mjs)",
  },
];

export const EDUCATIONAL_CONTENT: readonly Credit[] = [
  { what: "Сценарий уроков", source: "Савва Власов (HSE SPb Team)" },
];
