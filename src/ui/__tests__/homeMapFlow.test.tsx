import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { DEV_TOOLS, RUNTIME_LIBRARIES } from "../credits";
import { HomeScene, type HomePet } from "../screens/HomeScene";
import { homeStrings } from "../stringsHome";
import { createFakePorts, seedReturningChild } from "../testSupport/fakePorts";

async function renderApp(ports = createFakePorts()) {
  const user = userEvent.setup();
  await render(<FinPetApp ports={ports} />);
  return { user, ports };
}

function flatText(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flatText);
  const children = (node as { children?: unknown }).children;
  if (typeof children === "string") return [children];
  if (!Array.isArray(children)) return [];
  return children.flatMap(flatText);
}

function homeScene(pet: Partial<HomePet> = {}) {
  return (
    <HomeScene
      pet={{
        species: "sp1",
        color: "c1",
        accessory: "a1",
        petName: "Пух",
        care: 50,
        mood: 50,
        ...pet,
      }}
      day={1}
      waiting={false}
      goalName=""
      accumulated={0}
      cost={0}
      onShop={() => {}}
      onResults={() => {}}
      dayTip={false}
      onDayTip={() => {}}
    />
  );
}

describe("Главная scene", () => {
  it("keeps Магазин and Итоги as floating buttons and lets the pet speak without a tap", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    expect(screen.getByText("День 1")).toBeOnTheScreen();
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.getByText("Каждый день сытость -15 и счастье -15. Покупка в Магазине это компенсирует.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Закрыть подсказку", includeHiddenElements: true }));
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.getByText("Каждый день сытость -15 и счастье -15. Покупка в Магазине это компенсирует.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Магазин" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Итоги" })).toBeOnTheScreen();
    expect(screen.getByText(homeStrings.petLinesIdle[0])).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Поговорить с питомцем Пух" }));
    expect(screen.getByText(homeStrings.petLinesIdle[1])).toBeOnTheScreen();
  });

  it("switches the line when the pet gets hungry or sad", async () => {
    const view = await render(homeScene());
    expect(screen.getByText(homeStrings.petLinesIdle[0])).toBeOnTheScreen();

    await view.rerender(homeScene({ care: 10, mood: 80 }));
    expect(screen.getByText(homeStrings.petLinesHungry[0])).toBeOnTheScreen();

    await view.rerender(homeScene({ care: 50, mood: 10 }));
    expect(screen.getByText(homeStrings.petLinesSad[0])).toBeOnTheScreen();

    await view.rerender(homeScene({ care: 80, mood: 80 }));
    expect(screen.getByText(homeStrings.petLinesHappy[0])).toBeOnTheScreen();
  });
});

describe("Дом shortcuts", () => {
  it("hides Выбери цель until Копилка is open", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    ports.game.clearActiveGoal(profileId);
    await renderApp(ports);

    expect(screen.queryByText("Выбери цель")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Этап 1 из 3, Новичок" })).toBeOnTheScreen();
  });

  it("opens Деньги from the balance and Цель from Выбери цель", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports, { unlockMoney: true });
    ports.game.clearActiveGoal(profileId);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Баланс 100" }));
    expect(screen.getByRole("button", { name: "Деньги" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();

    await user.press(screen.getByRole("button", { name: "Дом" }));
    await user.press(screen.getByRole("button", { name: "Магазин" }));
    await user.press(screen.getByRole("button", { name: "Баланс 100" }));
    expect(screen.queryByRole("button", { name: "Магазин" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();

    await user.press(screen.getByRole("button", { name: "Дом" }));
    await user.press(screen.getByRole("button", { name: "Выбери цель" }));
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Своя цель" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Закрыть" }));
    await user.press(screen.getByRole("button", { name: "Дом" }));
    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Выбери цель" }));
    const prompts = screen.getAllByRole("button", { name: "Выбери цель" });
    await user.press(prompts[prompts.length - 1]);
    expect(screen.getByRole("button", { name: "Своя цель" })).toBeOnTheScreen();
  });
});

describe("Карта заданий compact panel", () => {
  it("shows reward and «Начать» in the panel and the rest in «Подробнее»", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Что такое бюджет?, открыто" }));
    expect(screen.getByLabelText("Награда: до 30 монет")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Начать" })).toBeOnTheScreen();
    expect(screen.queryByText(/Район: ЦАО/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Подробнее: Что такое бюджет?" }));
    expect(screen.getByText(/Район: ЦАО/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(/Район: ЦАО/)).not.toBeOnTheScreen();
  });

  it("lists every mini-game from Мини-игры, still locked until its lesson is done", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    expect(screen.queryByRole("button", { name: "Играть: Скидка или ловушка" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Мини-игры" }));
    expect(screen.getByText("Каждая игра относится к уроку и открывается, когда этот урок пройден.")).toBeOnTheScreen();
    expect(screen.getAllByText("Урок: Покупки")).toHaveLength(3);
    for (const title of ["Скидка или ловушка", "Что дешевле?", "Охота за ценником"]) {
      expect(screen.getByRole("button", { name: `Играть: ${title}` })).toBeDisabled();
    }
  });

  it("lists mini-games as chips that stay disabled until their lesson is done", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Покупки, закрыто" }));
    for (const title of ["Скидка или ловушка", "Что дешевле?", "Охота за ценником"]) {
      expect(screen.getByRole("button", { name: `Играть: ${title}` })).toBeDisabled();
    }
  });

  it("opens Словарик with only the words and уроки the child has finished", async () => {
    const ports = createFakePorts();
    const profileId = seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    await user.press(screen.getByRole("button", { name: "Словарик" }));
    expect(screen.getByRole("button", { name: "Слова" })).toBeSelected();
    expect(screen.getByText(homeStrings.handbookEmptyWords)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Что такое бюджет?" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Уроки" }));
    expect(screen.getByRole("button", { name: "Уроки" })).toBeSelected();
    expect(screen.getByText(homeStrings.handbookEmptyLessons)).toBeOnTheScreen();
    for (const title of ["Что такое бюджет?", "Планирование бюджета", "Что такое сбережения"]) {
      expect(screen.queryByRole("button", { name: title })).not.toBeOnTheScreen();
    }

    await user.press(screen.getByRole("button", { name: "Назад" }));
    ports.game.noteTaskCompleted!(profileId, "budget_what");
    await user.press(screen.getByRole("button", { name: "Словарик" }));

    expect(screen.getByRole("button", { name: "Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Из чего складывается бюджет?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Нужно или хочется?" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Готово!" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Планируем деньги" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/Пух может получать монеты/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Из чего складывается бюджет?" }));
    expect(screen.getByText(/Пух может получать монеты/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(/Пух может получать монеты/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Уроки" }));
    expect(screen.getByRole("button", { name: "Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Планирование бюджета" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Что такое сбережения" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/Бюджет — это план твоих денег/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Что такое бюджет?" }));
    expect(screen.getByText(/Бюджет — это план твоих денег/)).toBeOnTheScreen();
    expect(screen.getByText(/Пух может получать монеты/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(/Бюджет — это план твоих денег/)).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Что такое бюджет?" })).toBeOnTheScreen();
  });
});

describe("Об авторах и источниках", () => {
  it("lists every package.json dependency", () => {
    const pkg = require("../../../package.json") as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const listed = new Set([...RUNTIME_LIBRARIES, ...DEV_TOOLS].map((item) => item.pkg));
    for (const name of [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]) {
      expect(listed).toContain(name);
    }
  });

  it("opens authors and sources from Настройки, with Взрослый раздел under the game info", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Настройки" }));
    const labels = flatText(screen.toJSON());
    const adult = labels.indexOf("Взрослый раздел");
    expect(adult).toBeGreaterThanOrEqual(0);
    expect(adult).toBeGreaterThan(labels.lastIndexOf("Финни"));
    expect(labels.indexOf("Внешний вид питомца")).toBeGreaterThan(adult);
    expect(screen.queryByText("Drizzle ORM")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Взрослый раздел" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Об авторах и источниках" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Об авторах и источниках" }));
    expect(screen.getByRole("heading", { name: "Об авторах и источниках" })).toBeOnTheScreen();
    expect(screen.getByText("Drizzle ORM")).toBeOnTheScreen();
    expect(screen.getByText("HSE SPb Team")).toBeOnTheScreen();
    expect(screen.getByText("Андрей Мужевлёв")).toBeOnTheScreen();
    expect(screen.getByText("Сергей Гончаров")).toBeOnTheScreen();
    expect(screen.getByText("Claude (Anthropic)")).toBeOnTheScreen();
    expect(screen.getByText("Press Start 2P")).toBeOnTheScreen();
  });
});
