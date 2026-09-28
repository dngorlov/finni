import { screen, userEvent } from "@testing-library/react-native";

/** Every ready lesson pin — all open at once in Демо-режим. */
export const demoMissions = [
  "Что такое бюджет?",
  "Планирование бюджета",
  "Что такое сбережения",
  "Где живут накопления?",
  "Платежи",
  "Покупки",
] as const;

function collectText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  const children = "props" in node ? (node as { props: { children?: unknown } }).props.children : undefined;
  if (Array.isArray(children)) return children.map(collectText).join("");
  return collectText(children);
}

export function visibleGatePrompt(): string {
  return collectText(screen.getByText(/Сколько будет \d+ × \d+\?/));
}

export function visibleGateProduct(): number {
  const match = visibleGatePrompt().match(/(\d+)\s*×\s*(\d+)/);
  if (!match) throw new Error(`Не разобрали вопрос: ${visibleGatePrompt()}`);
  return Number(match[1]) * Number(match[2]);
}

export async function openTab(user: ReturnType<typeof userEvent.setup>, name: "Дом" | "Карта" | "Деньги") {
  await user.press(screen.getByRole("button", { name }));
}

/**
 * Open a Деньги section from the pill tabs at the top (Копилка is first).
 * While Журнал is the only section there are no pills, and Деньги shows it.
 */
export async function openMoney(
  user: ReturnType<typeof userEvent.setup>,
  section: "Копилка" | "План" | "Журнал" | "Банк",
) {
  await openTab(user, "Деньги");
  if (section === "Журнал" && !screen.queryByRole("button", { name: section })) return;
  await user.press(screen.getByRole("button", { name: section }));
}

/** Open Взрослый раздел from Настройки and type the visible product. */
export async function passAdultGate(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole("button", { name: "Настройки" }));
  await user.press(screen.getByRole("button", { name: "Взрослый раздел" }));
  await user.type(screen.getByRole("textbox", { name: "Ответ" }), String(visibleGateProduct()));
  await user.press(screen.getByRole("button", { name: "Войти" }));
}

export async function confirmTinyPlan(user: ReturnType<typeof userEvent.setup>) {
  await openMoney(user, "План");
  await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
  await user.press(screen.getByRole("button", { name: "Желаемые, больше" }));
  await user.press(screen.getByRole("button", { name: "Копилка, больше" }));
  await user.press(screen.getByRole("button", { name: "Подтвердить план" }));
  await user.press(screen.getByRole("button", { name: "Подтвердить план" }));
  await openTab(user, "Дом");
}
