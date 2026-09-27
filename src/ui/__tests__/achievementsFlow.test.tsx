import { render, screen, userEvent } from "@testing-library/react-native";
import type { CatalogItem } from "../../core/economy";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";
import { openMoney, openTab } from "../testSupport/flowHelpers";

const content = loadContent();
const lunch = content.catalog.find((item) => item.id === "lunch")!;
const candy = content.catalog.find((item) => item.id === "candy")!;

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

function closeScoredDay(ports: ReturnType<typeof createFakePorts>, profileId: string) {
  const day = ports.game.dayState(profileId);
  ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 12, optional: 5, savings: 15 });
  ports.game.confirmPlan(profileId, day.dayId);
  ports.game.purchase(profileId, day.dayId, lunch);
  ports.game.purchase(profileId, day.dayId, candy);
  ports.game.transferToSavings(profileId, day.dayId, 15);
  const tiny: CatalogItem[] = [lunch, candy];
  return ports.game.closeDay(profileId, tiny);
}

describe("Достижения", () => {
  it("opens the full achievement list from a compact Настройки row", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    expect(screen.getByRole("button", { name: "Достижения. Получено 0 из 16" })).toBeOnTheScreen();
    expect(screen.getByText("0/16", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: "Достижения" })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Первая покупка. Купи что-нибудь в Магазине.")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Достижения. Получено 0 из 16" }));
    expect(screen.getByRole("heading", { name: "Достижения" })).toBeOnTheScreen();
    expect(screen.getByText("0/16")).toBeOnTheScreen();
    expect(screen.getByLabelText("Получено 0 из 16")).toBeOnTheScreen();
    expect(screen.getByLabelText("Первая покупка. Купи что-нибудь в Магазине.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Неделя с Финни. Закрой 7 Игровых дней.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Миллионер. Перейди на этап Миллионер.")).toBeOnTheScreen();
  });

  it("opens a reward modal after a shop buy, then shows the earned ones in Журнал and Настройки", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Купить Обед" }));
    await user.press(screen.getByRole("button", { name: "Купить" }));

    expect(screen.getByText("Новое достижение")).toBeOnTheScreen();
    expect(screen.getByText("Первая покупка")).toBeOnTheScreen();
    expect(screen.getByText("Ты купил в Магазине.")).toBeOnTheScreen();
    expect(screen.getByText("Есть ещё.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Ура!" }));
    expect(screen.getByText("Обед готов")).toBeOnTheScreen();
    expect(screen.getByText("Питомец поел.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Ура!" }));
    expect(screen.queryByText("Новое достижение")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));

    await user.press(screen.getByRole("button", { name: "Назад" }));
    await openMoney(user, "Журнал");
    expect(screen.getByLabelText("Первая покупка. Получено. Ты купил в Магазине. День 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Обед готов. Получено. Питомец поел. День 1")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    await user.press(screen.getByRole("button", { name: "Достижения. Получено 2 из 16" }));
    expect(screen.getByText("2/16")).toBeOnTheScreen();
    expect(screen.getByLabelText("Получено 2 из 16")).toBeOnTheScreen();
    expect(screen.getByLabelText("Первая покупка. Получено. Ты купил в Магазине.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Полтинник. Положи в Копилку 50 монет.")).toBeOnTheScreen();
  });

  it("shows the day's earned achievements on Итоги дня and the full set on Итоги", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    closeScoredDay(ports, profileId);
    const { user } = await renderApp(ports);

    expect(screen.getByText("Новое достижение")).toBeOnTheScreen();
    await dismissRewards(user);
    expect(screen.getByText("Итоги дня")).toBeOnTheScreen();
    expect(screen.getByLabelText("День позади. Получено. Игровой день закрыт. День 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Держу слово. Получено. Потратил не больше Плана. День 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счета оплачены. Получено. Счета дня оплачены. День 1")).toBeOnTheScreen();
    expect(screen.queryByText("Неделя с Финни")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await openTab(user, "Дом");
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    const showAll = screen.getByRole("button", { name: /^Показать все \(\d+\)$/ });
    expect(showAll).toBeCollapsed();
    await user.press(showAll);
    expect(screen.getByRole("button", { name: "Свернуть" })).toBeExpanded();
    expect(screen.getByLabelText("Первая покупка. Получено. Ты купил в Магазине. День 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("План есть. Получено. План подтверждён. День 1")).toBeOnTheScreen();
    expect(screen.queryByText("Неделя с Финни")).not.toBeOnTheScreen();
  });
});
