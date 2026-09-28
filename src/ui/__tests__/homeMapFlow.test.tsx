import { render, screen, userEvent } from "@testing-library/react-native";
import { FinPetApp } from "../FinPetApp";
import { DEV_TOOLS, RUNTIME_LIBRARIES } from "../credits";
import { HomeScene, type HomePet } from "../screens/HomeScene";
import { speechPool } from "../screens/petSpeech";
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

/** Speech input for the default scene below. */
function speechOf() {
  return { care: 50, mood: 50, goalName: "", accumulated: 0, cost: 0, canPickGoal: false };
}

function homeScene(pet: Partial<HomePet> = {}, random?: () => number) {
  return (
    <HomeScene
      random={random}
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
  it("keeps Магазин and Итоги under День N and the goal, and lets the pet speak without a tap", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    expect(screen.getByText("День 1")).toBeOnTheScreen();
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.getByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Закрыть подсказку", includeHiddenElements: true }));
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.getByText("Каждый день Сытость и Счастье уменьшаются на 15. Совершая покупки, можно их восполнить!")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Подсказка про день" }));
    expect(screen.queryByText(/Каждый день сытость -15/)).not.toBeOnTheScreen();
    const actions = screen.getByTestId("home-actions");
    const hud = actions.parent;
    let dayRow = screen.getByText("День 1").parent;
    while (dayRow && dayRow.parent !== hud) dayRow = dayRow.parent;
    expect(hud?.children.indexOf(dayRow!)).toBeLessThan(hud?.children.indexOf(actions) ?? -1);
    expect(actions).toHaveStyle({ alignSelf: "flex-end", flexDirection: "row" });
    expect(actions).toContainElement(screen.getByRole("button", { name: "Магазин" }));
    expect(screen.getByRole("button", { name: "Магазин" })).toBeEnabled();
    expect(actions).toContainElement(screen.getByRole("button", { name: "Итоги" }));
    expect(screen.getByText(homeStrings.petLinesIdle[0])).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Поговорить с питомцем Пух" }));
    expect(screen.queryByText(homeStrings.petLinesIdle[0])).not.toBeOnTheScreen();
  });

  it("keeps the whole «День N» label readable: it holds its width on one line", async () => {
    await render(homeScene());
    const label = screen.getByText("День 1");
    // Press Start 2P is one em per glyph: 6 glyphs at 12 sp.
    expect(label).toHaveStyle({ minWidth: 6 * 12 + 2, flexShrink: 0 });
    expect(label).toHaveProp("numberOfLines", 1);
  });

  it("changes the phrase when the speech bubble itself is tapped", async () => {
    const user = userEvent.setup();
    await render(homeScene({}, () => 0));
    const pool = speechPool({ ...speechOf(), hour: new Date().getHours() });

    await user.press(screen.getByRole("button", { name: "Привет!" }));
    expect(screen.queryByText("Привет!")).not.toBeOnTheScreen();
    expect(screen.getByText(pool[1]!)).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: pool[1]! }));
    expect(screen.queryByText(pool[1]!)).not.toBeOnTheScreen();
    expect(screen.getByText(pool[0]!)).toBeOnTheScreen();
  });

  it("has plenty of short, kind lines that react to hunger, mood, the Цель, and the time of day", () => {
    const all = new Set<string>();
    for (const [care, mood] of [
      [10, 80],
      [80, 10],
      [80, 80],
      [50, 50],
    ]) {
      for (const hour of [8, 14, 19, 23]) {
        for (const goal of [
          { goalName: "", accumulated: 0, cost: 0, canPickGoal: true },
          { goalName: "Скейтборд", accumulated: 0, cost: 90 },
          { goalName: "Скейтборд", accumulated: 20, cost: 90 },
          { goalName: "Скейтборд", accumulated: 60, cost: 90 },
          { goalName: "Скейтборд", accumulated: 90, cost: 90 },
        ]) {
          const pool = speechPool({ canPickGoal: false, ...goal, care: care!, mood: mood!, hour });
          expect(new Set(pool).size).toBe(pool.length);
          pool.forEach((line) => all.add(line));
        }
      }
    }
    expect(all.size).toBeGreaterThanOrEqual(25);
    for (const line of all) {
      expect(line.length).toBeLessThanOrEqual(40);
      expect(line).not.toMatch(/плох|стыдно|глуп|зря|опять ты|ленив/i);
    }
    // Hunger, sadness, and joy each open with their own line.
    expect(speechPool({ ...speechOf(), care: 10, hour: 12 })[0]).toBe(homeStrings.petLinesHungry[0]);
    expect(speechPool({ ...speechOf(), mood: 10, hour: 12 })[0]).toBe(homeStrings.petLinesSad[0]);
    expect(speechPool({ ...speechOf(), care: 80, mood: 80, hour: 12 })[0]).toBe(homeStrings.petLinesHappy[0]);
    expect(speechPool({ ...speechOf(), hour: 7 })).toContain(homeStrings.petLineMorning);
    expect(speechPool({ ...speechOf(), hour: 23 })).toContain(homeStrings.petLineNight);
    expect(speechPool({ ...speechOf(), goalName: "Самокат", cost: 160, accumulated: 150, hour: 12 })).toContain(
      homeStrings.petLineGoalHalf,
    );
    expect(speechPool({ ...speechOf(), goalName: "Самокат", cost: 160, accumulated: 20, hour: 12 })).toContain(
      "До цели ещё 140 монет!",
    );
    expect(homeStrings.petLineGoalLeft(3)).toBe("До цели ещё 3 монеты!");
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
    expect(screen.getByRole("button", { name: /^Конструктор\. 60 монет/ })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Своя цель" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Закрыть" }));
    await user.press(screen.getByRole("button", { name: "Дом" }));
    await user.press(screen.getByRole("button", { name: "Этап 1 из 3, Новичок. Выбери цель" }));
    const prompts = screen.getAllByRole("button", { name: "Выбери цель" });
    await user.press(prompts[prompts.length - 1]);
    expect(screen.getByRole("button", { name: /^Конструктор\. 60 монет/ })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Своя цель" })).not.toBeOnTheScreen();
  });

  it("opens Цель from the current goal", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { unlockMoney: true });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Цель: Скейтборд, 0 из 90" }));
    expect(screen.getByRole("button", { name: "Копилка" })).toBeSelected();
    expect(screen.getByRole("button", { name: /^Конструктор\. 60 монет/ })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Своя цель" })).not.toBeOnTheScreen();
  });
});

describe("Карта заданий", () => {
  it("opens a pin in a sheet with the lesson and «Начать»", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports);
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    expect(screen.getByText("Карта заданий")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Начать" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Что такое бюджет?, открыто" }));
    expect(screen.getByLabelText("Награда: до 30 монет")).toBeOnTheScreen();
    expect(screen.getByText(/Район: ЦАО/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Начать" })).toBeOnTheScreen();
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

    expect(screen.getByRole("heading", { name: "Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "бюджет, Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "доходы, Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: "Планирование бюджета" })).not.toBeOnTheScreen();
    expect(screen.queryByText("Из чего складывается бюджет?")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Готово!" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/Пух может получать монеты/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "бюджет, Что такое бюджет?" }));
    expect(screen.getByText(/Бюджет — это план твоих денег/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Понятно" }));
    expect(screen.queryByText(/Бюджет — это план твоих денег/)).not.toBeOnTheScreen();

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

  it("opens every word and every урок in Словарик during Демо-режим", async () => {
    const ports = createFakePorts();
    seedReturningChild(ports, { isDemo: true, name: "Демо", petName: "Демо" });
    const { user } = await renderApp(ports);

    await user.press(screen.getByRole("button", { name: "Карта" }));
    expect(screen.getByRole("button", { name: "Покупки, открыто" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Сейчас или потом?, открыто" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /, закрыто$/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Мини-игры" }));
    expect(
      screen.queryByText("Каждая игра относится к уроку и открывается, когда этот урок пройден."),
    ).not.toBeOnTheScreen();
    for (const title of ["Скидка или ловушка", "Что дешевле?", "Охота за ценником"]) {
      expect(screen.getByRole("button", { name: `Играть: ${title}` })).toBeEnabled();
    }
    await user.press(screen.getByRole("button", { name: "Закрыть окно" }));

    await user.press(screen.getByRole("button", { name: "Покупки, открыто" }));
    for (const title of ["Скидка или ловушка", "Что дешевле?", "Охота за ценником"]) {
      expect(screen.getByRole("button", { name: `Играть: ${title}` })).toBeEnabled();
    }
    await user.press(screen.getByRole("button", { name: "Закрыть окно" }));

    await user.press(screen.getByRole("button", { name: "Словарик" }));
    expect(screen.queryByText(homeStrings.handbookEmptyWords)).not.toBeOnTheScreen();
    for (const title of [
      "Что такое бюджет?",
      "Планирование бюджета",
      "Меняем план",
      "Что такое сбережения",
      "Копим маленькими шагами",
      "Где живут накопления?",
      "Платежи",
      "Покупки",
      "Сейчас или потом?",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "бюджет, Что такое бюджет?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "план, Планирование бюджета" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "платёж, Платежи" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "цена, Покупки" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "покупка, Сейчас или потом?" })).toBeOnTheScreen();
    expect(screen.queryByText("Из чего складывается бюджет?")).not.toBeOnTheScreen();
    expect(screen.queryByText("Как работает платёж")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Готово!" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Уроки" }));
    for (const title of [
      "Что такое бюджет?",
      "Планирование бюджета",
      "Меняем план",
      "Что такое сбережения",
      "Копим маленькими шагами",
      "Где живут накопления?",
      "Платежи",
      "Покупки",
      "Сейчас или потом?",
    ]) {
      expect(screen.getByRole("button", { name: title })).toBeOnTheScreen();
    }
    expect(screen.queryByRole("button", { name: "Скидка или ловушка" })).not.toBeOnTheScreen();
    expect(screen.queryByText(homeStrings.handbookEmptyLessons)).not.toBeOnTheScreen();
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
    expect(screen.getByText("Cursor")).toBeOnTheScreen();
    expect(screen.getByText("Grok 4.7")).toBeOnTheScreen();
    expect(screen.getByText("Press Start 2P")).toBeOnTheScreen();
    expect(
      screen.getByText(/Все аксессуары и цветовые расцветки были сделаны самостоятельно/),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: /craftpix\.net\/freebies\/free-pixel-art-tiny-hero-sprites/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: /craftpix\.net\/file-licenses/ })).toBeOnTheScreen();
  });
});
