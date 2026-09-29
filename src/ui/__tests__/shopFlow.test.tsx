import { StyleSheet } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { strings } from "../strings";
import { currentTaskLabel } from "../tasks/resolveCurrentTask";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const content = loadContent();
const soup = content.catalog.find((item) => item.id === "soup")!;
const tea = content.catalog.find((item) => item.id === "tea")!;
const cinema = content.catalog.find((item) => item.id === "cinema")!;
const iceCream = content.catalog.find((item) => item.id === "ice-cream")!;

function spriteWidths(name: string): unknown[] {
  return screen
    .getAllByTestId(`item-sprite-${name}`, { includeHiddenElements: true })
    .map((node) => StyleSheet.flatten(node.props.style)?.width);
}

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
    expect(screen.getByRole("button", { name: "Суп. 8 монет. Сытость +12" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Вишня. 3 монеты. Сытость +2. Счастье +2" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Чай. 2 монеты. Сытость +2. Счастье +1" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Витамины. 5 монет. Сытость +5. Счастье +2. Витамины подряд 0 дней: счастье +2" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Лекарство/ })).not.toBeOnTheScreen();
    expect(screen.getByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).toBeOnTheScreen();
    expect(screen.queryByText(/не купишь|если отложить/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Счёт на сегодня", { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(screen.getAllByText("Необходимое", { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getAllByText("Желаемое", { includeHiddenElements: true })).toHaveLength(1);
    // The 16 px picture is drawn as pixel squares, big and whole-pixel sharp, not as an emoji.
    expect(screen.getByTestId("item-sprite-soup", { includeHiddenElements: true })).toHaveStyle({ width: 56, height: 56 });
    expect(screen.queryByText(soup.icon, { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(screen.queryByText("Счёт")).not.toBeOnTheScreen();
    expect(screen.queryByText("монет")).not.toBeOnTheScreen();
    expect(screen.queryByText("Обязательные")).not.toBeOnTheScreen();
    expect(screen.queryByText(/после покупки/)).not.toBeOnTheScreen();
    expect(screen.getByText("8")).toHaveStyle({ fontFamily: "PressStart2P_400Regular" });
    // A name wraps only between words on Android.
    const name = screen.getByText("Витамины");
    expect(name).toHaveProp("textBreakStrategy", "simple");
    expect(name).toHaveProp("android_hyphenationFrequency", "none");
    expect(screen.queryByRole("button", { name: "Отложить Суп" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Купить Суп" }));
    expect(screen.getByText(soup.description)).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость +12")).toBeOnTheScreen();
    expect(spriteWidths("soup")).toContain(56);
    expect(screen.queryByText(/не купишь/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText("после покупки: 92 монеты")).toBeOnTheScreen();
    expect(screen.getByLabelText("Купить за 8 монет?")).toBeOnTheScreen();
    expect(screen.queryByText(/Купить Суп за/)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Купить Суп" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Купить" }));

    expect(screen.getByText("Куплено")).toBeOnTheScreen();
    expect(screen.getByText("Суп")).toBeOnTheScreen();
    expect(screen.getByText("Питомец")).toBeOnTheScreen();
    // The receipt tile is 64, so its picture is 50.
    expect(spriteWidths("soup")).toContain(50);
    expect(screen.getByLabelText("Баланс -8")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость +12")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Счастье \+/)).not.toBeOnTheScreen();
    expect(screen.getByText("+12", { includeHiddenElements: true })).toHaveStyle({
      fontFamily: "PressStart2P_400Regular",
      color: "#FFFFFF",
    });
    expect(screen.getByText(soup.description)).toBeOnTheScreen();
    expect(screen.getByText("Покупка компенсирует снижение: сытость -15.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.getByText("Куплено", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 92")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость 62")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Баланс 92")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость 62")).toBeOnTheScreen();
  });

  it("buys an optional item from the Желаемое tab", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: new RegExp(`^${cinema.name}`) }));
    expect(screen.getByText(cinema.description)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.getByLabelText("Баланс -10")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье +15")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Сытость/)).not.toBeOnTheScreen();
    expect(screen.getByText("Мультфильм на большом экране")).toBeOnTheScreen();
    expect(screen.getByText("Покупка компенсирует снижение: счастье -15.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByLabelText("Баланс 90")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье 65")).toBeOnTheScreen();
  });

  it("shows the four Желаемые with their pictures, and no shelf Цели", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    expect(screen.getByRole("button", { name: "Плюшевый мишка. 15 монет. Счастье +22" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Мороженое. 4 монеты. Сытость +1. Счастье +5. Мороженое подряд 0 дней: счастье +5" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Билет в кино. 10 монет. Счастье +15" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Пицца. 15 монет. Сытость +10. Счастье +5" })).toBeOnTheScreen();
    for (const sprite of ["teddy_bear", "ice_cream", "cinema_ticket", "pizza"]) {
      expect(screen.getByTestId(`item-sprite-${sprite}`, { includeHiddenElements: true })).toBeOnTheScreen();
    }
    expect(screen.queryByRole("button", { name: /^Конфета/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Скейтборд/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Сделать целью" })).not.toBeOnTheScreen();
  });

  it("offers a task when Мороженое costs more than the balance", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    while (ports.game.getProfile(profileId).balance >= iceCream.price) {
      ports.game.purchase(profileId, day.dayId, tea);
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
    await user.press(screen.getByRole("button", { name: /^Суп/ }));
    expect(screen.getByText(soup.description)).toBeOnTheScreen();
    expect(screen.getByLabelText("Купить за 8 монет?")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Вишня/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    expect(screen.queryByText(soup.description)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Вишня/ })).toBeOnTheScreen();
    expect(screen.getByLabelText("Баланс 100")).toBeOnTheScreen();
  });

  it("marks every Обязательное while today's Счета are unpaid, when opened from Текущая задача", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Текущая задача: купить обязательное ещё на 20 монет" }));
    expect(screen.getByRole("button", { name: "Необходимое" })).toBeSelected();
    for (const name of ["Суп", "Вишня", "Чай", "Витамины"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toBeSelected();
    }
  });

  it("counts down the Счета minimum in Текущая задача as Обязательные are bought", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    ports.game.purchase(profileId, ports.game.dayState(profileId).dayId, soup);
    await renderApp(ports);

    expect(screen.getByRole("button", { name: "Текущая задача: купить обязательное ещё на 12 монет" })).toBeOnTheScreen();
  });
});

describe("currentTaskLabel for Счета", () => {
  it("names the coins still due, or falls back to the Магазин line", () => {
    expect(currentTaskLabel({ kind: "buy-bills", left: 1 }, content)).toBe("Текущая задача: купить обязательное ещё на 1 монету");
    expect(currentTaskLabel({ kind: "buy-bills", left: 3 }, content)).toBe("Текущая задача: купить обязательное ещё на 3 монеты");
    expect(currentTaskLabel({ kind: "buy-bills", left: 20 }, content)).toBe("Текущая задача: купить обязательное ещё на 20 монет");
    expect(currentTaskLabel({ kind: "buy-bills" }, content)).toBe(strings.currentTaskShop);
  });
});
