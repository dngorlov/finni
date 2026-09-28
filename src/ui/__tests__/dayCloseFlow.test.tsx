import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { confirmTinyPlan, openMoney } from "../testSupport/flowHelpers";
import { META_KEYS } from "../../data/metaKeys";

const content = loadContent();

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Итоги дня", () => {
  it(
    "closes a confirmed day, opens the next one, and keeps the closed day in Итоги",
    async () => {
      const ports = createFakePorts();
      seedReturningChild(ports, { unlockMoney: true });
      const { user } = await renderApp(ports);

      await confirmTinyPlan(user);
      const profileId = ports.meta.get(META_KEYS.activeProfileId)!;
      await user.press(screen.getByRole("button", { name: "Настройки" }));
      ports.game.closeDay(profileId, content.catalog, content.bills);
      await user.press(screen.getByRole("button", { name: "Назад" }));

      expect(screen.getByText("День 2")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Магазин" })).toBeEnabled();
      expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Итоги" }));
      expect(screen.getByLabelText("план 21 · потрачено 0")).toBeOnTheScreen();
      expect(screen.getAllByLabelText("план 1 · потрачено 0")).toHaveLength(2);
      expect(screen.getByText("Каждый день: Сытость -15")).toBeOnTheScreen();
      expect(screen.getByText("Каждый день: Счастье -15")).toBeOnTheScreen();
      expect(screen.queryByText(/плана на день не было/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/доверяет/)).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));

      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Что такое бюджет?, открыто" }));
      await user.press(screen.getByRole("button", { name: "Начать" }));
      await user.press(screen.getByRole("button", { name: "Дальше" }));
      await user.press(screen.getByRole("button", { name: "Дальше" }));
      await user.press(screen.getByRole("button", { name: "Начать игру" }));
      await user.press(screen.getByRole("button", { name: "Начать" }));
      await user.press(screen.getByRole("button", { name: "Обед" }));
      await user.press(screen.getByRole("button", { name: /^Корзина «Нужно»/ }));
      expect(screen.getByRole("status", { name: "Верно!" })).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();

      await openMoney(user, "Журнал");
      expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Дом" }));
      expect(screen.getByText("День 2")).toBeOnTheScreen();
    },
    15000,
  );

  it("keeps Этап and hides the day score after a day that used to score", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 45, optional: 0, savings: 15 });
    ports.game.confirmPlan(profileId, day.dayId);
    for (const item of content.catalog.filter((row) => row.kind === "mandatory")) {
      ports.game.purchase(profileId, day.dayId, item);
    }
    ports.game.transferToSavings(profileId, day.dayId, 15);
    ports.game.closeDay(profileId, content.catalog, content.bills);
    const { user } = await renderApp(ports);
    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await user.press(screen.getByRole("button", { name: "Итоги" }));

    expect(screen.getByLabelText("план 45 · потрачено 45")).toBeOnTheScreen();
    expect(screen.getByLabelText("план 0 · потрачено 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("план 15 · потрачено 15")).toBeOnTheScreen();
    expect(screen.getByText("Каждый день: Сытость -15")).toBeOnTheScreen();
    expect(screen.getByText("Каждый день: Счастье -15")).toBeOnTheScreen();
    expect(screen.getByLabelText("Этап 1 из 3, Новичок. Цель: Скейтборд, 15 из 90")).toBeOnTheScreen();
    expect(screen.getByText("Новичок")).toBeOnTheScreen();
    expect(screen.queryByText(/Про!/)).not.toBeOnTheScreen();
  });

  it("explains the Счастье drop on Итоги дня when an open План was never confirmed", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    ports.game.closeDay(profileId, content.catalog, content.bills);
    const { user } = await renderApp(ports);

    expect(screen.getByText("Итоги дня")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье -25")).toBeOnTheScreen();
    expect(screen.getByText("Счастье -10: плана на день не было.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    expect(screen.getByText("Счастье -10: плана на день не было.")).toBeOnTheScreen();
    expect(screen.getByText("Каждый день: Счастье -15")).toBeOnTheScreen();
  });

  it("uses Следующий день on a demo profile so the next Игровой день can open", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
    const { user } = await renderApp(ports);

    await confirmTinyPlan(user);
    const profileId = ports.meta.get(META_KEYS.activeProfileId)!;
    await user.press(screen.getByRole("button", { name: "Настройки" }));
    ports.game.closeDay(profileId, content.catalog, content.bills);
    await user.press(screen.getByRole("button", { name: "Назад" }));

    expect(screen.queryByLabelText("Пособие +20 монет")).not.toBeOnTheScreen();
    expect(screen.queryByText("Новый день откроется завтра")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Магазин" })).toBeEnabled();
  });
});
