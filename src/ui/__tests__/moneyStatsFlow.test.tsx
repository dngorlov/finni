import { render, screen, userEvent, within } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { moneyColors } from "../screens/moneyParts";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab } from "../testSupport/flowHelpers";
import { colors } from "../theme";

const content = loadContent();
const lunch = content.catalog.find((item) => item.id === "lunch")!;
const candy = content.catalog.find((item) => item.id === "candy")!;
const tinyCatalog: CatalogItem[] = [lunch, candy];

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

/** Day 1: Обед 12, Конфета 5, 15 into Копилка; then day 2 opens. */
async function playDayOneThenOpenDayTwo() {
  const ports = createFakePorts();
  const profileId = seedReturningChild(ports, { unlockMoney: true });
  const day = ports.game.dayState(profileId);
  ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 12, optional: 5, savings: 15 });
  ports.game.confirmPlan(profileId, day.dayId);
  ports.game.purchase(profileId, day.dayId, lunch);
  ports.game.purchase(profileId, day.dayId, candy);
  ports.game.transferToSavings(profileId, day.dayId, 15);
  ports.game.closeDay(profileId, tinyCatalog);
  const app = await renderApp(ports);
  await app.user.press(screen.getByRole("button", { name: "Следующий день" }));
  return { ...app, profileId };
}

describe("Деньги tabs", () => {
  it("shows the unlocked sections as pill tabs without opening a menu", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await openTab(user, "Деньги");
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Журнал" })).not.toBeSelected();
    expect(screen.queryByRole("button", { name: "Банк" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Журнал" }));
    expect(screen.getByRole("button", { name: "Журнал" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Всё время, другие дни" })).toBeCollapsed();
    expect(screen.queryByRole("button", { name: "Сегодня" })).not.toBeOnTheScreen();
  });
});

describe("Журнал stats", () => {
  it("switches periods and Траты / Доходы, with legend numbers and totals", async () => {
    const { user } = await playDayOneThenOpenDayTwo();
    await openMoney(user, "Журнал");

    // Всё время: day 1 and the start. Day 2 has no movements, so it is not listed.
    expect(screen.getByText("День 1")).toBeOnTheScreen();
    expect(screen.getByText("Старт")).toBeOnTheScreen();
    expect(screen.getByLabelText("Ушло: 32 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Пришло: 100 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Итого: 68 монет")).toBeOnTheScreen();
    expect(within(screen.getByLabelText("Пришло: 100 монет")).getByText("100")).toHaveStyle({
      color: moneyColors.plus,
    });
    expect(within(screen.getByLabelText("Ушло: 32 монет")).getByText("32")).toHaveStyle({
      color: moneyColors.minus,
    });
    expect(within(screen.getByLabelText("Итого: 68 монет")).getByText("68")).toHaveStyle({
      color: moneyColors.plus,
    });
    expect(
      within(screen.getByRole("img", { name: /^Траты, Всё время/ })).getByText("32", {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ color: moneyColors.minus });
    expect(screen.getByText("-32", { includeHiddenElements: true })).toHaveStyle({ color: moneyColors.minus });
    expect(within(screen.getByLabelText("Покупка: Обед -12")).getByText("-12")).toHaveStyle({
      color: moneyColors.minus,
    });
    expect(within(screen.getByLabelText("Стартовый бюджет +100")).getByText("+100")).toHaveStyle({
      color: moneyColors.plus,
    });
    for (const node of screen.getAllByText("+100", { includeHiddenElements: true })) {
      expect(node).toHaveStyle({ color: moneyColors.plus });
    }

    await user.press(screen.getByRole("button", { name: "Всё время, другие дни" }));
    expect(screen.getByRole("button", { name: "Всё время" })).toBeSelected();
    expect(screen.getByRole("button", { name: "3 дня" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Сегодня" }));
    expect(screen.getByRole("button", { name: "Сегодня, другие дни" })).toBeCollapsed();
    expect(screen.queryByRole("button", { name: "Вчера" })).not.toBeOnTheScreen();
    expect(screen.queryByText("День 2")).not.toBeOnTheScreen();
    expect(screen.queryByText("День 1")).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Ушло: 0 монет")).toBeOnTheScreen();
    expect(screen.getByText("Здесь пока пусто")).toBeOnTheScreen();
    expect(within(screen.getByLabelText("Пришло: 0 монет")).getByText("0")).toHaveStyle({ color: colors.subtle });
    expect(within(screen.getByLabelText("Ушло: 0 монет")).getByText("0")).toHaveStyle({ color: colors.subtle });
    expect(within(screen.getByLabelText("Итого: 0 монет")).getByText("0")).toHaveStyle({ color: colors.subtle });

    await user.press(screen.getByRole("button", { name: "Сегодня, другие дни" }));
    await user.press(screen.getByRole("button", { name: "Вчера" }));
    expect(screen.queryByText("День 2")).not.toBeOnTheScreen();
    expect(screen.getByText("День 1")).toBeOnTheScreen();
    expect(screen.getByText("Старт")).toBeOnTheScreen();
    expect(screen.getByLabelText("Покупка: Обед -12")).toBeOnTheScreen();
    expect(screen.getByLabelText("Необходимое: 12 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Желаемое: 5 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Копилка: 15 монет")).toBeOnTheScreen();
    expect(
      screen.getByRole("img", {
        name: "Траты, Вчера: Необходимое 12 монет; Желаемое 5 монет; Копилка 15 монет",
      }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Доходы" }));
    expect(screen.getByRole("button", { name: "Доходы" })).toBeSelected();
    expect(screen.getByLabelText("Стартовый бюджет: 100 монет")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Необходимое: 12 монет")).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/Пособие/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Пришло: 100 монет")).toBeOnTheScreen();
    expect(
      within(screen.getByRole("img", { name: /^Доходы, Вчера/ })).getByText("100", {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ color: moneyColors.plus });
  });
});

describe("План yesterday", () => {
  it("shows what went to each bucket yesterday next to today's draft", async () => {
    const { user } = await playDayOneThenOpenDayTwo();
    await openMoney(user, "План");

    // One pile per step: Обязательные, then Копилка, then Желаемые.
    expect(screen.getByText("Вчера: 12")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByText("Вчера: 15")).toBeOnTheScreen();
    expect(screen.getByText(" · сегодня на 15 меньше")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Копилка, больше" }));
    expect(screen.getByText(" · сегодня на 14 меньше")).toBeOnTheScreen();
    expect(screen.getByRole("slider", { name: "Копилка" })).toHaveAccessibilityValue({
      now: 1,
      text: "Копилка: 1 монета",
    });
    await user.press(screen.getByRole("button", { name: "Далее" }));
    expect(screen.getByText("Вчера: 5")).toBeOnTheScreen();
    expect(screen.getByText(" · сегодня на 5 меньше")).toBeOnTheScreen();
  });
});

describe("Копилка stats", () => {
  it("sums deposits and lists Копилка moves", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.transferToSavings(profileId, day.dayId, 15);
    ports.game.transferToSavings(profileId, day.dayId, 5);
    ports.game.withdrawFromSavings(profileId, day.dayId, 4);
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    expect(screen.getByLabelText("В копилке 16")).toBeOnTheScreen();
    expect(screen.getByLabelText("Отложено всего: 20 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Взносов: 2 раза")).toBeOnTheScreen();
    expect(screen.getByLabelText("В среднем за раз: 10 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Снятие, День 1, -4 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Пополнение, День 1, +15 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Цель: собрано 16 из 90")).toBeOnTheScreen();
  });
});
