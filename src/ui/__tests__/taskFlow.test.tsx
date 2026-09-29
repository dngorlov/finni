import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

type User = ReturnType<typeof userEvent.setup>;

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

/** «Нужно или хочется?» chips and their baskets, in content order. */
const NEED_OR_WANT: [string, "Нужно" | "Хочется"][] = [
  ["Обед", "Нужно"],
  ["Новая игрушка", "Хочется"],
  ["Лекарство", "Нужно"],
  ["Шампунь для шёрстки", "Нужно"],
  ["Блестящий ошейник", "Хочется"],
  ["Мячик", "Хочется"],
  ["Зубная щётка", "Нужно"],
  ["Шапка с помпоном", "Хочется"],
];

const basket = (bin: string) => new RegExp(`^Корзина «${bin}»`);

async function playBudgetWhat(user: User, { mistakes = 0 }: { mistakes?: number } = {}) {
  expect(screen.getByText("Что такое бюджет?")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Начать заново" })).not.toBeOnTheScreen();
  expect(screen.getByLabelText(/Бюджет — это план твоих денег/)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Дальше" }));
  expect(screen.getByLabelText(/Пух может получать монеты за выполнение заданий/)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Дальше" }));
  await user.press(screen.getByRole("button", { name: "Начать игру" }));
  expect(screen.getByText(/У Пух есть несколько покупок/)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Начать" }));
  for (const [index, [chip, bin]] of NEED_OR_WANT.entries()) {
    expect(screen.getByText(`Осталось разложить: ${NEED_OR_WANT.length - index}`)).toBeOnTheScreen();
    if (index < mistakes) {
      await user.press(screen.getByRole("button", { name: chip }));
      await user.press(screen.getByRole("button", { name: basket(bin === "Нужно" ? "Хочется" : "Нужно") }));
      expect(screen.getByRole("status", { name: "Подумай ещё" })).toBeOnTheScreen();
    }
    await user.press(screen.getByRole("button", { name: chip }));
    expect(screen.getByRole("button", { name: chip })).toBeSelected();
    await user.press(screen.getByRole("button", { name: basket(bin) }));
    expect(screen.getByRole("status", { name: "Верно!" })).toBeOnTheScreen();
  }
  expect(screen.getByText("Все покупки разложены!")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Корзина «Нужно», в ней 4" })).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Подтвердить" }));
  expect(screen.getByLabelText("У питомца Пух 20 монет. Что купить в первую очередь?")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Обед и шампунь" })).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Купить" })).toBeDisabled();
  await user.press(screen.getByRole("button", { name: "Обед, 10" }));
  await user.press(screen.getByRole("button", { name: "Шампунь, 6" }));
  await user.press(screen.getByRole("button", { name: "Мячик, 8" }));
  expect(screen.getByText("Выбрано на 24 монеты. У тебя только 20 монет.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Купить" })).toBeDisabled();
  await user.press(screen.getByRole("button", { name: "Мячик, 8" }));
  expect(screen.getByRole("button", { name: "Обед, 10" })).toBeSelected();
  expect(screen.getByRole("button", { name: "Шампунь, 6" })).toBeSelected();
  expect(screen.getByText("Выбрано на 16 монет. Останется 4 монеты.")).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Купить" }));
  await user.press(screen.getByRole("button", { name: "Дальше" }));
  await user.press(screen.getByRole("button", { name: "Продолжить" }));
}

async function press(user: User, name: string, times = 1) {
  for (let i = 0; i < times; i += 1) await user.press(screen.getByRole("button", { name }));
}

const OPENED: [string, string][] = [
  ["savings_what", "Открылось: Копилка. В «Деньгах» можно копить на цель."],
  ["budget_plan", "Открылось: План. В «Деньгах» можно разделить монеты на сегодня."],
  ["savings_where", "Открылось: Банк. В «Деньгах» можно открыть вклад."],
];

describe("открытие Копилки, Плана и Банка", () => {
  it.each(OPENED)("says so on Итоги дня when %s closed the day, and not again in Итоги", async (taskId, spoken) => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    const lesson = ports.content.tasks.find((task) => task.id === taskId);
    if (!lesson) throw new Error(taskId);
    ports.game.claimTaskReward(profileId, day.dayId, lesson.id, 10, {
      task: lesson,
      catalog: ports.content.catalog,
      bills: ports.content.bills,
    });

    const { user } = await renderApp(ports);
    expect(screen.getByRole("heading", { name: spoken })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await user.press(screen.getByRole("button", { name: "Итоги" }));
    expect(screen.queryByRole("heading", { name: /Открылось/ })).not.toBeOnTheScreen();
  });

  it("stays quiet in Демо-режим, where the tools are already open", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
    const day = ports.game.dayState(profileId);
    const lesson = ports.content.tasks.find((task) => task.id === "savings_what");
    if (!lesson) throw new Error("нет урока");
    ports.game.claimTaskReward(profileId, day.dayId, lesson.id, 10, {
      task: lesson,
      catalog: ports.content.catalog,
      bills: ports.content.bills,
    });

    await renderApp(ports);
    expect(screen.getByText("Итоги дня")).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: /Открылось/ })).not.toBeOnTheScreen();
  });
});

describe("Карта заданий", () => {
  it("shows the open Игровой день under the pet", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    await renderApp(ports);
    expect(screen.getByText("День 1")).toBeOnTheScreen();
  });

  it("opens Итоги дня when a day has ended and the next one has not begun", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    const lesson = ports.content.tasks.find((task) => task.id === "budget_what");
    if (!lesson) throw new Error("нет урока");
    ports.game.claimTaskReward(profileId, day.dayId, lesson.id, 10, {
      task: lesson,
      catalog: ports.content.catalog,
      bills: ports.content.bills,
    });

    const { user } = await renderApp(ports);
    expect(screen.getByLabelText("День 1 → День 2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Сытость -15")).toBeOnTheScreen();
    expect(screen.getByLabelText("Счастье -15")).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: /Открылось/ })).not.toBeOnTheScreen();
    expect(screen.queryByText("Каждый день: Сытость -15")).not.toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Разбор дня" })).toBeOnTheScreen();
    expect(screen.queryByText(/плана на день не было/)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Магазин" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    expect(screen.getByText("День 2")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/Пособие/)).not.toBeOnTheScreen();
  });

  it(
    "opens only «Что такое бюджет?», pays by score, then opens the next lessons and pays only a better replay",
    async () => {
      const ports = createFakePorts();
      seedReturningChild(ports);
      const { user } = await renderApp(ports);

      await user.press(screen.getByRole("button", { name: "Карта" }));
      expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое бюджет?, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Планирование бюджета, закрыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое сбережения, закрыто" })).toBeOnTheScreen();
      expect(screen.getAllByRole("button", { name: /, открыто$/ })).toHaveLength(1);
      expect(screen.queryByLabelText("Награда: до 30 монет")).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Что такое сбережения, закрыто" }));
      expect(screen.getByText("Откроется после «Что такое бюджет?»")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Начать" })).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Закрыть окно" }));

      await user.press(screen.getByRole("button", { name: "Что такое бюджет?, открыто" }));
      expect(screen.getByLabelText("Награда: до 30 монет")).toBeOnTheScreen();
      expect(screen.getByLabelText("Сложность: 1 из 3")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Начать" }));
      await playBudgetWhat(user, { mistakes: 2 });

      // 7 of 9 right on the first try → round(30 × 7/9) = 23.
      expect(screen.getByText("Верно с первого раза: 7 из 9")).toBeOnTheScreen();
      expect(screen.getByLabelText("Баланс 123")).toBeOnTheScreen();
      expect(screen.getByLabelText("Было: 100 монет")).toBeOnTheScreen();
      expect(screen.getByLabelText("+23 монеты")).toBeOnTheScreen();
      expect(screen.getByLabelText("Задание: Что такое бюджет? +23")).toBeOnTheScreen();
      expect(screen.getByLabelText("За лучший ответ можно получить ещё 7")).toBeOnTheScreen();
      expect(screen.queryByText("Потому что ты выполнил задание.")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Итоги дня" }));

      expect(screen.getByLabelText("День 1 → День 2")).toBeOnTheScreen();
      expect(screen.getByLabelText("Сытость -15")).toBeOnTheScreen();
      expect(screen.getByLabelText("Счастье -15")).toBeOnTheScreen();
      expect(screen.queryByRole("heading", { name: /Открылось/ })).not.toBeOnTheScreen();
      expect(screen.queryByText("Каждый день: Сытость -15")).not.toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Разбор дня" })).toBeOnTheScreen();
      expect(screen.queryByText(/плана на день не было/)).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Следующий день" }));
      expect(screen.getByText("День 2")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Карта" }));

      expect(screen.getByRole("button", { name: "Что такое бюджет?, пройдено" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Что такое сбережения, открыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Планирование бюджета, закрыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Платежи, закрыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Копим маленькими шагами, закрыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Где живут накопления?, закрыто" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Меняем план, закрыто" })).toBeOnTheScreen();
      expect(screen.getAllByRole("button", { name: /, открыто$/ })).toHaveLength(1);
      expect(screen.queryByRole("button", { name: /, скоро$/ })).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Что такое бюджет?, пройдено" }));
      expect(screen.getByLabelText("Лучший результат: 23 из 30 монет")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Пройти ещё раз" }));
      await playBudgetWhat(user);
      expect(screen.getByText("Верно с первого раза: 9 из 9")).toBeOnTheScreen();
      expect(screen.getByLabelText("+7 монет")).toBeOnTheScreen();
      expect(screen.getByLabelText("Ты собрал все монеты за это задание")).toBeOnTheScreen();
    },
    30000,
  );

  it("retries a wrong quiz answer and scores only the first try", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.claimTaskReward(profileId, day.dayId, "budget_what", 10);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Что такое сбережения, открыто" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Проверить себя" }));

    expect(screen.getByLabelText(/У питомца Пух есть 50 монет/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Потратить все 50 монет" }));
    expect(screen.getByRole("status", { name: "Попробуй ещё" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Попробовать ещё" }));
    await user.press(screen.getByRole("button", { name: "Отложить часть монет" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Накопится 50 монет" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Верно" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "30 монет" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(screen.getByLabelText(/открыта Копилка/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Продолжить" }));

    // 3 of 4 on the first try → round(30 × 3/4) = 23.
    expect(screen.getByText("Верно с первого раза: 3 из 4")).toBeOnTheScreen();
    expect(screen.getByLabelText("+23 монеты")).toBeOnTheScreen();
    expect(
      screen.getByRole("heading", { name: "Открылось: Копилка. В «Деньгах» можно копить на цель." }),
    ).toBeOnTheScreen();
  });

  it("plays План и факт and spawns Почини рюкзак from its safe error", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.claimTaskReward(profileId, day.dayId, "budget_what", 10);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Планирование бюджета, открыто" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "Начать игру" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));

    // Plan: 100 coins, «Подтвердить» only once the sum matches.
    expect(screen.getByText("Распределено 0 из 100")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled();
    await press(user, "Больше: Нужное", 8);
    await press(user, "Больше: Желания", 6);
    await press(user, "Больше: Копилка", 7);
    expect(screen.getByLabelText("У тебя только 100 монет. Измени план, чтобы сумма совпадала.")).toBeOnTheScreen();
    await press(user, "Меньше: Копилка");
    expect(screen.getByText("Сумма совпала!")).toBeOnTheScreen();
    await press(user, "Подтвердить");
    await press(user, "Готово");

    // Fact: every choice spends from a bucket.
    await press(user, "Обычный обед");
    await press(user, "Дальше");
    await press(user, "Купить");
    await press(user, "Дальше");
    await press(user, "Купить наклейки, а рюкзак потом");
    expect(screen.getByText("Новое задание появилось в списке!")).toBeOnTheScreen();
    await press(user, "Дальше");
    await press(user, "Остаться дома");
    await press(user, "Дальше");

    // Plan 40/30/30 vs fact 30/35/35.
    expect(screen.getByLabelText("Нужное: план 40, факт 30")).toBeOnTheScreen();
    expect(screen.getByLabelText("На обязательные расходы ушло на 10 монет меньше, чем ты планировал.")).toBeOnTheScreen();
    expect(screen.getByLabelText("На желания ушло на 5 монет больше, чем ты планировал.")).toBeOnTheScreen();
    expect(screen.getByLabelText("В копилку попало на 5 монет больше, чем ты планировал.")).toBeOnTheScreen();
    await press(user, "Дальше");
    await press(user, "Продолжить");
    expect(
      screen.getByRole("heading", {
        name: "Открылось: План. В «Деньгах» можно разделить монеты на сегодня.",
      }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Итоги дня" }));
    expect(
      screen.getByRole("heading", {
        name: "Открылось: План. В «Деньгах» можно разделить монеты на сегодня.",
      }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Следующий день" }));
    await user.press(screen.getByRole("button", { name: "Карта" }));

    expect(screen.queryByRole("heading", { name: /Открылось/ })).not.toBeOnTheScreen();
    expect(screen.getByText("Исправить ошибку")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Почини рюкзак" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Почини рюкзак" }));
    await user.press(screen.getByRole("button", { name: "Починить рюкзак" }));
    await user.press(screen.getByRole("button", { name: "Дальше" }));
    await user.press(screen.getByRole("button", { name: "На карту" }));

    expect(screen.queryByRole("button", { name: "Почини рюкзак" })).not.toBeOnTheScreen();
    expect(screen.queryByText("Исправить ошибку")).not.toBeOnTheScreen();
  }, 30000);
});
