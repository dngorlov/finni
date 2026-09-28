import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab } from "../testSupport/flowHelpers";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Копилка", () => {
  it("deposits toward the active Цель and leaves an empty estimate until the first transfer", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    expect(screen.getByLabelText("В копилке 0")).toBeOnTheScreen();
    expect(screen.getAllByText("Скейтборд")).toHaveLength(2);
    expect(screen.getByLabelText("90 монет")).toBeOnTheScreen();
    expect(screen.getByText(stringsDash())).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Положить" }));
    expect(screen.getByRole("button", { name: "Закрыть окно" })).toHaveStyle({
      backgroundColor: "rgba(34, 26, 18, 0.45)",
    });
    await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
    await user.press(screen.getByRole("button", { name: "Положить" }));

    expect(screen.getByText("Баланс -1")).toBeOnTheScreen();
    expect(screen.getByText("Копилка +1")).toBeOnTheScreen();
    expect(screen.queryByText(/Счастье/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(stringsDash())).not.toBeOnTheScreen();
    expect(screen.getByText(/примерно 89/)).toBeOnTheScreen();
    expect(screen.getByLabelText("В копилке 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 99")).toBeOnTheScreen();

    await openTab(user, "Дом");
    expect(screen.getAllByText("1 / 90")).toHaveLength(2);
    expect(screen.getByLabelText("Баланс 99")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Баланс 1")).not.toBeOnTheScreen();
  });

  it("withdraws through a preview and a second confirm", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.transferToSavings(profileId, day.dayId, 15);
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    await user.press(screen.getByRole("button", { name: "Забрать" }));
    expect(screen.getByRole("button", { name: "Закрыть окно" })).toHaveStyle({
      backgroundColor: "rgba(34, 26, 18, 0.45)",
    });
    await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
    await user.press(screen.getByRole("button", { name: "Забрать" }));
    expect(screen.getByLabelText(/В копилке станет 14 монет\. Мечта отодвинется/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Забрать 1?" }));

    expect(screen.getByText("Баланс +1")).toBeOnTheScreen();
    expect(screen.getByText("Копилка -1")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.getByLabelText("В копилке 14")).toBeOnTheScreen();
  });

  it("celebrates funding without mood and lets Купить из копилки or Позже", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.transferToSavings(profileId, day.dayId, 89);
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    await user.press(screen.getByRole("button", { name: "Положить" }));
    await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
    await user.press(screen.getByRole("button", { name: "Положить" }));

    expect(screen.getAllByText(/Мечта сбылась/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Купить из копилки" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Позже" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Счастье +10")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Выбрать новую цель" })).not.toBeOnTheScreen();

    while (screen.queryAllByRole("button", { name: "Позже" }).length > 0) {
      await user.press(screen.getAllByRole("button", { name: "Позже" })[0]!);
    }
    expect(screen.getAllByText("Скейтборд")).toHaveLength(2);
    expect(screen.getByText("осталось 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("В копилке 90")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Купить из копилки" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Купить из копилки" }));
    expect(screen.getByText("Счастье +93")).toBeOnTheScreen();
    expect(screen.getByText("Копилка -90")).toBeOnTheScreen();
    expect(screen.getByText("Теперь ты Про!")).toBeOnTheScreen();
    expect(screen.queryByText(/Баланс/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    expect(screen.getByRole("button", { name: "Выбрать новую цель" })).toBeOnTheScreen();
    expect(screen.getByLabelText("В копилке 0")).toBeOnTheScreen();
    expect(ports.game.boughtAsActiveGoalCount(profileId)).toBe(1);
    await user.press(screen.getByRole("button", { name: "Выбрать новую цель" }));
    expect(
      screen.getByRole("button", {
        name: "Самокат. 160 монет. Счастье +95. Доехать до парка самому. Купишь — питомец перейдёт на этап «Миллионер»",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Доехать до парка самому", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText("+95 счастье", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.getAllByText("Купишь — питомец перейдёт на этап «Миллионер»", { includeHiddenElements: true }).length,
    ).toBe(3);
    await user.press(screen.getByRole("button", { name: "Сделать целью Самокат" }));
    expect(screen.getAllByText("Самокат")).toHaveLength(2);
    expect(screen.getByLabelText("160 монет")).toBeOnTheScreen();
  });

  it("drops Купить из копилки once the goal is bought, with no goal and an empty pot", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.transferToSavings(profileId, day.dayId, 89);
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    await user.press(screen.getByRole("button", { name: "Положить" }));
    await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
    await user.press(screen.getByRole("button", { name: "Положить" }));

    const buy = screen.getAllByRole("button", { name: "Купить из копилки" });
    expect(buy.length).toBeGreaterThan(1);
    await user.press(buy[buy.length - 1]!);
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    expect(screen.queryByRole("button", { name: "Купить из копилки" })).not.toBeOnTheScreen();
    expect(screen.getByLabelText("В копилке 0")).toBeOnTheScreen();
    expect(screen.getAllByText("Выбери цель").length).toBeGreaterThan(0);
  });
});

function stringsDash() {
  return "—";
}
