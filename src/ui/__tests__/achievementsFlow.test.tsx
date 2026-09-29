import { act, render, screen, userEvent } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab } from "../testSupport/flowHelpers";

const content = loadContent();
const iceCream = content.catalog.find((item) => item.id === "ice-cream")!;

/** Retired shop rows. Достижения still count them; Магазин no longer sells them. */
const lunch: CatalogItem = { id: "lunch", kind: "mandatory", price: 12, effect: { meter: "care", delta: 10 } };
const transport: CatalogItem = { id: "transport", kind: "mandatory", price: 8, effect: { meter: "mood", delta: 5 } };
const medicine: CatalogItem = { id: "medicine", kind: "mandatory", price: 15, effect: { meter: "mood", delta: 20 } };
const candy: CatalogItem = { id: "candy", kind: "optional", price: 5, effect: { meter: "mood", delta: 5 } };

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

async function dismissRewards(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 20; step += 1) {
    if (screen.queryByText("Новое достижение") == null) return;
    const yay = screen.queryByRole("button", { name: "Ура!" });
    if (!yay) return;
    await user.press(yay);
  }
}

/** Four Достижения on one Игровой день, so Итоги can fold the list. None of them is a first buy. */
function earnFoldedSet(ports: ReturnType<typeof createFakePorts>, profileId: string) {
  for (let step = 0; step < 5; step += 1) {
    const early = ports.game.dayState(profileId);
    const moved = ports.game.transferToSavings(profileId, early.dayId, 1);
    if (moved.status !== "ok") throw new Error("Копилка не приняла монету");
    ports.game.closeDay(profileId, [lunch]);
    const opened = ports.game.openDay(profileId);
    if (opened.status !== "opened") throw new Error("День не открылся");
  }
  const day = ports.game.dayState(profileId);
  const moved = ports.game.transferToSavings(profileId, day.dayId, 1);
  if (moved.status !== "ok") throw new Error("Копилка не приняла монету");
  for (const item of [lunch, transport, medicine, candy, iceCream]) {
    const bought = ports.game.purchase(profileId, day.dayId, item);
    if (bought.status !== "ok") throw new Error("Покупка не прошла");
  }
  for (const taskId of ["g1", "g2", "g3", "g4"]) {
    ports.game.claimTaskReward(profileId, day.dayId, taskId, 0);
  }
  ports.game.closeDay(profileId, [lunch, candy]);
}

describe("Достижения", () => {
  it("opens the full achievement list from a compact Настройки row", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByRole("button", { name: "Достижения. Получено 0 из 11" })).toBeOnTheScreen();
    expect(screen.getByText("0/11", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: "Достижения" })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Два вкуса. Купи и Конфету, и Мороженое.")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Достижения. Получено 0 из 11" }));
    expect(screen.getByRole("heading", { name: "Достижения" })).toBeOnTheScreen();
    expect(screen.getByText("0/11")).toBeOnTheScreen();
    expect(screen.getByLabelText("Получено 0 из 11")).toBeOnTheScreen();
    expect(screen.getByLabelText("Два вкуса. Купи и Конфету, и Мороженое.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Десять дней с Финни. Закрой 10 Игровых дней.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Миллионер. Перейди на этап Миллионер.")).toBeOnTheScreen();
  });

  it("stays quiet after Обед, then opens one reward when both Желаемые are bought", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Купить Суп" }));
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.queryByText("Новое достижение")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    await user.press(screen.getByRole("button", { name: "Желаемое" }));
    await user.press(screen.getByRole("button", { name: "Купить Мороженое" }));
    await user.press(screen.getByRole("button", { name: "Купить" }));
    expect(screen.queryByText("Новое достижение")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    const profileId = ports.meta.get("activeProfileId");
    if (!profileId) throw new Error("Нет активного профиля");
    await act(async () => {
      ports.game.purchase(profileId, ports.game.dayState(profileId).dayId, candy);
    });
    expect(screen.getByText("Новое достижение")).toBeOnTheScreen();
    expect(screen.getByText("Два вкуса")).toBeOnTheScreen();
    expect(screen.getByText("Конфета и мороженое куплены.")).toBeOnTheScreen();
    expect(screen.queryByText("Есть ещё.")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Ура!" }));
    expect(screen.queryByText("Новое достижение")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Назад" }));
    await openMoney(user, "Журнал");
    expect(screen.getByLabelText("Два вкуса. Получено. Конфета и мороженое куплены. День 1")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: "Достижения. Получено 1 из 11" }));
    expect(screen.getByText("1/11")).toBeOnTheScreen();
    expect(screen.getByLabelText("Получено 1 из 11")).toBeOnTheScreen();
    expect(screen.getByLabelText("Два вкуса. Получено. Конфета и мороженое куплены.")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Копилка по чуть-чуть. Положи монеты в Копилку в шесть разных дней."),
    ).toBeOnTheScreen();
  });

  it("pops the reward on the very first launch, for a profile made after the app opened", async () => {
    const ports = createFakePorts();
    await renderApp(ports);
    expect(screen.queryByText("Новое достижение")).not.toBeOnTheScreen();

    await act(async () => {
      const profileId = seedReturningChild(ports);
      const dayId = ports.game.dayState(profileId).dayId;
      ports.game.purchase(profileId, dayId, candy);
      ports.game.purchase(profileId, dayId, iceCream);
    });

    expect(screen.getByText("Новое достижение")).toBeOnTheScreen();
    expect(screen.getByText("Два вкуса")).toBeOnTheScreen();
  });

  it("shows the day's earned achievements on Итоги дня and the full set on Итоги", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    earnFoldedSet(ports, profileId);
    const { user } = await renderApp(ports);

    expect(screen.getByText("Новое достижение")).toBeOnTheScreen();
    await dismissRewards(user);
    expect(screen.getByText("Итоги дня")).toBeOnTheScreen();
    expect(screen.getByLabelText("Два вкуса. Получено. Конфета и мороженое куплены. День 6")).toBeOnTheScreen();
    expect(screen.getByLabelText("Четыре задания. Получено. Четыре Задания позади. День 6")).toBeOnTheScreen();
    expect(screen.queryByText("Десять дней с Финни")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await openTab(user, "Дом");
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    const showAll = screen.getByRole("button", { name: /^Показать все \(\d+\)$/ });
    expect(showAll).toBeCollapsed();
    expect(screen.queryByText("Четыре задания")).not.toBeOnTheScreen();
    await user.press(showAll);
    expect(screen.getByRole("button", { name: "Свернуть" })).toBeExpanded();
    expect(screen.getByLabelText("Два вкуса. Получено. Конфета и мороженое куплены. День 6")).toBeOnTheScreen();
    expect(screen.getByLabelText("Четыре задания. Получено. Четыре Задания позади. День 6")).toBeOnTheScreen();
    expect(screen.queryByText("Десять дней с Финни")).not.toBeOnTheScreen();
  });
});
