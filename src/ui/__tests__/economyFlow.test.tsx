import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { confirmTinyPlan, openMoney, openTab, walkTinyPlan } from "../testSupport/flowHelpers";

const content = loadContent();
const candy = content.catalog.find((item) => item.id === "candy")!;
const iceCream = content.catalog.find((item) => item.id === "ice-cream")!;

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("economy loop (Appendix A 5, 7–9)", () => {
  it(
    "plans, buys, blocks a short purchase, saves, and records the Журнал",
    async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await openMoney(user, "План");
    await walkTinyPlan(user);
    await openTab(user, "Дом");

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Купить Обед" }));
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.getByLabelText("Баланс -12")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: "Купить Конфета" }));
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.getByLabelText("Счастье +5")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    await user.press(screen.getByRole("button", { name: "Назад" }));

    const day = ports.game.dayState(profileId);
    while (ports.game.getProfile(profileId).balance >= iceCream.price) {
      ports.game.purchase(profileId, day.dayId, candy);
    }

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: /^Мороженое/ }));
    expect(screen.queryByRole("button", { name: "Купить" })).not.toBeOnTheScreen();
    expect(screen.getByLabelText(/Не хватает/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Дождаться пособия" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Выполнить задание" }));
    expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Дом" }));

    await openMoney(user, "Копилка");
    await user.press(screen.getByRole("button", { name: "Положить" }));
    await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
    await user.press(screen.getByRole("button", { name: "Положить" }));
    expect(screen.getByText("Копилка +1")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    await openMoney(user, "Журнал");
    expect(screen.getByLabelText("Покупка: Обед -12")).toBeOnTheScreen();
    expect(screen.getAllByLabelText("Покупка: Конфета -5").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Перевод в копилку -1")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Пособие +20")).not.toBeOnTheScreen();
    await openTab(user, "Дом");
    expect(screen.getAllByText("1 / 90")).toHaveLength(2);
  },
  15000,
);

  it(
    "shows leftover on Магазин and Копилка after confirm, and still buys a Желаемое past the bucket",
    async () => {
      const ports = createFakePorts();
      seedReturningChild(ports, { unlockMoney: true });
      const { user } = await renderApp(ports);

      await user.press(screen.getByRole("button", { name: "Магазин" }));
      expect(screen.queryByText("В плане осталось 1")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));

      await confirmTinyPlan(user);
      expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Магазин" }));
      // Обязательные start at today's Счета (Обед 12 + Проезд 8) + 1 from confirmTinyPlan.
      expect(screen.getByLabelText("Обязательные: в плане осталось 21")).toBeOnTheScreen();
      expect(screen.getAllByLabelText(/: в плане осталось \d+$/)).toHaveLength(1);

      await user.press(screen.getByRole("button", { name: "Купить Обед" }));
      expect(screen.getByLabelText("в плане останется 9")).toBeOnTheScreen();
      expect(screen.queryByText("Это сверх плана.")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Купить" }));
      await user.press(screen.getByRole("button", { name: "Понятно" }));
      expect(screen.getByLabelText("Обязательные: в плане осталось 9")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Желаемое" }));
      expect(screen.getByLabelText("Желаемые: в плане осталось 1")).toBeOnTheScreen();
      expect(screen.queryByLabelText("Обязательные: в плане осталось 9")).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Купить Конфета" }));
      expect(screen.getByLabelText("в плане останется -4")).toBeOnTheScreen();
      expect(screen.getByText("Это сверх плана.")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Купить" })).toBeEnabled();
      await user.press(screen.getByRole("button", { name: "Купить" }));
      expect(screen.getByLabelText("Баланс -5")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Понятно" }));
      expect(screen.getByLabelText("Желаемые: сверх плана 4")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Назад" }));

      await openMoney(user, "Копилка");
      expect(screen.getByLabelText("Копилка: в плане осталось 1")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Положить" }));
      await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
      expect(screen.getByLabelText("в плане останется 0")).toBeOnTheScreen();
      expect(screen.queryByText("Это сверх плана.")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Положить" }));
      expect(screen.getByText("Копилка +1")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Понятно" }));

      await user.press(screen.getByRole("button", { name: "Забрать" }));
      await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
      await user.press(screen.getByRole("button", { name: "Забрать" }));
      expect(screen.queryByText(/в плане останется/)).not.toBeOnTheScreen();
      expect(screen.queryByText("Это сверх плана.")).not.toBeOnTheScreen();
    },
    15000,
  );
});
