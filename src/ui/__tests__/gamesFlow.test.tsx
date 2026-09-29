import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

type User = ReturnType<typeof userEvent.setup>;

/** Opens a lesson from the map after marking `done` as completed, and walks its three cards. */
async function openLesson(done: string[], pin: string, cardButton = "Начать игру") {
  const ports = createFakePorts();
  const profileId = seedReturningChild(ports);
  const day = ports.game.dayState(profileId);
  for (const id of done) ports.game.claimTaskReward(profileId, day.dayId, id, 10);
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  await user.press(screen.getByRole("button", { name: "Карта" }));
  await user.press(screen.getByRole("button", { name: `${pin}, открыто` }));
  await user.press(screen.getByRole("button", { name: "Начать" }));
  await user.press(screen.getByRole("button", { name: "Дальше" }));
  await user.press(screen.getByRole("button", { name: "Дальше" }));
  await user.press(screen.getByRole("button", { name: cardButton }));
  return user;
}

async function press(user: User, name: string | RegExp, times = 1) {
  for (let i = 0; i < times; i += 1) await user.press(screen.getByRole("button", { name }));
}

describe("Мини-игры из обновлённого сценария", () => {
  it("Пересобери план: the surprise bucket is locked and each way of fixing the plan explains its cost", async () => {
    const user = await openLesson(["budget_what", "budget_plan"], "Меняем план");
    await press(user, "Начать");

    expect(screen.getByLabelText("Корм для питомца Пух подорожал на 10 монет.")).toBeOnTheScreen();
    expect(screen.getByLabelText(/Теперь по плану нужно 110, а есть 100/)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Больше: Нужное" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Подтвердить" })).toBeDisabled();
    await press(user, "Меньше: Желания", 2);
    await press(user, "Подтвердить");
    expect(screen.getByLabelText(/Ты перенёс необязательную покупку/)).toBeOnTheScreen();
    await press(user, "Готово");

    await press(user, "Меньше: Копилка", 3);
    await press(user, "Подтвердить");
    expect(screen.getByLabelText(/Ты взял монеты из копилки/)).toBeOnTheScreen();
    await press(user, "Готово");

    expect(screen.queryByRole("button", { name: "Больше: Желания" })).not.toBeOnTheScreen();
    await press(user, "Меньше: Нужное", 2);
    await press(user, "Подтвердить");
    expect(screen.getByLabelText(/Ты урезал необходимое/)).toBeOnTheScreen();
    await press(user, "Готово");
    await press(user, "Продолжить");
    // No right/wrong in the game → full reward.
    expect(screen.getByLabelText("+35 монет")).toBeOnTheScreen();
  }, 20000);

  it("Шаг за шагом: contributions fill the bar, a temptation shrinks the round, the goal ends the game", async () => {
    const user = await openLesson(["budget_what", "savings_what"], "Копим маленькими шагами");
    await press(user, "Начать");

    expect(screen.getByLabelText("Воздушный змей. Накоплено: 0 из 50. Осталось: 50")).toBeOnTheScreen();
    await press(user, "Отложить 10");
    expect(screen.getByLabelText("Ты отложил 10 монет. Теперь до цели осталось 40.")).toBeOnTheScreen();
    await press(user, "Отложить 2");
    expect(screen.getByLabelText(/Маленький взнос тоже приближает тебя к цели/)).toBeOnTheScreen();

    expect(screen.getByText(/Пух увидел: машинка за 8 монет/)).toBeOnTheScreen();
    await press(user, "Купить");
    expect(screen.getByRole("button", { name: "Отложить 5" })).toBeDisabled();
    await press(user, "Отложить 2");
    await press(user, "Отложить 10", 2);
    await press(user, "Копить дальше");
    await press(user, "Отложить 10", 2);
    expect(
      screen.getByLabelText(
        "🎉 Цель достигнута! Ты накопил 50 из 50 монет. Каждый небольшой шаг помог тебе приблизиться к цели.",
      ),
    ).toBeOnTheScreen();
    await press(user, "Дальше");
    await press(user, "Продолжить");
    expect(screen.getByLabelText("+35 монет")).toBeOnTheScreen();
  }, 20000);

  it("Финансовая мечта: pick a dream, make the first deposit, and try a daily pace", async () => {
    const user = await openLesson(["savings_what", "savings_steps"], "Где живут накопления?");
    await press(user, "Начать");

    await press(user, "Новый рюкзак, 80 монет");
    expect(screen.getByText("Твоя цель — Новый рюкзак. Стоимость — 80 монет.")).toBeOnTheScreen();
    await press(user, "Добавить 10");
    expect(screen.getByLabelText("Отлично! Ты добавил 10 монет. До цели осталось 40.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Дальше" })).not.toBeOnTheScreen();
    await press(user, "По 5 в день");
    expect(screen.getByLabelText(/цель через 8 дней. За 5 дней не успеть/)).toBeOnTheScreen();
    await press(user, "По 10 в день");
    expect(screen.getByLabelText(/цель через 4 дня. Успеешь за 5 дней!/)).toBeOnTheScreen();
    await press(user, "Дальше");
    await press(user, "Продолжить");
    expect(screen.getByLabelText("+35 монет")).toBeOnTheScreen();
  }, 20000);

  it("Правильный платёж: compares the tag with the till, stops a wrong payment, and picks card or cash", async () => {
    const user = await openLesson(["budget_what", "savings_what"], "Платежи");
    await press(user, "Начать");

    expect(screen.getByLabelText("Сок, 30")).toBeOnTheScreen();
    expect(screen.getByLabelText("К оплате, 30")).toBeOnTheScreen();
    await press(user, "Платить");
    await press(user, "Дальше");
    expect(screen.getByLabelText("Терминал")).toBeOnTheScreen();
    await press(user, "Наличными");
    expect(screen.getByRole("status", { name: "Попробуй ещё" })).toBeOnTheScreen();
    await press(user, "Попробовать ещё");
    await press(user, "Картой");
    expect(screen.getByLabelText(/Было: 50 монет. Потрачено: 30. Осталось: 20./)).toBeOnTheScreen();
    await press(user, "Дальше");

    expect(screen.getByLabelText("К оплате, 54")).toBeOnTheScreen();
    await press(user, "Платить");
    expect(screen.getByText("Стоп! Суммы не совпадают. Сначала проверь платёж.")).toBeOnTheScreen();
    await press(user, "Попробовать ещё");
    await press(user, "Проверить");
    expect(screen.getByRole("status", { name: "Верно" })).toBeOnTheScreen();
  }, 20000);

  it("Скидка или ловушка: each visit is three buy-or-leave rounds and a right answer fills the purse", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.claimTaskReward(profileId, day.dayId, "payments_shop", 35);
    const user = userEvent.setup();
    await render(<FinPetApp ports={ports} />);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Мини-игры" }));
    await user.press(screen.getByRole("button", { name: "Играть: Скидка или ловушка" }));
    await user.press(screen.getByRole("button", { name: "Начать" }));

    expect(screen.getByText("Раунд 1 из 3")).toBeOnTheScreen();
    expect(screen.getByText("Верно: 0")).toBeOnTheScreen();
    expect(screen.getByText("Сэкономлено: 0 монет")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Купить" }));
    if (screen.queryByRole("button", { name: "Попробовать ещё" })) {
      await user.press(screen.getByRole("button", { name: "Попробовать ещё" }));
      await user.press(screen.getByRole("button", { name: "Пройти мимо" }));
    }

    expect(screen.getByText("Пух радуется!")).toBeOnTheScreen();
    expect(screen.getByText("Верно: 1")).toBeOnTheScreen();
    expect(screen.getByText(/Сэкономлено: [1-9]/)).toBeOnTheScreen();
    expect(screen.queryByText("Сэкономлено: 0 монет")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Дальше" }));
    expect(screen.getByText("Раунд 2 из 3")).toBeOnTheScreen();
  });
  it("Нужно или хочется?: opens in Мини-игры after «Что такое бюджет?», plays to the end, pays and keeps the day open", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const day = ports.game.dayState(profileId);
    ports.game.claimTaskReward(profileId, day.dayId, "budget_what", 30);
    const user = userEvent.setup();
    await render(<FinPetApp ports={ports} />);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Мини-игры" }));
    expect(screen.getByRole("button", { name: "Играть: Нужно или хочется?" })).toBeEnabled();
    for (const title of ["План и факт", "Пересобери план", "Интерактивный тест", "Правильный платёж"]) {
      expect(screen.getByRole("button", { name: `Играть: ${title}` })).toBeDisabled();
    }
    await user.press(screen.getByRole("button", { name: "Играть: Нужно или хочется?" }));
    expect(screen.getByText(/Разложи покупки питомца Пух/)).toBeOnTheScreen();
    await press(user, "Начать");

    const sorted: [string, "Нужно" | "Хочется"][] = [
      ["Обед", "Нужно"],
      ["Новая игрушка", "Хочется"],
      ["Лекарство", "Нужно"],
      ["Шампунь для шёрстки", "Нужно"],
      ["Блестящий ошейник", "Хочется"],
      ["Мячик", "Хочется"],
      ["Зубная щётка", "Нужно"],
      ["Шапка с помпоном", "Хочется"],
    ];
    for (const [chip, bin] of sorted) {
      await press(user, chip);
      await press(user, new RegExp(`^Корзина «${bin}»`));
    }
    await press(user, "Подтвердить");
    await press(user, "Обед, 10");
    await press(user, "Шампунь, 6");
    await press(user, "Купить");
    await press(user, "Дальше");
    expect(screen.getByText("Готово!")).toBeOnTheScreen();
    await press(user, "Продолжить");

    expect(screen.getByLabelText("+10 монет")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Итоги дня" })).not.toBeOnTheScreen();
    expect(ports.game.dayState(profileId).open).toBe(true);
  }, 20000);
});
