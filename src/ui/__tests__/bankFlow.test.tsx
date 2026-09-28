import { act, render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney } from "../testSupport/flowHelpers";

const content = loadContent();

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Банк", () => {
  it("appears only after «Где живут накопления?»", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.claimTaskReward(profileId, day.dayId, "savings_where", 15);
    const { user } = await renderApp(ports);
    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expect(screen.getByRole("button", { name: "Банк" })).toBeOnTheScreen();
  });

  it("hides the tile before the lesson", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);
    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expect(screen.queryByRole("button", { name: "Банк" })).not.toBeOnTheScreen();
  });

  it(
    "locks coins in a вклад and returns them with interest when the term ends",
    async () => {
      const ports = createFakePorts();
      const profileId = seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
      const { user } = await renderApp(ports);

      await openMoney(user, "Банк");
      expect(screen.getByLabelText(/Забрать раньше нельзя/)).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "3 дня · +10%" }));
      for (let i = 0; i < 10; i += 1) await user.press(screen.getByRole("button", { name: "Сумма, больше" }));
      expect(screen.getByText("Положишь 20 — через 3 дня вернётся 22.")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Открыть вклад" }));
      expect(screen.getByText("Открыть вклад?")).toBeOnTheScreen();
      expect(screen.getByLabelText(/вернутся с процентами в Игровой день 4/)).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Открыть вклад" }));
      expect(screen.getByText("Баланс -20")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Понятно" }));
      expect(screen.getByLabelText("Баланс 80")).toBeOnTheScreen();
      expect(screen.getByLabelText("20 монет · +10% → 22")).toBeOnTheScreen();
      expect(screen.getByText("Вернётся через 3 дня")).toBeOnTheScreen();

      // Three demo days pass; the вклад comes back on day 4 as the day opens on Main.
      for (let n = 0; n < 3; n += 1) {
        await user.press(screen.getByRole("button", { name: "Дом" }));
        await user.press(screen.getByRole("button", { name: "Магазин" }));
        await act(async () => {
          ports.game.closeDay(profileId, content.catalog, content.bills);
        });
        await user.press(screen.getByRole("button", { name: "Назад" }));
      }
      expect(screen.getByText("Вклад вернулся: +22 (из них 2 — проценты).")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: /Понятно|Дальше/ }));
      await openMoney(user, "Банк");
      expect(screen.getByText("Вернулся")).toBeOnTheScreen();
    },
    30000,
  );

  it("folds a long list of вклады behind «Показать все»", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
    const day = ports.game.dayState(profileId);
    for (const amount of [10, 11, 12, 13]) ports.game.openDeposit(profileId, day.dayId, "short", amount);
    const { user } = await renderApp(ports);

    await openMoney(user, "Банк");
    expect(screen.getByLabelText("В банке 46")).toBeOnTheScreen();
    expect(screen.getAllByText("Вернётся через 3 дня")).toHaveLength(3);
    await user.press(screen.getByRole("button", { name: "Показать все (4)" }));
    expect(screen.getAllByText("Вернётся через 3 дня")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Свернуть" })).toBeExpanded();
  });
});
