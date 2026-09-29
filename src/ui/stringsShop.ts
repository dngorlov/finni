import { METERS } from "../core/config";

/**
 * «Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!»
 * Reads the configured drops; two different numbers name each meter.
 */
export function dailyRuleText(care: number, mood: number): string {
  const drop = care === mood ? `Сытость и Счастье уменьшаются на ${care}` : `Сытость уменьшается на ${care}, а Счастье — на ${mood}`;
  return `Каждый день ${drop}. Совершая покупки, можно их восполнить!`;
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

/** Магазин copy added with the shop-row redesign. Older shop strings stay in strings.ts. */
export const shopStrings = {
  careWord: "сытость",
  moodWord: "счастье",
  /** «+10 сытость» */
  effectGain: (delta: number, meter: string) => `+${delta} ${meter}`,
  /** Info button on the Дом day pill. The rule itself stays hidden until the tap. */
  dailyDropHint: "Подсказка про день",
  /** Invisible catch over Дом. A tap anywhere but the tip closes it. */
  dailyDropClose: "Закрыть подсказку",
  /** Standing rule under the Магазин tabs and in the Дом day tip. The drop always lands; a purchase offsets it. */
  dailyRule: dailyRuleText(METERS.dailyCareDrop, METERS.dailyMoodDrop),
  dailyCare: (n: number) => `сытость -${n}`,
  dailyMood: (n: number) => `счастье -${n}`,

  buy: "Купить",
  buyA11y: (name: string) => `Купить ${name}`,

  /** Receipt after a Магазин purchase. */
  resultBought: "Куплено",
  resultPet: "Питомец",
  /** «Покупка компенсирует снижение: сытость -15 и счастье -15.» The day's drop still lands. */
  resultShield: (phrase: string) => `Покупка компенсирует снижение: ${phrase}.`,

  /** Привычка bar on a Магазин card: «Курс: +4» (витамины) or «Надоедает: +3» (мороженое). The number is today's Счастье. */
  habitLabel: (kind: "grow" | "fade", mood: number) => `${kind === "grow" ? "Курс" : "Надоедает"}: +${mood}`,
  /** «Витамины подряд 2 дня: счастье +4». */
  habitA11y: (name: string, streak: number, mood: number) =>
    `${name} подряд ${streak} ${daysWord(streak)}: счастье +${mood}`,
} as const;
