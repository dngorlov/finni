import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney } from "../testSupport/flowHelpers";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Цель: только три на этапе (ADR-0015)", () => {
  it("offers the three presets with the Этап step, and neither «Своя цель» nor «Без цели»", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    await user.press(screen.getByRole("button", { name: "Цель" }));

    expect(screen.getByRole("button", { name: /^Конструктор\. 60 монет\. Счастье \+92/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Смарт-часы\. 75 монет\. Счастье \+93/ })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Скейтборд. 90 монет. Счастье +94. Кататься во дворе после школы. Купишь — питомец перейдёт на этап «Про». Цель",
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Своя цель" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Без цели" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("textbox", { name: "Название цели" })).not.toBeOnTheScreen();
  });

  it("still shows a Своя цель saved by an older version, with its Порог", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    ports.game.setCustomGoal(profileId, { name: "Наклейки", icon: "🎈", price: 20, presetPrices: [60, 75, 90] });
    const { user } = await renderApp(ports);

    await openMoney(user, "Копилка");
    expect(screen.getAllByText("Наклейки").length).toBeGreaterThan(0);
    expect(screen.getAllByText("До следующего этапа: 0 из 60").length).toBeGreaterThan(0);

    await user.press(screen.getByRole("button", { name: "Цель" }));
    expect(screen.getByRole("button", { name: /^Наклейки\. 20 монет/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Конструктор/ })).toBeOnTheScreen();
  });
});
