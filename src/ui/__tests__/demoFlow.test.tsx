import { render, screen, userEvent } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab, passAdultGate } from "../testSupport/flowHelpers";

const lunch: CatalogItem = {
  id: "lunch",
  kind: "mandatory",
  price: 12,
  effect: { meter: "care", delta: 10 },
};
const candy: CatalogItem = {
  id: "candy",
  kind: "optional",
  price: 5,
  effect: { meter: "mood", delta: 5 },
};
const tinyCatalog: CatalogItem[] = [lunch, candy];

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

async function confirmDemo(user: ReturnType<typeof userEvent.setup>) {
  await passAdultGate(user);
  await user.press(screen.getByRole("button", { name: "Демо-режим" }));
  expect(screen.getByText("Демо создаёт отдельный тестовый профиль")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Готово" }));
}

function expectSameChain() {
  expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Планирование бюджета, открыто" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Что такое сбережения, открыто" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Где живут накопления?, закрыто" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Платежи, закрыто" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Покупки, закрыто" })).toBeOnTheScreen();
  expect(screen.queryByText("Почини рюкзак")).not.toBeOnTheScreen();
}

describe("Демо-режим panel", () => {
  it(
    "lets a juror enter, reset, and leave without touching the child profile",
    async () => {
      const ports = createFakePorts();
      const childId = seedReturningChild(ports);
      const childDay = ports.game.dayState(childId);
      ports.game.purchase(childId, childDay.dayId, lunch);
      ports.game.claimTaskReward(childId, childDay.dayId, "budget_what", 10);
      const childBefore = ports.game.getProfile(childId);
      const childTasksBefore = ports.game.listTaskProgress(childId);

      const { user } = await renderApp(ports);
      expect(screen.getByLabelText("Баланс 98")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByRole("button", { name: "Планирование бюджета, открыто" })).toBeOnTheScreen();
      await openTab(user, "Дом");
      expect(screen.queryByText("Демо: дни идут подряд")).not.toBeOnTheScreen();
      expect(screen.queryByText("Охота за ценником")).not.toBeOnTheScreen();

      await confirmDemo(user);

      expect(screen.queryByText("Демо: дни идут подряд")).not.toBeOnTheScreen();
      expect(screen.getByText("День 1")).toBeOnTheScreen();
      expect(screen.getByLabelText("Этап 1 из 3, Новичок. Выбери цель")).toBeOnTheScreen();
      expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
      expect(screen.getByLabelText(/Питомец Демо/)).toBeOnTheScreen();
      expect(screen.queryByText("Охота за ценником")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Карта" }));
      expectSameChain();
      await openTab(user, "Дом");
      expect(ports.game.getProfile(childId)).toEqual(childBefore);
      expect(ports.game.listTaskProgress(childId)).toEqual(childTasksBefore);

      const demoId = ports.meta.get("activeProfileId")!;
      const demoDay = ports.game.dayState(demoId);
      ports.game.saveDraftPlan(demoId, demoDay.dayId, { mandatory: 12, optional: 5, savings: 15 });
      ports.game.confirmPlan(demoId, demoDay.dayId);
      ports.game.purchase(demoId, demoDay.dayId, lunch);
      ports.game.purchase(demoId, demoDay.dayId, candy);
      ports.game.transferToSavings(demoId, demoDay.dayId, 15);
      ports.game.claimTaskReward(demoId, demoDay.dayId, "budget_what", 10);
      ports.game.closeDay(demoId, tinyCatalog);

      await passAdultGate(user);
      await user.press(screen.getByRole("button", { name: "Сбросить демо" }));
      expect(screen.getByText("Демо вернётся к первому игровому дню")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Готово" }));

      expect(screen.queryByText("Демо: дни идут подряд")).not.toBeOnTheScreen();
      expect(screen.getByText("День 1")).toBeOnTheScreen();
      expect(screen.getByLabelText("Этап 1 из 3, Новичок. Выбери цель")).toBeOnTheScreen();
      expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
      expect(screen.queryByText("Охота за ценником")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Карта" }));
      expectSameChain();
      await openTab(user, "Дом");

      await openMoney(user, "Журнал");
      expect(screen.getByLabelText("Стартовый бюджет +100")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
      expect(screen.getByText("Старт")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Покупка: Обед -12")).not.toBeOnTheScreen();
      expect(screen.queryByText("День 2")).not.toBeOnTheScreen();
      await openTab(user, "Дом");

      await passAdultGate(user);
      await user.press(screen.getByRole("button", { name: "Демо-режим" }));

      expect(screen.getByLabelText("Баланс 98")).toBeOnTheScreen();
      expect(screen.queryByText("Демо: дни идут подряд")).not.toBeOnTheScreen();
      expect(screen.getByLabelText(/Питомец Пух/)).toBeOnTheScreen();
      expect(screen.queryByText("Охота за ценником")).not.toBeOnTheScreen();
      expect(ports.game.getProfile(childId)).toEqual(childBefore);
      expect(ports.game.listTaskProgress(childId)).toEqual(childTasksBefore);
    },
    15000,
  );
});
