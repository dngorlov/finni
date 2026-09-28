/**
 * Copy for the living Питомец on Дом, Внешний вид, and the «Новый аксессуар»
 * card. Kept apart from strings.ts so parallel screen work does not collide.
 */
import { STAGE_NAMES, type Stage } from "../core/stages";
import { strings } from "./strings";

const ACCESSORY_NAMES: Record<string, string> = {
  a1: "Без аксессуара",
  a2: "Очки",
  a3: "Шапочка с антенной",
};

/** Lower-case, for the middle of a sentence. */
const ACCESSORY_WORDS: Record<string, string> = {
  a1: "без аксессуара",
  a2: "очки",
  a3: "шапочка с антенной",
};

const POSE_WORDS = {
  idle: "спокойный",
  happy: "весёлый",
  sad: "грустный",
} as const;

export const petStrings = {
  accessoryName: (key: string) => ACCESSORY_NAMES[key] ?? key,
  petA11y: (input: {
    petName?: string;
    species: string;
    color: string;
    accessory: string;
    pose: keyof typeof POSE_WORDS;
  }) => {
    const who = input.petName ? `Питомец ${input.petName}` : "Питомец";
    return `${who}, ${strings.speciesName(input.species)}, ${strings.colorName(input.color)}, ${
      ACCESSORY_WORDS[input.accessory] ?? input.accessory
    }, ${POSE_WORDS[input.pose]}`;
  },

  appearanceTitle: "Внешний вид",
  appearanceOpen: "Внешний вид питомца",
  appearanceSpecies: "Вид",
  appearanceColor: "Окрас",
  appearanceAccessory: "Аксессуар",
  appearanceLocked: (stage: Stage) => `Откроется на этапе «${STAGE_NAMES[stage]}»`,
  appearanceLockedA11y: (name: string, stage: Stage) =>
    `${name}, закрыто. Откроется на этапе «${STAGE_NAMES[stage]}»`,
  appearanceLockIcon: "🔒",

  unlockCaption: "Новый аксессуар",
  unlockTitle: (key: string) => `Новый аксессуар: ${ACCESSORY_WORDS[key] ?? key}!`,
  unlockBody: (petName: string, stage: Stage) =>
    `Этап «${STAGE_NAMES[stage]}» открыт, и ${petName || "питомец"} уже примеряет обновку. Снять или поменять можно в Настройках → «Внешний вид».`,
  unlockDone: "Класс!",

  /** Spoken once, when Этап first becomes Миллионер. */
  finaleTitle: "Поздравляю!",
  finaleBody:
    "Ты дошёл до конца и стал финансово грамотным. Но ты можешь продолжать играть, если тебе всё ещё интересно.",
  finaleDone: "Играть дальше",
} as const;
