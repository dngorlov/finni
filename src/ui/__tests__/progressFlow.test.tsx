import { render, screen, userEvent } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab } from "../testSupport/flowHelpers";

const content = loadContent();
const lunch = content.catalog.find((item) => item.id === "lunch")!;
const candy = content.catalog.find((item) => item.id === "candy")!;
const tinyCatalog: CatalogItem[] = [lunch, candy];

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

function closeScoredDay(ports: ReturnType<typeof createFakePorts>, profileId: string) {
  const day = ports.game.dayState(profileId);
  ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 12, optional: 5, savings: 15 });
  ports.game.confirmPlan(profileId, day.dayId);
  ports.game.purchase(profileId, day.dayId, lunch);
  ports.game.purchase(profileId, day.dayId, candy);
  ports.game.transferToSavings(profileId, day.dayId, 15);
  return ports.game.closeDay(profileId, tinyCatalog);
}

describe("Прогресс", () => {
  it("shows Журнал rows for the grant and a purchase", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.purchase(profileId, day.dayId, lunch);
    const { user } = await renderApp(ports);

    await openMoney(user, "Журнал");
    expect(screen.getByText("День 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Покупка: Обед -12")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
    expect(screen.getByText("Старт")).toBeOnTheScreen();
    expect(screen.getByLabelText("Стартовый бюджет +100")).toBeOnTheScreen();

    await openTab(user, "Дом");
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    expect(screen.getByText("Итоги появятся после первого закрытого игрового дня.")).toBeOnTheScreen();
  });

  it("replaces empty Итоги after closeDay and labels Задание journal rows", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.applyTaskStep(profileId, day.dayId, {
      next: "exit",
      verdict: "good",
      explanation: "чек",
      effects: [{ coins: 8 }],
      spawnTask: "budget_fix_backpack",
    });
    expect(ports.game.claimTaskReward(profileId, day.dayId, "budget_what", 10)).toBe(10);
    expect(ports.game.claimTaskReward(profileId, day.dayId, "budget_fix_backpack", 10)).toBe(10);
    closeScoredDay(ports, profileId);

    const { user } = await renderApp(ports);
    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await openMoney(user, "Журнал");
    expect(screen.getByLabelText("Задание: Что такое бюджет? +10")).toBeOnTheScreen();
    expect(screen.getByLabelText("Задание +8")).toBeOnTheScreen();

    await openTab(user, "Дом");
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    expect(
      screen.queryByText("Итоги появятся после первого закрытого игрового дня."),
    ).not.toBeOnTheScreen();
    expect(screen.getByText("Игровой день 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("план 12 · потрачено 12")).toBeOnTheScreen();
    expect(screen.getByLabelText("план 5 · потрачено 5")).toBeOnTheScreen();
    expect(screen.getByLabelText("план 15 · потрачено 15")).toBeOnTheScreen();
    expect(screen.getByText("Каждый день: Сытость -15")).toBeOnTheScreen();
    expect(screen.getByText("Каждый день: Счастье -15")).toBeOnTheScreen();
    expect(screen.getByLabelText("Этап 1 из 3, Новичок. Цель: Скейтборд, 15 из 90")).toBeOnTheScreen();
    expect(screen.getByText("Новичок")).toBeOnTheScreen();
    expect(screen.getByText("Игровых дней: 1")).toBeOnTheScreen();
    expect(screen.getByText("Задания 1/12")).toBeOnTheScreen();
    expect(screen.getByText("Целей: 0")).toBeOnTheScreen();
  });
});
