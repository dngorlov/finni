import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { billsPhrase } from "../tasks/resolveCurrentTask";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const content = loadContent();
const lunch = content.catalog.find((item) => item.id === "lunch")!;
const candy = content.catalog.find((item) => item.id === "candy")!;
const iceCream = content.catalog.find((item) => item.id === "ice-cream")!;

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

describe("Магазин", () => {
  it("buys a mandatory item, shows the pet receipt, and updates Main", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    expect(screen.getByRole("button", { name: "Необходимое" })).toBeSelected();
    expect(
      screen.getByRole("button", {
        name: "Обед. 12 монет. Сытость +10. Счастье +5",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Проезд. 8 монет. Счастье +5",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Школьные принадлежности. 10 монет. Счастье +5" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).toBeOnTheScreen();
    expect(screen.queryByText(/не купишь|если отложить/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Счёт на сегодня", { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(screen.getAllByText("Необходимое", { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getAllByText("Желаемое", { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText("🍱", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText("Счёт")).not.toBeOnTheScreen();
    expect(screen.queryByText("монет")).not.toBeOnTheScreen();
    expect(screen.queryByText("Обязательные")).not.toBeOnTheScreen();
    expect(screen.queryByText(/после покупки/)).not.toBeOnTheScreen();
    expect(screen.getByText("12")).toHaveStyle({ fontFamily: "PressStart2P_400Regular" });
    // A long name wraps only between words on Android («при / надлежности» was split).
    const longName = screen.getByText("Школьные принадлежности");
    expect(longName).toHaveProp("textBreakStrategy", "simple");
    expect(longName).toHaveProp("android_hyphenationFrequency", "none");
    expect(screen.queryByRole("button", { name: "Отложить Обед" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Купить Обед" }));
    expect(screen.getByText(lunch.description)).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость +10")).toBeOnTheScreen();
    expect(screen.queryByText(/не купишь/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText("после покупки: 88 монет")).toBeOnTheScreen();
    expect(screen.getByLabelText("Купить за 12 монет?")).toBeOnTheScreen();
    expect(screen.queryByText(/Купить Обед за/)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Купить Обед" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Купить" }));

    expect(screen.getByText("Куплено")).toBeOnTheScreen();
    expect(screen.getByText("Обед")).toBeOnTheScreen();
    expect(screen.getByText("Питомец")).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс -12")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость +10")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье +5")).toBeOnTheScreen();
    expect(screen.getByText("+10", { includeHiddenElements: true })).toHaveStyle({
      fontFamily: "PressStart2P_400Regular",
      color: "#FFFFFF",
    });
    expect(screen.getByText("Питомцу нужно есть каждый день")).toBeOnTheScreen();
    expect(screen.getByText("Покупка компенсирует снижение: сытость -15 и счастье -15.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.getByText("Куплено", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 88")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость 60")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Баланс 88")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость 60")).toBeOnTheScreen();
  });

  it("buys an optional item from the Желаемое tab", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: new RegExp(`^${candy.name}`) }));
    expect(screen.getByText(candy.description)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.getByLabelText("Баланс -5")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье +5")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Сытость/)).not.toBeOnTheScreen();
    expect(screen.getByText("Сладкое для счастья")).toBeOnTheScreen();
    expect(screen.getByText("Покупка компенсирует снижение: счастье -15.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Баланс 95")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье 55")).toBeOnTheScreen();
  });

  it("shows Конфета and Мороженое, and no shelf Цели", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    expect(screen.getByRole("button", { name: /^Конфета/ })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Мороженое/ })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Скейтборд/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Сделать целью" })).not.toBeOnTheScreen();
  });

  it("offers a task when Мороженое costs more than the balance", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    while (ports.game.getProfile(profileId).balance >= iceCream.price) {
      ports.game.purchase(profileId, day.dayId, candy);
    }
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: "Купить Мороженое" }));
    expect(screen.queryByRole("button", { name: "Купить" })).not.toBeOnTheScreen();
    expect(screen.getByLabelText(/Не хватает/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Дождаться пособия" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Выполнить задание" }));
    expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
  });
  it("opens the Купить drawer from the row and closes it with Назад", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: /^Обед/ }));
    expect(screen.getByText(lunch.description)).toBeOnTheScreen();
    expect(screen.getByLabelText("Купить за 12 монет?")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Проезд/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.queryByText(lunch.description)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Проезд/ })).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
  });

  it("marks today's unpaid Счета when opened from Текущая задача", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Текущая задача: купить обед и проезд" }));
    expect(screen.getByRole("button", { name: "Необходимое" })).toBeSelected();
    expect(screen.getByRole("button", { name: /^Обед/ })).toBeSelected();
    expect(screen.getByRole("button", { name: /^Проезд/ })).toBeSelected();
    expect(screen.getByRole("button", { name: /^Школьные принадлежности/ })).not.toBeSelected();
  });

  it("names what is left to buy in Текущая задача as Счета get paid", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    ports.game.purchase(profileId, ports.game.dayState(profileId).dayId, lunch);
    await renderApp(ports);

    expect(screen.getByRole("button", { name: "Текущая задача: купить проезд" })).toBeOnTheScreen();
  });
});

describe("billsPhrase", () => {
  it("lowercases catalog names and joins the last one with «и»", () => {
    expect(billsPhrase(["lunch"], content)).toBe("обед");
    expect(billsPhrase(["lunch", "transport"], content)).toBe("обед и проезд");
    expect(billsPhrase(["lunch", "transport", "medicine"], content)).toBe("обед, проезд и лекарство");
    expect(billsPhrase([], content)).toBe("");
  });
});
