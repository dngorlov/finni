import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("plan from Main", () => {
  it("lets a returning child confirm a План, then locks it and marks the hub ready", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expect(screen.getAllByText("Копилка").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();
    const planTile = screen.getByRole("button", { name: "План" });
    expect(planTile).not.toBeSelected();
    expect(screen.queryByText("Составь план дня")).not.toBeOnTheScreen();

    await user.press(planTile);
    expect(screen.queryByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).not.toBeOnTheScreen();
    expect(screen.getByText("Сегодня пришло: +100")).toBeOnTheScreen();
    expect(screen.getByText("Это обещание на сегодня. Монеты пока в Балансе.")).toBeOnTheScreen();
    expect(screen.getByText("Сначала счета и всё нужное.")).toBeOnTheScreen();
    expect(screen.getByText("Положишь их отдельно — в Копилке.")).toBeOnTheScreen();
    expect(screen.getByText("Что хочется купить.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Можно распределить: 100")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счета на сегодня — минимум 20")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обед 12 · Проезд 8 = 20")).toBeOnTheScreen();
    expect(screen.getByLabelText("Осталось разложить 80")).toBeOnTheScreen();
    expect(screen.getByRole("img", { name: /^План на сегодня: Обязательные 20 монет/ })).toBeOnTheScreen();
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Обязательные 20")).toBeOnTheScreen();
    expect(screen.getByLabelText("Желаемые 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("Копилка 0")).toBeOnTheScreen();
    expect(screen.getByText("Если ничего не отложить, Скейтборд не станет ближе.")).toBeOnTheScreen();
    expect(screen.getByText("Пока ни на что из желаемого не хватит.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Обязательные, меньше" })).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    await user.press(screen.getByRole("button", { name: "Желаемые, больше" }));
    await user.press(screen.getByRole("button", { name: "Копилка, больше" }));
    expect(screen.getByLabelText("Обязательные 22")).toBeOnTheScreen();
    expect(screen.getByLabelText("Осталось разложить 76")).toBeOnTheScreen();
    expect(screen.getByText("Скейтборд: накопишь через 90 дней, если откладывать столько каждый день.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Подтвердить план" }));
    expect(screen.getByText("Подтвердить план дня?")).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        "Это обещание. Монеты останутся в Балансе, пока ты не купишь в Магазине или не положишь в Копилку. Потом план не меняется.",
      ),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подтвердить план" }));

    expect(screen.getByLabelText("план 22 · потрачено 0")).toBeOnTheScreen();
    expect(screen.getByText("Обещание на сегодня. Менять уже нельзя.")).toBeOnTheScreen();
    expect(screen.queryByText("Это обещание на сегодня. Монеты пока в Балансе.")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Обязательные, больше" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Подтвердить план" })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Осталось разложить/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();

    expect(screen.getByRole("button", { name: "План" })).toBeSelected();
    expect(screen.queryByText("План готов")).not.toBeOnTheScreen();
    expect(screen.queryByText("Составь план дня")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();
  });

  it("blocks confirm when the План exceeds Баланс and keeps the draft editable", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 80, optional: 80, savings: 80 });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByText("Разложено на 140 больше, чем есть. Убавь суммы.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeDisabled();
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Обязательные, меньше" }));
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeDisabled();
    expect(screen.getByLabelText("Обязательные 79")).toBeOnTheScreen();
  });

  it("keeps Обязательные at today's Счета: a draft below them cannot be confirmed", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 5, optional: 0, savings: 0 });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByLabelText("Обязательные 5")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    expect(screen.getByLabelText("Обязательные 20")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeEnabled();
  });
});
