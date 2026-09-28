import { render, screen, userEvent } from "@testing-library/react-native";
import { loadContent } from "../../data/content";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

const content = loadContent();
const item = (id: string) => content.catalog.find((row) => row.id === id)!;

async function renderApp(ports: ReturnType<typeof createFakePorts>) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user };
}

function spokenInsights(): string[] {
  return screen
    .getAllByLabelText(/^(Получилось|Совет): /)
    .map((node) => String(node.props["aria-label"]));
}

/** Plan confirmed; Желаемые bought, today's Счета (Обед + Проезд = 20) left unpaid. */
function closeWantsFirstDay(ports: ReturnType<typeof createFakePorts>) {
  const profileId = seedReturningChild(ports, { unlockMoney: true });
  const day = ports.game.dayState(profileId);
  ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 20, optional: 13, savings: 0 });
  ports.game.confirmPlan(profileId, day.dayId, 20);
  ports.game.purchase(profileId, day.dayId, item("candy"));
  ports.game.purchase(profileId, day.dayId, item("ice-cream"));
  ports.game.closeDay(profileId, content.catalog, content.bills);
}

const WANTS_TIP =
  "Совет: Ты мог потратить 13 монет на обязательное — питомец был бы сыт, — но потратил их на желаемое.";

describe("Разбор дня", () => {
  it("explains on Итоги дня that coins for Обязательное went to Желаемое, praise first", async () => {
    const ports = createFakePorts();
    closeWantsFirstDay(ports);
    await renderApp(ports);

    expect(screen.getByText("Итоги дня")).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Разбор дня" })).toBeOnTheScreen();
    expect(spokenInsights()).toEqual(["Получилось: Ты сдержал обещание: день прошёл по плану.", WANTS_TIP]);
  });

  it("praises a day with Счета paid, a kept План, and coins in Копилка — with no tip", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    const day = ports.game.dayState(profileId);
    ports.game.saveDraftPlan(profileId, day.dayId, { mandatory: 20, optional: 0, savings: 10 });
    ports.game.confirmPlan(profileId, day.dayId, 20);
    ports.game.purchase(profileId, day.dayId, item("lunch"));
    ports.game.purchase(profileId, day.dayId, item("transport"));
    ports.game.transferToSavings(profileId, day.dayId, 10);
    ports.game.closeDay(profileId, content.catalog, content.bills);
    await renderApp(ports);

    expect(spokenInsights()).toEqual([
      "Получилось: Все счета оплачены — питомцу хорошо!",
      "Получилось: Ты сдержал обещание: день прошёл по плану.",
      "Получилось: Ты отложил 10 монет в Копилку. До Цели 80 — если откладывать так же, ещё 8 дней.",
    ]);
    expect(screen.queryByLabelText(/^Совет: /)).not.toBeOnTheScreen();
  });

  it("puts unpaid Счета ahead of a skipped План as the one tip", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    ports.game.closeDay(profileId, content.catalog, content.bills);
    await renderApp(ports);

    expect(spokenInsights().at(-1)).toBe(
      "Совет: Питомцу не хватило обеда: на счета не хватило 20 монет. Завтра начни с обязательного.",
    );
    expect(screen.getByText("Счастье -10: плана на день не было.")).toBeOnTheScreen();
  });
});

describe("Итоги and Итоги дня share one report", () => {
  it("shows the same sections and insights for the closed day, each section once", async () => {
    const ports = createFakePorts();
    closeWantsFirstDay(ports);
    const { user } = await renderApp(ports);

    const daySections = ["Разбор дня", "План и факт", "Питомец"];
    for (const name of daySections) expect(screen.getAllByRole("heading", { name })).toHaveLength(1);
    expect(screen.getByLabelText("День 1 → День 2")).toBeOnTheScreen();
    const onDaySummary = spokenInsights();

    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await user.press(screen.getByRole("button", { name: "Итоги" }));

    expect(screen.getByText("Игровой день 1")).toBeOnTheScreen();
    for (const name of daySections) expect(screen.getAllByRole("heading", { name })).toHaveLength(1);
    expect(spokenInsights()).toEqual(onDaySummary);
    expect(screen.getByLabelText("план 13 · потрачено 13")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость -15")).toBeOnTheScreen();
    expect(screen.queryByText("Каждый день: Сытость -15")).not.toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Всего" })).toBeOnTheScreen();
  });
});
