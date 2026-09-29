import type { PixelIconName } from "./pixelIconXml";

/** Leading icon for a button. The spoken name stays the label. */
export function buttonIcon(label: string): PixelIconName {
  const text = label.trim();
  if (text.startsWith("На карту")) return "map";
  if (text.startsWith("Назад")) return "arrow-left";
  if (text.startsWith("Дальше") || text.startsWith("Следующий")) return "arrow-right";
  if (text.startsWith("Ура")) return "party-popper";
  if (text.startsWith("Понятно") || text.startsWith("Готово") || text.startsWith("Подтвердить")) return "check";
  if (text.startsWith("Закрыть") || text.startsWith("Удалить") || text.startsWith("Убрать")) return "close";
  if (text.includes("Купить") || text.startsWith("Магазин")) return "shopping-cart";
  if (/заново/i.test(text)) return "reload";
  if (text.startsWith("Играть") || text.startsWith("Начать") || text.startsWith("Пройти")) return "play";
  if (/Отлож|Позже|Дождаться|Ждём/.test(text)) return "clock";
  if (text.startsWith("Добавить")) return "coins";
  if (text.includes("Положить")) return "arrow-down";
  if (text.includes("Забрать")) return "arrow-up";
  if (/цел/i.test(text)) return "star";
  if (text.startsWith("Итоги") || text.startsWith("Словарик")) return "book-open";
  if (text.includes("Взрослый")) return "user";
  if (text.startsWith("Открыть")) return "check";
  return "arrow-right";
}
