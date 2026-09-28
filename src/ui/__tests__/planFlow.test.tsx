import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

const next = () => screen.getByRole("button", { name: "Далее" });

describe("plan from Main", () => {
  it("walks the three-step План, confirms it, and still changes it before any purchase", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    expect(screen.getAllByText("Копилка").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();
    const planTile = screen.getByRole("button", { name: "План" });
    expect(planTile).not.toBeSelected();
    expect(screen.queryByText("Составь план дня")).not.toBeOnTheScreen();

    await user.press(planTile);
    expect(screen.queryByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).not.toBeOnTheScreen();

    // Step 1 — Обязательные: today's Счета are already in.
    expect(screen.getByLabelText("Шаг 1 из 3: Обязательные")).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Обязательные" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Можно распределить: 100")).toBeOnTheScreen();
    expect(screen.getByText("Сначала то, без чего не обойтись.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обед и проезд: минимум 20")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обязательные 20")).toBeOnTheScreen();
    expect(screen.getByLabelText("Свободно: 80")).toBeOnTheScreen();
    expect(screen.getByRole("slider", { name: "Обязательные" })).toHaveAccessibilityValue({
      min: 20,
      max: 100,
      now: 20,
      text: "Обязательные: 20 монет",
    });
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Назад" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Подтвердить план" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Обязательные, меньше" })).toBeDisabled();
    expect(next()).toBeEnabled();

    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    expect(screen.getByLabelText("Обязательные 22")).toBeOnTheScreen();
    expect(screen.getByLabelText("Свободно: 78")).toBeOnTheScreen();

    // Step 2 — Копилка: Обязательные are the locked part of the track.
    await user.press(next());
    expect(screen.getByLabelText("Шаг 2 из 3: Копилка")).toBeOnTheScreen();
    expect(screen.getByText("Сколько отложить в Копилку.")).toBeOnTheScreen();
    expect(screen.getByText("Без Копилки Скейтборд не станет ближе.")).toBeOnTheScreen();
    expect(screen.getByRole("slider", { name: "Копилка" })).toHaveAccessibilityValue({ min: 0, max: 78, now: 0 });
    await user.press(screen.getByRole("button", { name: "Копилка, больше" }));
    expect(screen.getByLabelText("Копилка 1")).toBeOnTheScreen();
    expect(screen.getByText("Так Скейтборд будет через 90 дней.")).toBeOnTheScreen();

    // Back to step 1 and forward again keeps the amounts.
    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Обязательные 22")).toBeOnTheScreen();
    await user.press(next());
    expect(screen.getByLabelText("Копилка 1")).toBeOnTheScreen();

    // Step 3 — Желаемые, then confirm.
    await user.press(next());
    expect(screen.getByLabelText("Шаг 3 из 3: Желаемые")).toBeOnTheScreen();
    expect(screen.getByText("Что хочется купить.")).toBeOnTheScreen();
    expect(screen.getByText("Пока ни на что из желаемого не хватит.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Далее" })).not.toBeOnTheScreen();
    expect(screen.getByRole("slider", { name: "Желаемые" })).toHaveAccessibilityValue({ max: 77, now: 0 });
    await user.press(screen.getByRole("button", { name: "Желаемые, больше" }));
    expect(screen.getByLabelText("Желаемые 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Останется свободных: 76")).toBeOnTheScreen();

    // A done step's dot goes back too.
    await user.press(screen.getByRole("button", { name: "Вернуться к шагу 2: Копилка" }));
    expect(screen.getByLabelText("Шаг 2 из 3: Копилка")).toBeOnTheScreen();
    await user.press(next());

    await user.press(screen.getByRole("button", { name: "Подтвердить план" }));
    expect(screen.getByText("Подтвердить план дня?")).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        "Это обещание. Монеты останутся в Балансе, пока ты не купишь в Магазине или не положишь в Копилку. Пока не было покупок, план можно изменить.",
      ),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подтвердить план" }));

    // Confirmed: a compact plan / fact summary, no wizard.
    expect(screen.getByText("Пока не было покупок, план можно изменить.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обязательные: план 22 · потрачено 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("Копилка: план 1 · потрачено 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("Желаемые: план 1 · потрачено 0")).toBeOnTheScreen();
    expect(screen.queryByText("Обещание на сегодня. Менять уже нельзя.")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Подтвердить план" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("slider")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Изменить план" }));
    await user.press(next());
    await user.press(next());
    await user.press(screen.getByRole("button", { name: "Желаемые, больше" }));
    expect(screen.getByLabelText("Желаемые 2")).toBeOnTheScreen();
    expect(ports.game.dayState(profileId).plan).toMatchObject({
      status: "confirmed",
      buckets: { mandatory: 22, optional: 2, savings: 1 },
    });
    await user.press(screen.getByRole("button", { name: "Готово" }));
    expect(screen.getByLabelText("Желаемые: план 2 · потрачено 0")).toBeOnTheScreen();

    expect(screen.getByRole("button", { name: "План" })).toBeSelected();
    expect(screen.queryByText("План готов")).not.toBeOnTheScreen();
    expect(screen.queryByText("Составь план дня")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Закончить день" })).not.toBeOnTheScreen();
  });

  it("steps the slider by screen-reader actions and trims later piles to fit Баланс", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 20, optional: 30, savings: 40 });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    const slider = screen.getByRole("slider", { name: "Обязательные" });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(screen.getByLabelText("Обязательные 21")).toBeOnTheScreen();
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(screen.getByLabelText("Обязательные 20")).toBeOnTheScreen();

    // Tap + on Обязательные past what is free: Желаемые give way first, then Копилка.
    for (let i = 0; i < 15; i += 1) await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    expect(screen.getByLabelText("Обязательные 35")).toBeOnTheScreen();
    expect(ports.game.dayState(profileId).plan.buckets).toEqual({ mandatory: 35, optional: 25, savings: 40 });
  });

  it("locks a confirmed План after a purchase and keeps it editable after Положить", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 20, optional: 5, savings: 10 });
    ports.game.confirmPlan(profileId, day.dayId, 20);
    ports.game.transferToSavings(profileId, day.dayId, 10);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByText("Пока не было покупок, план можно изменить.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Копилка: план 10 · потрачено 10")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Изменить план" }));
    await user.press(next());
    await user.press(next());
    await user.press(screen.getByRole("button", { name: "Желаемые, больше" }));
    expect(screen.getByLabelText("Желаемые 6")).toBeOnTheScreen();
    expect(ports.game.dayState(profileId).plan.buckets.optional).toBe(6);

    const lunch = ports.content.catalog.find((item) => item.id === "lunch");
    if (!lunch) throw new Error("Нет обеда в контенте");
    ports.game.purchase(profileId, day.dayId, lunch);
    await user.press(screen.getByRole("button", { name: "Копилка" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByText("Обещание на сегодня. Менять уже нельзя.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обязательные: план 20 · потрачено 12")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Изменить план" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Желаемые, больше" })).not.toBeOnTheScreen();
    expect(screen.queryByText("Пока не было покупок, план можно изменить.")).not.toBeOnTheScreen();
  });

  it("blocks confirm when the План exceeds Баланс until a pile gives way", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 80, optional: 80, savings: 80 });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByText("Разложено на 140 больше, чем есть. Убавь суммы.")).toBeOnTheScreen();
    await user.press(next());
    await user.press(next());
    expect(screen.getByText("Разложено на 140 больше, чем есть. Убавь суммы.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeDisabled();
    expect(screen.queryByText(/Вчера: \d+/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    await user.press(screen.getByRole("button", { name: "Назад" }));
    await user.press(screen.getByRole("button", { name: "Обязательные, меньше" }));
    expect(screen.getByLabelText("Обязательные 79")).toBeOnTheScreen();
    expect(screen.getByLabelText("Свободно: 0")).toBeOnTheScreen();
    await user.press(next());
    await user.press(next());
    expect(screen.getByLabelText("Желаемые 0")).toBeOnTheScreen();
    expect(screen.getByText("Все монеты разложены!")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить план" })).toBeEnabled();
  });

  it("keeps Обязательные at today's Счета: «Далее» waits until they are covered", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 5, optional: 0, savings: 0 });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Деньги" }));
    await user.press(screen.getByRole("button", { name: "План" }));
    expect(screen.getByLabelText("Обязательные 5")).toBeOnTheScreen();
    expect(screen.getByText("Добавь ещё 15 — на счета")).toBeOnTheScreen();
    expect(next()).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Обязательные, больше" }));
    expect(screen.getByLabelText("Обязательные 20")).toBeOnTheScreen();
    expect(screen.queryByText("Добавь ещё 15 — на счета")).not.toBeOnTheScreen();
    expect(next()).toBeEnabled();
  });
});
