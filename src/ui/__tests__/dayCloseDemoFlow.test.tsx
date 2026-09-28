import { render, screen, userEvent } from "@testing-library/react-native";
import { META_KEYS } from "../../data/metaKeys";
import { FinPetApp } from "../FinPetApp";
import {
  confirmActiveDayPlan,
  createFakePorts,
  seedReturningChild,
} from "../testSupport/fakePorts";
import { loadContent } from "../../data/content";
import { confirmTinyPlan, openMoney, openTab, passAdultGate } from "../testSupport/flowHelpers";

const content = loadContent();

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

async function closeDemoDayAndAdvance(
  user: ReturnType<typeof userEvent.setup>,
  ports: ReturnType<typeof createFakePorts>,
) {
  confirmActiveDayPlan(ports);
  const demoId = ports.meta.get(META_KEYS.activeProfileId)!;
  await user.press(screen.getByRole("button", { name: "Настройки" }));
  ports.game.closeDay(demoId, content.catalog, content.bills);
  await user.press(screen.getByRole("button", { name: "Назад" }));
}

describe("Итоги дня + Демо-режим combined loop", () => {
  it(
    "closes a confirmed day, waits on Main, then walks five demo days, reset, and exit",
    async () => {
      const ports = createFakePorts();
      const childId = seedReturningChild(ports, { unlockMoney: true });
      const childDay = ports.game.dayState(childId);
      expect(ports.game.claimTaskReward(childId, childDay.dayId, "budget_what", 10)).toBe(10);
      const { user } = await renderApp(ports);

      await confirmTinyPlan(user);
      await user.press(screen.getByRole("button", { name: "Настройки" }));
      ports.game.closeDay(childId, content.catalog, content.bills);
      await user.press(screen.getByRole("button", { name: "Назад" }));

      expect(screen.getByText("День 2")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Итоги" }));
      expect(screen.getByLabelText("план 21 · потрачено 0")).toBeOnTheScreen();
      expect(screen.getAllByLabelText("план 1 · потрачено 0")).toHaveLength(2);
      expect(screen.queryByText("Каждый день: Сытость -15")).not.toBeOnTheScreen();
      expect(screen.queryByText("Каждый день: Счастье -15")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));

      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
      await openTab(user, "Дом");

      const childAfterClose = ports.game.getProfile(childId);
      const childTasksAfterClose = ports.game.listTaskProgress(childId);
      const childClosed = ports.game.lastClosedDay(childId);
      expect(childAfterClose.balance).toBe(110);
      expect(childClosed?.n).toBe(1);
      expect(ports.game.dayState(childId)).toMatchObject({ open: true, n: 2 });

      await passAdultGate(user);
      await user.press(screen.getByRole("button", { name: "Демо-режим" }));
      expect(screen.getByText("Демо создаёт отдельный тестовый профиль")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Готово" }));

      expect(screen.queryByText("Демо: дни идут подряд")).not.toBeOnTheScreen();
      expect(screen.getByText("День 1")).toBeOnTheScreen();
      expect(screen.queryByText("Охота за ценником")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Планирование бюджета, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое сбережения, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Где живут накопления?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Платежи, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Покупки, открыто" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /, закрыто$/ })).not.toBeOnTheScreen();
      await openTab(user, "Дом");

      await closeDemoDayAndAdvance(user, ports);
      const demoId = ports.meta.get(META_KEYS.activeProfileId)!;
      const closedActuals = ports.game.lastClosedDay(demoId)?.actual;
      expect(closedActuals).toEqual({ mandatory: 0, optional: 0, savings: 0 });
      await openMoney(user, "План");
      expect(screen.getByText("Вчера: 0")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Далее" }));
      expect(screen.getByText("Вчера: 0")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Далее" }));
      expect(screen.getByText("Вчера: 0")).toBeOnTheScreen();
      await openTab(user, "Дом");

      for (let n = 1; n < 5; n += 1) {
        await closeDemoDayAndAdvance(user, ports);
      }

      expect(ports.game.lastClosedDay(demoId)?.n).toBe(5);
      expect(ports.game.dayState(demoId).n).toBe(6);

      await user.press(screen.getByRole("button", { name: "Итоги" }));
      expect(screen.getByText("Игровой день 5")).toBeOnTheScreen();
      expect(screen.getByText("Игровых дней: 5")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));

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
      expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Планирование бюджета, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое сбережения, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Где живут накопления?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Платежи, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Покупки, открыто" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /, закрыто$/ })).not.toBeOnTheScreen();
      await openTab(user, "Дом");

      await openMoney(user, "Журнал");
      expect(screen.getByLabelText("Стартовый бюджет +100")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
      expect(screen.getByText("Старт")).toBeOnTheScreen();
      expect(screen.queryByText("День 2")).not.toBeOnTheScreen();
      expect(screen.queryByText("День 5")).not.toBeOnTheScreen();
      await openTab(user, "Дом");

      await passAdultGate(user);
      await user.press(screen.getByRole("button", { name: "Демо-режим" }));

      expect(screen.queryByText("Новый день откроется завтра")).not.toBeOnTheScreen();
      expect(screen.getByLabelText("Баланс 110")).toBeOnTheScreen();
      expect(screen.getByText("День 2")).toBeOnTheScreen();
      expect(ports.game.getProfile(childId)).toEqual(childAfterClose);
      expect(ports.game.listTaskProgress(childId)).toEqual(childTasksAfterClose);
      expect(ports.game.dayState(childId)).toMatchObject({ open: true, n: 2 });
      expect(ports.game.lastClosedDay(childId)?.n).toBe(1);
    },
    60000,
  );
});
